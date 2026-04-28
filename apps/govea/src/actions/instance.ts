'use server'

import { db } from '@/db/client'
import { organizations, users, breakGlassSessions, platformConfig } from '@/db/schema'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { themes } from '@/lib/themes'

export async function grantBreakGlass(orgId: string, reason: string) {
  const session = await requireInstanceAdmin()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const [row] = await db.insert(breakGlassSessions).values({
    instanceAdminId: session.user.id,
    targetOrgId: orgId,
    reason,
    expiresAt,
  }).returning()

  await writeAuditLog({
    action: 'instance.break_glass.grant',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: null,
    after: { reason, expiresAt, sessionId: row.id },
  })

  revalidatePath(`/instance/orgs/${orgId}`)
  revalidatePath('/instance')
}

export async function revokeBreakGlass(sessionId: string, orgId: string) {
  const session = await requireInstanceAdmin()

  await db.update(breakGlassSessions)
    .set({ revokedAt: new Date(), revokedBy: session.user.id })
    .where(and(
      eq(breakGlassSessions.id, sessionId),
      eq(breakGlassSessions.instanceAdminId, session.user.id),
    ))

  await writeAuditLog({
    action: 'instance.break_glass.revoke',
    entityType: 'break_glass_session',
    entityId: sessionId,
    userId: session.user.id,
    organizationId: null,
  })

  revalidatePath(`/instance/orgs/${orgId}`)
  revalidatePath('/instance')
}

export async function suspendOrg(orgId: string, reason: string) {
  const session = await requireInstanceAdmin()

  const before = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
  if (!before) throw new Error('Organisation not found')
  if (before.isSystemOrg) throw new Error('Cannot suspend the system org')

  await db.update(organizations)
    .set({ suspendedAt: new Date(), suspendedReason: reason, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  await writeAuditLog({
    action: 'instance.org.suspend',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: null,
    before: { suspendedAt: before.suspendedAt },
    after: { suspendedAt: new Date(), reason },
  })

  revalidatePath('/instance/orgs')
  revalidatePath(`/instance/orgs/${orgId}`)
}

export async function unsuspendOrg(orgId: string) {
  const session = await requireInstanceAdmin()

  await db.update(organizations)
    .set({ suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  await writeAuditLog({
    action: 'instance.org.unsuspend',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: null,
  })

  revalidatePath('/instance/orgs')
  revalidatePath(`/instance/orgs/${orgId}`)
}

export async function promoteInstanceAdmin(userId: string) {
  const session = await requireInstanceAdmin()

  await db.update(users)
    .set({ instanceRole: 'instance_admin', updatedAt: new Date() })
    .where(eq(users.id, userId))

  await writeAuditLog({
    action: 'instance.user.promote',
    entityType: 'user',
    entityId: userId,
    userId: session.user.id,
    organizationId: null,
    after: { instanceRole: 'instance_admin' },
  })

  revalidatePath('/instance/users')
}

export async function demoteInstanceAdmin(userId: string) {
  const session = await requireInstanceAdmin()
  if (userId === session.user.id) throw new Error('Cannot demote yourself')

  await db.update(users)
    .set({ instanceRole: null, updatedAt: new Date() })
    .where(eq(users.id, userId))

  await writeAuditLog({
    action: 'instance.user.demote',
    entityType: 'user',
    entityId: userId,
    userId: session.user.id,
    organizationId: null,
    before: { instanceRole: 'instance_admin' },
    after: { instanceRole: null },
  })

  revalidatePath('/instance/users')
}

export async function getPlatformConfig() {
  await requireInstanceAdmin()
  return db.query.platformConfig.findFirst() ?? null
}

export async function updatePlatformConfig(data: {
  instanceName: string
  defaultTheme: string
  allowLocalAuth: boolean
}) {
  const session = await requireInstanceAdmin()

  const trimmed = data.instanceName.trim()
  if (!trimmed) throw new Error('Instance name is required')
  if (!themes.find(t => t.id === data.defaultTheme)) throw new Error('Invalid theme')

  const before = await db.query.platformConfig.findFirst()

  await db.insert(platformConfig)
    .values({
      id: 'singleton',
      instanceName: trimmed,
      defaultTheme: data.defaultTheme,
      allowLocalAuth: data.allowLocalAuth,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: platformConfig.id,
      set: {
        instanceName: trimmed,
        defaultTheme: data.defaultTheme,
        allowLocalAuth: data.allowLocalAuth,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
    })

  await writeAuditLog({
    action: 'instance.config.update',
    entityType: 'platform_config',
    entityId: 'singleton',
    userId: session.user.id,
    organizationId: null,
    before: before
      ? { instanceName: before.instanceName, defaultTheme: before.defaultTheme, allowLocalAuth: before.allowLocalAuth }
      : null,
    after: { instanceName: trimmed, defaultTheme: data.defaultTheme, allowLocalAuth: data.allowLocalAuth },
  })

  revalidatePath('/instance/config')
  revalidatePath('/instance')
}

export async function getActiveBreakGlass(adminId: string, orgId: string) {
  const now = new Date()
  return db.query.breakGlassSessions.findFirst({
    where: and(
      eq(breakGlassSessions.instanceAdminId, adminId),
      eq(breakGlassSessions.targetOrgId, orgId),
      isNull(breakGlassSessions.revokedAt),
      gt(breakGlassSessions.expiresAt, now),
    ),
  })
}
