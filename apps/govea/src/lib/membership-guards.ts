/**
 * Membership lookup + last-admin guard primitives (#693 slice 4).
 *
 * Shared by the org-scoped membership actions (actions/memberships.ts) and
 * the instance-console cross-org membership actions (actions/instance.ts) so
 * both enforce the same per-organization invariant: an org must never lose
 * its last active admin membership.
 */

import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { and, count, eq } from 'drizzle-orm'

/**
 * Number of active **admin memberships** in an org — the per-org last-admin
 * guard's basis. The membership-level equivalent of the users.ts guard,
 * which counted users.role; with multi-org, org admin coverage lives in
 * memberships.
 */
export async function activeAdminCount(orgId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(userOrganizationMemberships)
    .where(and(
      eq(userOrganizationMemberships.organizationId, orgId),
      eq(userOrganizationMemberships.role, 'admin'),
      eq(userOrganizationMemberships.isActive, true),
    ))
  return row?.c ?? 0
}

export async function findMembership(userId: string, orgId: string) {
  const [row] = await db
    .select({
      userId: userOrganizationMemberships.userId,
      role: userOrganizationMemberships.role,
      isActive: userOrganizationMemberships.isActive,
    })
    .from(userOrganizationMemberships)
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, orgId),
    ))
    .limit(1)
  return row ?? null
}
