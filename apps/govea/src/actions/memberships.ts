'use server'

import { db } from '@/db/client'
import { users, userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin, type Role } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
// Guard primitives shared with the instance-console membership actions
// (#693 slice 4 — see lib/membership-guards.ts).
import { activeAdminCount, findMembership } from '@/lib/membership-guards'

const MEMBERSHIP_ENTITY = 'user_organization_membership'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export interface OrgMembershipRow {
  userId: string
  name: string | null
  email: string
  role: Role
  isActive: boolean
  isPrimary: boolean
}

/** Lists the active org's memberships (Admin only). */
export async function getOrgMemberships(): Promise<OrgMembershipRow[]> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const rows = await db
    .select({
      userId: userOrganizationMemberships.userId,
      role: userOrganizationMemberships.role,
      isActive: userOrganizationMemberships.isActive,
      isPrimary: userOrganizationMemberships.isPrimary,
      name: users.name,
      email: users.email,
    })
    .from(userOrganizationMemberships)
    .innerJoin(users, eq(users.id, userOrganizationMemberships.userId))
    .where(eq(userOrganizationMemberships.organizationId, orgId))

  return rows
    .map(r => ({ ...r, role: r.role as Role }))
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))
}

/**
 * Adds an existing identity as a member of the active org. If a (soft-
 * deactivated) membership already exists it is reactivated and its role updated.
 * Identity creation stays in createUser / the instance console.
 */
export async function addOrgMembership(email: string, role: Role) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.trim())).limit(1)
  if (!user) throw new Error('No user with that email exists. Create the user first.')

  const existing = await findMembership(user.id, orgId)

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(userOrganizationMemberships)
        .set({ role, isActive: true, updatedAt: new Date() })
        .where(and(
          eq(userOrganizationMemberships.userId, user.id),
          eq(userOrganizationMemberships.organizationId, orgId),
        ))
    } else {
      await tx.insert(userOrganizationMemberships).values({
        userId: user.id, organizationId: orgId, role, isActive: true,
      })
    }
    await writeAuditLog(tx, {
      action: existing ? 'membership.reactivate' : 'membership.add',
      entityType: MEMBERSHIP_ENTITY,
      entityId: user.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { email: email.trim(), role },
    })
  })
}

/** Changes a member's role in the active org. Guards the last active admin. */
export async function updateOrgMembershipRole(userId: string, role: Role) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await findMembership(userId, orgId)
  if (!before) throw new Error('No membership for that user in this organization.')

  if (before.role === 'admin' && role !== 'admin' && before.isActive) {
    if (await activeAdminCount(orgId) <= 1) {
      throw new Error('Cannot demote the last admin of this organization.')
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(userOrganizationMemberships)
      .set({ role, updatedAt: new Date() })
      .where(and(
        eq(userOrganizationMemberships.userId, userId),
        eq(userOrganizationMemberships.organizationId, orgId),
      ))
    await writeAuditLog(tx, {
      action: 'membership.role_changed',
      entityType: MEMBERSHIP_ENTITY,
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { role: before.role },
      after: { role },
    })
  })
}

/** Deactivates (revokes) or reactivates a membership. Guards the last active admin on deactivate. */
export async function setOrgMembershipActive(userId: string, active: boolean) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await findMembership(userId, orgId)
  if (!before) throw new Error('No membership for that user in this organization.')

  if (!active && before.isActive && before.role === 'admin') {
    if (await activeAdminCount(orgId) <= 1) {
      throw new Error('Cannot remove the last admin of this organization.')
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(userOrganizationMemberships)
      .set({ isActive: active, updatedAt: new Date() })
      .where(and(
        eq(userOrganizationMemberships.userId, userId),
        eq(userOrganizationMemberships.organizationId, orgId),
      ))
    await writeAuditLog(tx, {
      action: active ? 'membership.reactivate' : 'membership.deactivate',
      entityType: MEMBERSHIP_ENTITY,
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
    })
  })
}
