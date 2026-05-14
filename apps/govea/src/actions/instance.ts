'use server'

import { db } from '@/db/client'
import { organizations, users, breakGlassSessions, instanceSettings, platformConfig, auditLog } from '@/db/schema'
import { eq, and, isNull, gt, like, desc, ne, count } from 'drizzle-orm'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { MODULE_DEFS, type ModuleKey, type ModuleGroup } from '@/lib/modules'
import { validatePassword } from '@/lib/password'
import bcrypt from 'bcryptjs'
import { themes } from '@/lib/themes'
import {
  BREAK_GLASS_APPROVAL_THRESHOLD_MINUTES,
  BREAK_GLASS_DEFAULT_TTL,
  isValidBreakGlassTtl,
} from '@/lib/break-glass'
import { notifyBreakGlassEvent } from '@/lib/notifications/break-glass'

export async function createOrg(formData: FormData): Promise<{ id: string }> {
  const session = await requireInstanceAdmin()

  const name = (formData.get('name') as string ?? '').trim()
  const slug = (formData.get('slug') as string ?? '').trim()

  if (!name) throw new Error('Name is required')
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new Error('Slug must be lowercase letters, numbers, and hyphens only')
  }

  const conflict = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true },
  })
  if (conflict) throw new Error('An organisation with that slug already exists')

  // Apply instance-level defaults so new orgs inherit operator-configured settings
  const defaults = await db.query.platformConfig.findFirst({
    columns: { defaultTheme: true, defaultSupportTier: true },
  })
  const theme = defaults?.defaultTheme ?? 'govea'
  const supportTier = defaults?.defaultSupportTier ?? null

  const orgId = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name, slug, theme, supportTier })
      .returning()

    await writeAuditLog(tx, {
      action: 'instance.org.create',
      entityType: 'organization',
      entityId: org.id,
      userId: session.user.id,
      organizationId: null,
      after: { name, slug, theme, supportTier },
    })

    return org.id
  })

  revalidatePath('/instance/orgs')
  return { id: orgId }
}

export async function grantBreakGlass(
  orgId: string,
  reason: string,
  ttlMinutes: number = BREAK_GLASS_DEFAULT_TTL,
) {
  const session = await requireInstanceAdmin()

  const trimmedReason = reason.trim()
  if (!trimmedReason) throw new Error('Reason is required')
  if (!isValidBreakGlassTtl(ttlMinutes)) {
    throw new Error('Invalid TTL — must be one of 60, 240, 480 minutes')
  }

  const requiresApproval = ttlMinutes > BREAK_GLASS_APPROVAL_THRESHOLD_MINUTES
  const grantedAt = new Date()
  // TTL counts from grantedAt, NOT from approvedAt — pre-staging an
  // approval cannot extend the elevation window beyond what was requested.
  const expiresAt = new Date(grantedAt.getTime() + ttlMinutes * 60_000)

  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx.insert(breakGlassSessions).values({
      instanceAdminId: session.user.id,
      targetOrgId: orgId,
      reason: trimmedReason,
      grantedAt,
      expiresAt,
      requiresApproval,
    }).returning()

    await writeAuditLog(tx, {
      action: 'instance.break_glass.grant',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: null,
      after: {
        reason: trimmedReason,
        ttlMinutes,
        expiresAt,
        sessionId: row.id,
        requiresApproval,
      },
    })

    return row
  })

  await notifyBreakGlassEvent({
    event: 'grant',
    session: inserted,
    actorUserId: session.user.id,
  })

  revalidatePath(`/instance/orgs/${orgId}`)
  revalidatePath('/instance')
}

