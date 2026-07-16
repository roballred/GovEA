'use server'

// #896 — the instance-operator console is cross-org by definition, so its reads
// and writes run on the privileged (RLS-bypassing) pool rather than relying on
// the app happening to be a superuser. Every action here is gated by
// `requireInstanceAdmin()` (the `instanceRole` check). Aliased to `db`.
// (Full `createOperatorActions` seam adoption is a follow-up, paired with #895.)
import { privilegedDb as db } from '@/db/client'
import { organizations, organizationSettings, users, userOrganizationMemberships, breakGlassSessions, instanceSettings, platformConfig, auditLog } from '@/db/schema'
import { eq, and, or, isNull, gt, like, desc, ne, count } from 'drizzle-orm'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { writeAuditLog } from '@/lib/audit'
import { getRequestContext } from '@/lib/request-context'
import { revalidatePath } from 'next/cache'
import { MODULE_DEFS, type ModuleKey, type ModuleGroup } from '@/lib/modules'
import { findMembership, createOrganization, updateMembershipAdministration } from '@govcore/tenancy'
import { provisionUser } from '@govcore/auth'
import type { Role } from '@/lib/rbac'
import { themes } from '@/lib/themes'
import {
  BREAK_GLASS_APPROVAL_THRESHOLD_MINUTES,
  BREAK_GLASS_DEFAULT_TTL,
  isValidBreakGlassTtl,
} from '@/lib/break-glass'
import { notifyBreakGlassEvent } from '@/lib/notifications/break-glass'

/**
 * Proxy-aware request telemetry (source IP + user agent) for an instance-admin
 * audit entry's `metadata` (#720). Security-relevant platform-administration
 * events need this context for incident review. Never records raw headers —
 * only the derived IP and user-agent string. Returns nulls outside a request
 * scope (e.g. background jobs), so callers can use it unconditionally.
 */
async function auditMeta(extra?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const ctx = await getRequestContext()
  return { ip: ctx.ip, userAgent: ctx.userAgent, ...(extra ?? {}) }
}

