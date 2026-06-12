'use server'

import { db } from '@/db/client'
import { users, userOrganizationMemberships } from '@/db/schema'
import { eq, and, count, ne, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { validatePassword } from '@/lib/password'
import { getOrgSecuritySettings } from '@/lib/security-policy'
import { upsertMembership, setMembershipActiveFlag } from '@/lib/membership-sync'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

/**
 * #796/#799 — true when the target belongs to the actor's org via the legacy
 * home-org column or any membership row. Org-side actions are silent no-ops
 * for unrelated users (pinned by cross-org.test.ts); without this gate the
 * membership upsert below would mint org access for a foreign user.
 */
async function belongsToOrg(
  target: { organizationId: string | null },
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (target.organizationId === orgId) return true
  const [m] = await db
    .select({ id: userOrganizationMemberships.id })
    .from(userOrganizationMemberships)
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, orgId),
    ))
    .limit(1)
  return Boolean(m)
}

/**
 * #799 — does this user have org access beyond `orgId`? An org admin's
 * authority ends at their org boundary: remove/deactivate may only touch the
 * global identity when this org is the user's sole access anchor. Anchors:
 * an active membership elsewhere, a platform role, or a legacy home-org
 * pointer at another org (pre-#693 accounts).
 */
async function hasAnchorsBeyondOrg(
  target: { organizationId: string | null; instanceRole: string | null },
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (target.instanceRole === 'instance_admin') return true
  if (target.organizationId && target.organizationId !== orgId) return true
  const [other] = await db.select({ c: count() }).from(userOrganizationMemberships).where(and(
    eq(userOrganizationMemberships.userId, userId),
    ne(userOrganizationMemberships.organizationId, orgId),
    eq(userOrganizationMemberships.isActive, true),
  ))
  return (other?.c ?? 0) > 0
}

export async function getUsers() {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  // #796 — memberships are the canonical org-access store. List everyone
  // with an active membership in this org (covers users added cross-org via
  // the instance console, #756), unioned with legacy rows whose home-org
  // column points here but that predate the #693 backfill. The membership
  // role wins when both exist — it is what the session actually resolves.
  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: userOrganizationMemberships.role,
      isActive: users.isActive,
    })
    .from(userOrganizationMemberships)
    .innerJoin(users, eq(users.id, userOrganizationMemberships.userId))
    .where(and(
      eq(userOrganizationMemberships.organizationId, orgId),
      eq(userOrganizationMemberships.isActive, true),
    ))

  const legacyRows = await db.query.users.findMany({
    where: eq(users.organizationId, orgId),
    columns: { id: true, name: true, email: true, role: true, isActive: true },
  })

  const byId = new Map<string, (typeof legacyRows)[number]>(legacyRows.map(u => [u.id, u]))
  for (const m of memberRows) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

export async function createUser(formData: FormData) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'

  const policy = await getOrgSecuritySettings(orgId)
  const pwValidation = validatePassword(password, policy)
  if (!pwValidation.valid) throw new Error(pwValidation.message)

  // Guard against duplicate email across orgs (users.email is globally unique, #269)
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) throw new Error('A user with that email address already exists.')

  const passwordHash = await bcrypt.hash(password, 12)
  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name, email, passwordHash, role,
      organizationId: orgId,
      isActive: 'true',
    }).returning()

    // #796 — the membership row is what sessions, the org switcher, and the
    // SSO guard actually resolve; create it with the identity.
    await upsertMembership(tx, {
      userId: user.id, organizationId: orgId, role, isPrimary: true,
    })

    await writeAuditLog(tx, {
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, email, role },
    })
  })
}

export async function updateUserRole(userId: string, role: 'admin' | 'contributor' | 'viewer') {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!before || !(await belongsToOrg(before, userId, orgId))) return

  // #796 — last-admin guard (was only on editUser; a demotion through this
  // path could previously strand the org without an active admin).
  if (before?.role === 'admin' && role !== 'admin') {
    const [adminCount] = await db.select({ count: count() }).from(users).where(
      and(eq(users.organizationId, orgId), eq(users.role, 'admin'), eq(users.isActive, 'true'))
    )
    if (adminCount.count <= 1) throw new Error('Cannot demote the last admin')
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ role, updatedAt: new Date() }).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    // #796 — sessions resolve role from the membership row; without this the
    // role change never takes effect. Upsert also heals pre-#693 accounts.
    await upsertMembership(tx, { userId, organizationId: orgId, role })

    await writeAuditLog(tx, {
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { role: before?.role },
      after: { role },
    })
  })
}

export async function deactivateUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const [adminCount] = await db.select({ count: count() }).from(users).where(
    and(eq(users.organizationId, orgId), eq(users.role, 'admin'), eq(users.isActive, 'true'))
  )
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!target || !(await belongsToOrg(target, userId, orgId))) return
  if (target.role === 'admin' && adminCount.count <= 1) {
    throw new Error('Cannot deactivate the last admin')
  }

  // #799 — membership-scoped unless this org is the user's sole anchor.
  // Deactivating someone's membership here must not lock them out of their
  // other orgs or strip a platform admin of /instance access.
  const membershipOnly = target
    ? await hasAnchorsBeyondOrg(target, userId, orgId)
    : false

  await db.transaction(async (tx) => {
    if (!membershipOnly) {
      await tx.update(users).set({ isActive: 'false', updatedAt: new Date() }).where(
        and(eq(users.id, userId), eq(users.organizationId, orgId))
      )
    }

    // #796 — the canonical membership row always reflects the org-level state.
    await setMembershipActiveFlag(tx, userId, orgId, false)

    await writeAuditLog(tx, {
      action: 'user.deactivate',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      after: { scope: membershipOnly ? 'membership' : 'account' },
    })
  })
}