export async function approveBreakGlass(sessionId: string) {
  const session = await requireInstanceAdmin()

  const approved = await db.transaction(async (tx) => {
    const target = await tx.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, sessionId),
    })
    if (!target) throw new Error('Session not found')
    if (target.instanceAdminId === session.user.id) {
      throw new Error('Cannot approve your own break-glass session')
    }
    if (!target.requiresApproval) {
      throw new Error('Session does not require approval')
    }
    if (target.approvedAt) throw new Error('Session is already approved')
    if (target.revokedAt) throw new Error('Session is revoked')
    if (target.expiresAt <= new Date()) throw new Error('Session has expired')

    const approvedAt = new Date()
    const [row] = await tx.update(breakGlassSessions)
      .set({ approvedAt, approvedBy: session.user.id })
      .where(eq(breakGlassSessions.id, sessionId))
      .returning()

    await writeAuditLog(tx, {
      action: 'instance.break_glass.approve',
      entityType: 'break_glass_session',
      entityId: sessionId,
      userId: session.user.id,
      organizationId: null,
      after: {
        approvedAt,
        granterId: target.instanceAdminId,
        targetOrgId: target.targetOrgId,
      },
    })

    return row
  })

  await notifyBreakGlassEvent({
    event: 'approval',
    session: approved,
    actorUserId: session.user.id,
  })

  revalidatePath(`/instance/orgs/${approved.targetOrgId}`)
  revalidatePath('/instance')
}

export async function revokeBreakGlass(sessionId: string, orgId: string) {
  const session = await requireInstanceAdmin()

  const revoked = await db.transaction(async (tx) => {
    const [row] = await tx.update(breakGlassSessions)
      .set({ revokedAt: new Date(), revokedBy: session.user.id })
      .where(and(
        eq(breakGlassSessions.id, sessionId),
        eq(breakGlassSessions.instanceAdminId, session.user.id),
      ))
      .returning()

    if (row) {
      await writeAuditLog(tx, {
        action: 'instance.break_glass.revoke',
        entityType: 'break_glass_session',
        entityId: sessionId,
        userId: session.user.id,
        organizationId: null,
      })
    }

    return row
  })

  if (revoked) {
    await notifyBreakGlassEvent({
      event: 'revoke',
      session: revoked,
      actorUserId: session.user.id,
    })
  }

  revalidatePath(`/instance/orgs/${orgId}`)
  revalidatePath('/instance')
}

/**
 * Returns pending-approval sessions that the caller can approve — i.e.,
 * sessions that require approval, are not yet approved, not revoked, not
 * expired, and were granted by some OTHER instance admin.
 */
export async function getPendingBreakGlassApprovals() {
  const session = await requireInstanceAdmin()
  const now = new Date()
  return db.query.breakGlassSessions.findMany({
    where: and(
      eq(breakGlassSessions.requiresApproval, true),
      isNull(breakGlassSessions.approvedAt),
      isNull(breakGlassSessions.revokedAt),
      gt(breakGlassSessions.expiresAt, now),
      ne(breakGlassSessions.instanceAdminId, session.user.id),
    ),
    orderBy: (s, { desc }) => [desc(s.grantedAt)],
  })
}

export async function suspendOrg(orgId: string, reason: string) {
  const session = await requireInstanceAdmin()

  const before = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
  if (!before) throw new Error('Organisation not found')
  if (before.isSystemOrg) throw new Error('Cannot suspend the system org')

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ suspendedAt: new Date(), suspendedReason: reason, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.suspend',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: null,
      before: { suspendedAt: before.suspendedAt },
      after: { suspendedAt: new Date(), reason },
    })
  })

  revalidatePath('/instance/orgs')
  revalidatePath(`/instance/orgs/${orgId}`)
}

export async function unsuspendOrg(orgId: string) {
  const session = await requireInstanceAdmin()

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.unsuspend',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: null,
    })
  })

  revalidatePath('/instance/orgs')
  revalidatePath(`/instance/orgs/${orgId}`)
}

export async function promoteInstanceAdmin(userId: string, reason?: string) {
  const session = await requireInstanceAdmin()

  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ instanceRole: 'instance_admin', updatedAt: new Date() })
      .where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.promote',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: null,
      after: { instanceRole: 'instance_admin', reason: reason?.trim() || null },
    })
  })

  revalidatePath('/instance/users')
}

