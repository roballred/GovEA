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
 * Slice 2/3a of #693 (see docs/design/multi-org-membership.md). This is the
 * single server-side resolution point for "which org am I acting in right now" —
 * the value that ends up in the JWT and session.
 *
 * Selection order (#693 Q2):
 *   1. `preferredOrgId` (the user's last-selected org) — only if it is still an
 *      active membership;
 *   2. the **primary** active membership;
 *   3. the oldest active membership (deterministic tie-break).
 *
 * Returns `null` when the user has no active membership, in which case the
 * caller falls back to the denormalized `users.organization_id` / `role`. Only
 * `is_active` memberships are eligible; revoked (soft-deactivated) memberships
 * never grant an active context — so a stale last-selected pointing at a revoked
 * membership is correctly ignored.
 */
export async function resolveActiveMembership(
  userId: string,
  preferredOrgId?: string | null,
): Promise<ActiveContext | null> {
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

  // 1. Honor last-selected when it is still an active membership.
  if (preferredOrgId) {
    const preferred = memberships.find(m => m.organizationId === preferredOrgId)
    if (preferred) return { organizationId: preferred.organizationId, role: preferred.role as Role }
  }

  // 2/3. Primary first; then oldest, so selection is deterministic when there is
  // no primary (or — defensively — more than one).
  const chosen = [...memberships].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.createdAt.getTime() - b.createdAt.getTime()
  })[0]

  return { organizationId: chosen.organizationId, role: chosen.role as Role }
}