export async function createOrg(formData: FormData): Promise<{ id: string }> {
  const session = await requireInstanceAdmin()

  const name = (formData.get('name') as string ?? '').trim()
  const slug = (formData.get('slug') as string ?? '').trim()

  if (!name) throw new Error('Name is required')
  // GovEA keeps its own slug input + validation (#895): core accepts an explicit
  // slug, so we validate then hand the validated value through rather than let
  // core auto-generate one.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new Error('Slug must be lowercase letters, numbers, and hyphens only')
  }

  // Apply instance-level defaults so new orgs inherit operator-configured settings.
  const defaults = await db.query.platformConfig.findFirst({
    columns: { defaultTheme: true, defaultSupportTier: true },
  })
  const theme = defaults?.defaultTheme ?? 'govcore'
  const supportTier = defaults?.defaultSupportTier ?? null
  const metadata = await auditMeta()

  // Core owns the org row + the platform.org.create audit; GovEA owns the
  // organization_settings sidecar (theme/supportTier, app-specific). Run core
  // inside GovEA's transaction (a tx satisfies GovcoreDb; core's own
  // transaction nests as a savepoint) so the org, its audit, and the settings
  // row commit together — no org can exist without its mandatory settings row.
  const result = await db.transaction(async (tx) => {
    const created = await createOrganization(tx, {
      name,
      slug,
      actorUserId: session.user.id,
      auditMetadata: metadata,
    })
    if (!created.ok) return created

    await tx
      .insert(organizationSettings)
      .values({ organizationId: created.organization.id, theme, supportTier })

    return created
  })

  if (!result.ok) {
    // slug validity is already checked above, so slug-taken is the live case;
    // name-required cannot happen (guarded above). Preserve the prior wording.
    throw new Error('An organisation with that slug already exists')
  }

  revalidatePath('/instance/orgs')
  return { id: result.organization.id }
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
      metadata: await auditMeta(),
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
      metadata: await auditMeta(),
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
        metadata: await auditMeta(),
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

  const before = await db.query.organizationSettings.findFirst({
    where: eq(organizationSettings.organizationId, orgId),
  })
  if (!before) throw new Error('Organisation not found')
  if (before.isSystemOrg) throw new Error('Cannot suspend the system org')

  await db.transaction(async (tx) => {
    await tx.update(organizationSettings)
      .set({ suspendedAt: new Date(), suspendedReason: reason, updatedAt: new Date() })
      .where(eq(organizationSettings.organizationId, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.suspend',
      metadata: await auditMeta(),
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
    await tx.update(organizationSettings)
      .set({ suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
      .where(eq(organizationSettings.organizationId, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.unsuspend',
      metadata: await auditMeta(),
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
      metadata: await auditMeta(),
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
      metadata: await auditMeta(),
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

/**
 * #693 slice 4 — instance-console cross-org membership management. The
 * org-scoped equivalents in actions/memberships.ts let an org Admin manage
 * their own org only; these let an Instance Admin change or revoke any
 * membership in any organization. Same audit action vocabulary, same per-org
 * last-admin guard, now shared as `@govcore/tenancy`'s
 * `updateMembershipAdministration` (#895): it operates on the explicit
 * (user, org) membership — not the user's home org — so a cross-org membership
 * edit stays scoped to the row the operator clicked, guards the org's last
 * active admin inside its transaction, and audits `platform.membership.update`
 * carrying the console's IP/user-agent + reason via `auditMetadata`. The wrapper
 * reads the current membership only to supply the field the caller isn't
 * changing (isActive for a role change, role for an activation change), since
 * core takes the full desired state.
 */
export async function setMembershipRoleAsInstanceAdmin(
  userId: string,
  organizationId: string,
  role: Role,
  reason?: string,
) {
  const session = await requireInstanceAdmin()

  const before = await findMembership(db, userId, organizationId)
  if (!before) throw new Error('No membership for that user in that organization.')

  const result = await updateMembershipAdministration(db, {
    userId,
    organizationId,
    role,
    isActive: before.isActive,
    actorUserId: session.user.id,
    adminRole: 'admin',
    auditMetadata: await auditMeta(),
    reason,
  })
  if (!result.ok) {
    throw new Error(
      result.reason === 'not-found'
        ? 'No membership for that user in that organization.'
        : 'Cannot demote the last admin of that organization.',
    )
  }

  revalidatePath('/instance/users')
}

export async function setMembershipActiveAsInstanceAdmin(
  userId: string,
  organizationId: string,
  active: boolean,
  reason?: string,
) {
  const session = await requireInstanceAdmin()

  const before = await findMembership(db, userId, organizationId)
  if (!before) throw new Error('No membership for that user in that organization.')

  const result = await updateMembershipAdministration(db, {
    userId,
    organizationId,
    role: before.role,
    isActive: active,
    actorUserId: session.user.id,
    adminRole: 'admin',
    auditMetadata: await auditMeta(),
    reason,
  })
  if (!result.ok) {
    throw new Error(
      result.reason === 'not-found'
        ? 'No membership for that user in that organization.'
        : 'Cannot remove the last admin of that organization.',
    )
  }

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

  // Platform-only operators have no org; skip the last-admin guard for them.
  if (target.role === 'admin' && target.organizationId) {
    const [{ adminCount }] = await db
      .select({ adminCount: count() })
      .from(users)
      .where(and(eq(users.organizationId, target.organizationId), eq(users.role, 'admin'), eq(users.isActive, true)))
    if (adminCount <= 1) throw new Error('Cannot suspend the last active admin for this organization')
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.suspend',
      metadata: await auditMeta(),
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
    await tx.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, userId))

    await writeAuditLog(tx, {
      action: 'instance.user.reactivate',
      metadata: await auditMeta(),
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
      metadata: await auditMeta(),
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

/**
 * Outcome of {@link createInstanceUser}. The action never throws for the
 * "email already exists" case any more (#756) — an existing identity is
 * attached to the selected org via a membership, and the caller is told what
 * happened so the UI can show a handled message instead of a server crash.
 */
export type CreateInstanceUserResult = {
  status: 'identity_created' | 'membership_added' | 'membership_reactivated' | 'already_member'
  message: string
}

export async function createInstanceUser(formData: FormData): Promise<CreateInstanceUserResult> {
  const session = await requireInstanceAdmin()

  const organizationId = formData.get('organizationId') as string
  const name = formData.get('name') as string
  const email = ((formData.get('email') as string) ?? '').trim()
  const password = formData.get('password') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'
  const grantPlatformAdmin = formData.get('instanceAdmin') === 'on'

  if (!organizationId) throw new Error('Organization is required')

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  if (!organization) throw new Error('Organization not found')

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

  // ── Existing identity → grant org access via membership (#756) ────────────
  // The email already belongs to an identity (e.g. an instance admin). Rather
  // than the old global-duplicate crash, attach that identity to the selected
  // org by creating or reactivating a membership. Password and other identity
  // fields are preserved. The platform-admin checkbox IS honored (#796 — it
  // was previously ignored silently): promotion is applied with the same
  // audit action as the dedicated promoteInstanceAdmin control.
  if (existing) {
    const [membership] = await db
      .select({
        role: userOrganizationMemberships.role,
        isActive: userOrganizationMemberships.isActive,
      })
      .from(userOrganizationMemberships)
      .where(and(
        eq(userOrganizationMemberships.userId, existing.id),
        eq(userOrganizationMemberships.organizationId, organizationId),
      ))
      .limit(1)

    if (membership?.isActive) {
      return {
        status: 'already_member',
        message: `${email} is already an active ${membership.role} in ${organization.name}.`,
      }
    }

    const reactivated = Boolean(membership)
    const promoted = grantPlatformAdmin && existing.instanceRole !== 'instance_admin'
    await db.transaction(async (tx) => {
      if (reactivated) {
        await tx.update(userOrganizationMemberships)
          .set({ role, isActive: true, updatedAt: new Date() })
          .where(and(
            eq(userOrganizationMemberships.userId, existing.id),
            eq(userOrganizationMemberships.organizationId, organizationId),
          ))
      } else {
        await tx.insert(userOrganizationMemberships).values({
          userId: existing.id, organizationId, role, isActive: true,
        })
      }

      await writeAuditLog(tx, {
        action: reactivated ? 'instance.user.membership_reactivate' : 'instance.user.membership_add',
        metadata: await auditMeta(),
        entityType: 'user_organization_membership',
        entityId: existing.id,
        userId: session.user.id,
        organizationId: null,
        before: reactivated ? { role: membership!.role, isActive: membership!.isActive } : undefined,
        after: { email, role, organizationId, organizationName: organization.name },
      })

      // #796 — honor the platform-admin checkbox for existing identities,
      // with the same audit action as the dedicated promote control.
      if (promoted) {
        await tx.update(users)
          .set({ instanceRole: 'instance_admin', updatedAt: new Date() })
          .where(eq(users.id, existing.id))

        await writeAuditLog(tx, {
          action: 'instance.user.promote',
          metadata: await auditMeta(),
          entityType: 'user',
          entityId: existing.id,
          userId: session.user.id,
          organizationId: null,
          after: { instanceRole: 'instance_admin', reason: 'granted via create-account form' },
        })
      }
    })

    const promotedSuffix = promoted ? ' Also granted platform admin access.' : ''
    revalidatePath('/instance/users')
    return reactivated
      ? { status: 'membership_reactivated', message: `Reactivated ${email}’s membership in ${organization.name} as ${role}.${promotedSuffix}` }
      : { status: 'membership_added', message: `Added ${email} to ${organization.name} as ${role}.${promotedSuffix}` }
  }

  // ── New identity → provision via @govcore/auth (#895) ──────────────────────
  // Core validates the password, hashes it (rounds: 12 preserves GovEA's cost
  // factor), inserts the user, writes the canonical primary membership (#796 —
  // sessions/switcher/SSO guard all resolve from it), and audits
  // platform.user.create — never the password — all in one transaction. The
  // console's IP/user-agent ride along via auditMetadata. The existing-identity
  // branch above already handled the duplicate-email case, so email-taken here
  // is only a race; surface it the same handled way rather than a 500.
  const provisioned = await provisionUser(db, {
    email,
    name,
    organizationId,
    role,
    instanceAdmin: grantPlatformAdmin,
    password,
    actorUserId: session.user.id,
    rounds: 12,
    auditMetadata: await auditMeta(),
  })
  if (!provisioned.ok) {
    if (provisioned.reason === 'email-taken') {
      return { status: 'already_member', message: `${email} already exists. Reopen the form to add them to ${organization.name}.` }
    }
    // weak-password / missing-fields → the same thrown error the form showed before.
    throw new Error(provisioned.message ?? 'Could not create the account.')
  }

  revalidatePath('/instance/users')
  return { status: 'identity_created', message: `Created ${email} in ${organization.name} as ${role}.` }
}

export async function updateOrgGovernance(
  orgId: string,
  data: { supportTier: string | null; internalNotes: string | null },
) {
  const session = await requireInstanceAdmin()

  const before = await db.query.organizationSettings.findFirst({
    where: eq(organizationSettings.organizationId, orgId),
  })
  if (!before) throw new Error('Organisation not found')

  const supportTier = data.supportTier?.trim() || null
  const internalNotes = data.internalNotes?.trim() || null

  await db.transaction(async (tx) => {
    await tx.update(organizationSettings)
      .set({ supportTier, internalNotes, updatedAt: new Date() })
      .where(eq(organizationSettings.organizationId, orgId))

    await writeAuditLog(tx, {
      action: 'instance.org.governance.update',
      metadata: await auditMeta(),
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

  // Org-lifecycle events span both vocabularies after the #895 cutover: creation
  // now comes from @govcore/tenancy as `platform.org.create`, while suspend/
  // unsuspend/governance stay app-side as `instance.org.*`. Match both prefixes
  // so the history stays complete (older rows are `instance.org.create`).
  return db.select().from(auditLog)
    .where(and(
      eq(auditLog.entityId, orgId),
      or(like(auditLog.action, 'platform.org.%'), like(auditLog.action, 'instance.org.%')),
    ))
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
      metadata: await auditMeta(),
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
      metadata: await auditMeta(),
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