export async function demoteInstanceAdmin(userId: string, reason?: string) {
  const session = await requireInstanceAdmin()
  if (userId === session.user.id) throw new Error('Cannot demote yourself')

  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ instanceRole: null, updatedAt: new Date() })
      .where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.demote',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: null,
      before: { instanceRole: 'instance_admin' },
      after: { instanceRole: null, reason: reason?.trim() || null },
    })
  })

  revalidatePath('/instance/users')
}

export async function suspendUserAccount(userId: string, reason: string) {
  const session = await requireInstanceAdmin()
  if (userId === session.user.id) throw new Error('Cannot suspend yourself')

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, organizationId: true, role: true, isActive: true },
  })
  if (!target) throw new Error('User not found')

  if (target.role === 'admin') {
    const [{ adminCount }] = await db
      .select({ adminCount: count() })
      .from(users)
      .where(and(eq(users.organizationId, target.organizationId), eq(users.role, 'admin'), eq(users.isActive, 'true')))
    if (adminCount <= 1) throw new Error('Cannot suspend the last active admin for this organization')
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: 'false', updatedAt: new Date() }).where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.suspend',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: null,
      after: { isActive: false, targetOrgId: target.organizationId, reason: reason.trim() },
    })
  })

  revalidatePath('/instance/users')
}

export async function reactivateUserAccount(userId: string, reason: string) {
  const session = await requireInstanceAdmin()

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, organizationId: true },
  })
  if (!target) throw new Error('User not found')

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: 'true', updatedAt: new Date() }).where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.reactivate',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: null,
      after: { isActive: true, targetOrgId: target.organizationId, reason: reason.trim() },
    })
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
  defaultSupportTier: string | null
}) {
  const session = await requireInstanceAdmin()

  const trimmed = data.instanceName.trim()
  if (!trimmed) throw new Error('Instance name is required')
  if (!themes.find(t => t.id === data.defaultTheme)) throw new Error('Invalid theme')

  const { SUPPORT_TIERS } = await import('@/lib/support-tiers')
  const defaultSupportTier = data.defaultSupportTier?.trim() || null
  if (defaultSupportTier && !(SUPPORT_TIERS as readonly string[]).includes(defaultSupportTier)) {
    throw new Error('Invalid support tier')
  }

  const before = await db.query.platformConfig.findFirst()

  await db.transaction(async (tx) => {
    await tx.insert(platformConfig)
      .values({
        id: 'singleton',
        instanceName: trimmed,
        defaultTheme: data.defaultTheme,
        allowLocalAuth: data.allowLocalAuth,
        defaultSupportTier,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          instanceName: trimmed,
          defaultTheme: data.defaultTheme,
          allowLocalAuth: data.allowLocalAuth,
          defaultSupportTier,
          updatedAt: new Date(),
          updatedBy: session.user.id,
        },
      })

    await writeAuditLog(tx, {
      action: 'instance.config.update',
      entityType: 'platform_config',
      entityId: 'singleton',
      userId: session.user.id,
      organizationId: null,
      before: before
        ? {
            instanceName: before.instanceName,
            defaultTheme: before.defaultTheme,
            allowLocalAuth: before.allowLocalAuth,
            defaultSupportTier: before.defaultSupportTier,
          }
        : null,
      after: {
        instanceName: trimmed,
        defaultTheme: data.defaultTheme,
        allowLocalAuth: data.allowLocalAuth,
        defaultSupportTier,
      },
    })
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
  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      organizationId,
      name,
      email,
      passwordHash,
      role,
      instanceRole: grantPlatformAdmin ? 'instance_admin' : null,
      isActive: 'true',
    }).returning()

    await writeAuditLog(tx, {
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
  })

  revalidatePath('/instance/users')
}

