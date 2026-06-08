import { db } from '@/db/client'
import { userOrganizationMemberships } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import type { Role } from '@/lib/rbac'

export interface ActiveContext {
  organizationId: string
  role: Role
}

/**
 * Resolves a user's *active* organization context from their memberships.
 *
 * Slice 2 of #693 (see docs/design/multi-org-membership.md). With no org
 * switcher yet (that's slice 3), the active org is the user's **primary** active
 * membership, falling back to the oldest active membership for determinism.
 * Returns `null` when the user has no active membership, in which case the
 * caller falls back to the denormalized `users.organization_id` / `role`.
 *
 * This is the single server-side resolution point for "which org am I acting in
 * right now" — the value that ends up in the JWT and session. Only `is_active`
 * memberships are eligible; revoked (soft-deactivated) memberships never grant
 * an active context.
 */
export async function resolveActiveMembership(userId: string): Promise<ActiveContext | null> {
  const memberships = await db
    .select({
      organizationId: userOrganizationMemberships.organizationId,
      role: userOrganizationMemberships.role,
      isPrimary: userOrganizationMemberships.isPrimary,
      createdAt: userOrganizationMemberships.createdAt,
    })
    .from(userOrganizationMemberships)
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.isActive, true),
    ))

  if (memberships.length === 0) return null

  // Primary first; then oldest, so selection is deterministic when there is no
  // primary (or — defensively — more than one).
  const chosen = [...memberships].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.createdAt.getTime() - b.createdAt.getTime()
  })[0]

  return { organizationId: chosen.organizationId, role: chosen.role as Role }
}
