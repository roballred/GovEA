'use server'

import { db } from '@/db/client'
<<<<<<< feat/instance-feature-controls-and-account-creation
import { organizations, users, breakGlassSessions, instanceSettings } from '@/db/schema'
=======
import { organizations, users, breakGlassSessions, platformConfig } from '@/db/schema'
>>>>>>> main
import { eq, and, isNull, gt } from 'drizzle-orm'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
<<<<<<< feat/instance-feature-controls-and-account-creation
import { MODULE_DEFS, type ModuleKey } from '@/lib/modules'
import { validatePassword } from '@/lib/password'
import bcrypt from 'bcryptjs'
=======
import { themes } from '@/lib/themes'
>>>>>>> main

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

export async function promoteInstanceAdmin(userId: string, reason?: string) {
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
    after: { instanceRole: 'instance_admin', reason: reason?.trim() || null },
  })

  revalidatePath('/instance/users')
}

export async function demoteInstanceAdmin(userId: string, reason?: string) {
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
    after: { instanceRole: null, reason: reason?.trim() || null },
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

export async function createInstanceUser(formData: FormData) {
  const session = await requireInstanceAdmin()

  const organizationId = formData.get('organizationId') as string
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'
  const grantPlatformAdmin = formData.get('instanceAdmin') === 'on'

  if (!organizationId) throw new Error('Organization is required')

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  if (!organization) throw new Error('Organization not found')

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) throw new Error('A user with that email address already exists.')

  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) throw new Error(pwValidation.message)

  const passwordHash = await bcrypt.hash(password, 12)
  const [user] = await db.insert(users).values({
    organizationId,
    name,
    email,
    passwordHash,
    role,
    instanceRole: grantPlatformAdmin ? 'instance_admin' : null,
    isActive: 'true',
  }).returning()

  await writeAuditLog({
    action: 'instance.user.create',
    entityType: 'user',
    entityId: user.id,
    userId: session.user.id,
    organizationId: null,
    after: {
      name,
      email,
      role,
      organizationId,
      organizationName: organization.name,
      instanceRole: grantPlatformAdmin ? 'instance_admin' : null,
    },
  })

  revalidatePath('/instance/users')
}

/**
 * Controls whether a module is available anywhere on the instance.
 * When unavailable, the module is forced OFF for every organization.
 */
export async function setInstanceModuleAvailability(key: ModuleKey, available: boolean) {
  const session = await requireInstanceAdmin()
  if (!MODULE_DEFS.find(m => m.key === key)) throw new Error('Unknown module')

  const before = await db.query.instanceSettings.findFirst()
  const beforeDisabledModules = before?.disabledModules ?? {}
  const afterDisabledModules = { ...beforeDisabledModules }
  if (available) {
    delete afterDisabledModules[key]
  } else {
    afterDisabledModules[key] = true
  }

  const [row] = before
    ? await db.update(instanceSettings)
        .set({ disabledModules: afterDisabledModules, updatedAt: new Date() })
        .where(eq(instanceSettings.id, before.id))
        .returning()
    : await db.insert(instanceSettings)
        .values({ disabledModules: afterDisabledModules })
        .returning()

  await writeAuditLog({
    action: 'instance.settings.module_availability',
    entityType: 'instance_settings',
    entityId: row.id,
    userId: session.user.id,
    organizationId: null,
    before: { [key]: beforeDisabledModules[key] ? 'disabled' : 'available' },
    after: { [key]: available ? 'available' : 'disabled' },
  })

  revalidatePath('/', 'layout')
  revalidatePath('/instance')
  revalidatePath('/instance/features')
  revalidatePath('/settings')
}