export async function updateOrgGovernance(
  orgId: string,
  data: { supportTier: string | null; internalNotes: string | null },
) {
  const session = await requireInstanceAdmin()

  const before = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
  if (!before) throw new Error('Organisation not found')

  const supportTier = data.supportTier?.trim() || null
  const internalNotes = data.internalNotes?.trim() || null

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ supportTier, internalNotes, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.governance.update',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: null,
      before: { supportTier: before.supportTier, internalNotes: before.internalNotes },
      after: { supportTier, internalNotes },
    })
  })

  revalidatePath('/instance/orgs')
  revalidatePath(`/instance/orgs/${orgId}`)
}

export async function getOrgGovernanceHistory(orgId: string) {
  await requireInstanceAdmin()

  return db.select().from(auditLog)
    .where(and(eq(auditLog.entityId, orgId), like(auditLog.action, 'instance.org.%')))
    .orderBy(desc(auditLog.createdAt))
    .limit(10)
}

/**
 * Controls whether a module is available anywhere on the instance.
 * When unavailable, the module is forced OFF for every organization.
 */
export async function setInstanceModuleAvailability(key: ModuleKey, available: boolean) {
  const session = await requireInstanceAdmin()
  if (!MODULE_DEFS.find(m => m.key === key)) throw new Error('Unknown module')

  const before = await db.query.instanceSettings.findFirst()
  // When no row exists yet, start from all-disabled (same default as getInstanceDisabledModules).
  const allDisabled = Object.fromEntries(MODULE_DEFS.map(m => [m.key, true]))
  const beforeDisabledModules = before?.disabledModules ?? allDisabled
  const afterDisabledModules = { ...beforeDisabledModules }
  if (available) {
    delete afterDisabledModules[key]
  } else {
    afterDisabledModules[key] = true
  }

  await db.transaction(async (tx) => {
    const [row] = before
      ? await tx.update(instanceSettings)
          .set({ disabledModules: afterDisabledModules, updatedAt: new Date() })
          .where(eq(instanceSettings.id, before.id))
          .returning()
      : await tx.insert(instanceSettings)
          .values({ disabledModules: afterDisabledModules })
          .returning()

    await writeAuditLog(tx, {
      action: 'instance.settings.module_availability',
      entityType: 'instance_settings',
      entityId: row.id,
      userId: session.user.id,
      organizationId: null,
      before: { [key]: beforeDisabledModules[key] ? 'disabled' : 'available' },
      after: { [key]: available ? 'available' : 'disabled' },
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/instance')
  revalidatePath('/instance/features')
  revalidatePath('/settings')
}

export async function setInstanceGroupAvailability(group: ModuleGroup, available: boolean) {
  const session = await requireInstanceAdmin()

  const keys = MODULE_DEFS.filter(m => m.group === group).map(m => m.key)
  if (keys.length === 0) throw new Error('Unknown group')

  const before = await db.query.instanceSettings.findFirst()
  const allDisabled = Object.fromEntries(MODULE_DEFS.map(m => [m.key, true]))
  const beforeDisabledModules = before?.disabledModules ?? allDisabled
  const afterDisabledModules = { ...beforeDisabledModules }
  for (const key of keys) {
    if (available) {
      delete afterDisabledModules[key]
    } else {
      afterDisabledModules[key] = true
    }
  }

  await db.transaction(async (tx) => {
    const [row] = before
      ? await tx.update(instanceSettings)
          .set({ disabledModules: afterDisabledModules, updatedAt: new Date() })
          .where(eq(instanceSettings.id, before.id))
          .returning()
      : await tx.insert(instanceSettings)
          .values({ disabledModules: afterDisabledModules })
          .returning()

    await writeAuditLog(tx, {
      action: 'instance.settings.group_availability',
      entityType: 'instance_settings',
      entityId: row.id,
      userId: session.user.id,
      organizationId: null,
      before: Object.fromEntries(keys.map(k => [k, beforeDisabledModules[k] ? 'disabled' : 'available'])),
      after: Object.fromEntries(keys.map(k => [k, available ? 'available' : 'disabled'])),
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/instance')
  revalidatePath('/instance/features')
  revalidatePath('/settings')
}
