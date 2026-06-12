/**
 * Membership write-sync helpers (#796).
 *
 * Since #693 the session's active org/role, the org switcher, the SSO guard,
 * and membership management all read `user_organization_memberships`. Every
 * flow that grants or changes org access must therefore write the membership
 * row in the same transaction as the legacy denormalized `users` columns —
 * otherwise the change simply does not take effect (the membership row wins
 * at session resolution) or the user becomes invisible to membership-based
 * reads.
 */

import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import type { Role } from '@/lib/rbac'

// The transaction object handed to db.transaction callbacks.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Insert-or-update the membership for (user, org) inside the caller's
 * transaction. Updating also heals legacy accounts that predate the #693
 * backfill: their first org-side role change creates the canonical row.
 */
export async function upsertMembership(
  tx: Tx,
  opts: {
    userId: string
    organizationId: string
    role: Role
    isPrimary?: boolean
    isActive?: boolean
  },
): Promise<void> {
  const { userId, organizationId, role, isPrimary = false, isActive = true } = opts

  const updated = await tx
    .update(userOrganizationMemberships)
    .set({ role, isActive, updatedAt: new Date() })
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, organizationId),
    ))
    .returning({ id: userOrganizationMemberships.id })

  if (updated.length === 0) {
    await tx.insert(userOrganizationMemberships).values({
      userId, organizationId, role, isPrimary, isActive,
    })
  }
}

/**
 * Sync the membership's isActive flag for (user, org). A no-op when no
 * membership row exists — account-level `users.isActive` already gates those
 * legacy accounts, and deactivation must not mint new rows.
 */
export async function setMembershipActiveFlag(
  tx: Tx,
  userId: string,
  organizationId: string,
  isActive: boolean,
): Promise<void> {
  await tx
    .update(userOrganizationMemberships)
    .set({ isActive, updatedAt: new Date() })
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, organizationId),
    ))
}