export async function deleteUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const [adminCount] = await db.select({ count: count() }).from(users).where(
    and(eq(users.organizationId, orgId), eq(users.role, 'admin'))
  )
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!target || !(await belongsToOrg(target, userId, orgId))) return
  if (target.role === 'admin' && adminCount.count <= 1) {
    throw new Error('Cannot delete the last admin')
  }

  // #799 — removing a user from this org only deletes the *identity* when
  // this org is their sole access anchor. Otherwise it severs the membership
  // and leaves the identity, their other orgs, and any platform role intact:
  // an org admin must not be able to destroy a platform admin's account.
  const membershipOnly = target
    ? await hasAnchorsBeyondOrg(target, userId, orgId)
    : false

  if (!membershipOnly) {
    await db.transaction(async (tx) => {
      await tx.delete(users).where(and(eq(users.id, userId), eq(users.organizationId, orgId)))

      await writeAuditLog(tx, {
        action: 'user.delete',
        entityType: 'user',
        entityId: userId,
        userId: session.user.id,
        organizationId: orgId,
        before: { name: target?.name, email: target?.email },
      })
    })
    return
  }

  await db.transaction(async (tx) => {
    await tx.delete(userOrganizationMemberships).where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, orgId),
    ))

    // The legacy home-org column is NOT NULL (#797) and must follow a real
    // membership: repoint it when it pointed at this org.
    if (target!.organizationId === orgId) {
      const [nextHome] = await tx
        .select({ organizationId: userOrganizationMemberships.organizationId })
        .from(userOrganizationMemberships)
        .where(and(
          eq(userOrganizationMemberships.userId, userId),
          eq(userOrganizationMemberships.isActive, true),
        ))
        .orderBy(asc(userOrganizationMemberships.createdAt))
        .limit(1)

      if (!nextHome) {
        // Platform admin with no other membership — the identity cannot be
        // repointed (organizationId is NOT NULL, #797). Throwing rolls back
        // the membership deletion above.
        throw new Error(
          'This account is a platform admin with no other organization. ' +
          'Manage their access from the instance console instead.',
        )
      }
      await tx.update(users)
        .set({ organizationId: nextHome.organizationId, updatedAt: new Date() })
        .where(eq(users.id, userId))
    }

    // Clear a stale last-active pointer so their next session resolves to a
    // surviving membership.
    if (target!.lastActiveOrganizationId === orgId) {
      await tx.update(users)
        .set({ lastActiveOrganizationId: null, updatedAt: new Date() })
        .where(eq(users.id, userId))
    }

    await writeAuditLog(tx, {
      action: 'user.remove_from_org',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: target?.name, email: target?.email },
      after: { scope: 'membership', identityRetained: true },
    })
  })
}

export async function reactivateUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: 'true', updatedAt: new Date() }).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    // #796 — keep the canonical membership row in step with the account flag.
    await setMembershipActiveFlag(tx, userId, orgId, true)

    await writeAuditLog(tx, {
      action: 'user.reactivate',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
    })
  })
}

export async function editUser(userId: string, formData: FormData) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'
  const newPassword = formData.get('password') as string | null

  const before = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!before || !(await belongsToOrg(before, userId, orgId))) return

  // Guard against duplicate email across orgs when email is being changed (#269)
  if (email !== before?.email) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existing) throw new Error('A user with that email address already exists.')
  }

  // Last-admin guard for role demotion
  if (before?.role === 'admin' && role !== 'admin') {
    const [adminCount] = await db.select({ count: count() }).from(users).where(
      and(eq(users.organizationId, orgId), eq(users.role, 'admin'), eq(users.isActive, 'true'))
    )
    if (adminCount.count <= 1) throw new Error('Cannot demote the last admin')
  }

  const updates: Partial<typeof users.$inferInsert> = {
    name,
    email,
    role,
    updatedAt: new Date(),
  }

  if (newPassword) {
    const policy = await getOrgSecuritySettings(orgId)
    const pwValidation = validatePassword(newPassword, policy)
    if (!pwValidation.valid) throw new Error(pwValidation.message)
    updates.passwordHash = await bcrypt.hash(newPassword, 12)
    // #527 — reset password-change clock + clear lockout state when an
    // admin resets a user's password. Mirrors the self-service path.
    updates.lastPasswordChangedAt = new Date()
    updates.failedLoginAttempts = 0
    updates.lockoutUntil = null
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set(updates).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    // #796 — sessions resolve role from the membership row; sync it.
    await upsertMembership(tx, { userId, organizationId: orgId, role })

    await writeAuditLog(tx, {
      action: 'user.edit',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, email: before?.email, role: before?.role },
      after: { name, email, role },
    })
  })
}
