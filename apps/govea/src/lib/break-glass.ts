import { and, eq, gt, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { breakGlassSessions, type BreakGlassSession } from '@/db/schema'
import { or } from 'drizzle-orm'

export const BREAK_GLASS_TTL_PRESETS = [60, 240, 480] as const
export type BreakGlassTtlMinutes = (typeof BREAK_GLASS_TTL_PRESETS)[number]
export const BREAK_GLASS_DEFAULT_TTL: BreakGlassTtlMinutes = 60
export const BREAK_GLASS_APPROVAL_THRESHOLD_MINUTES = 60

export function isValidBreakGlassTtl(value: number): value is BreakGlassTtlMinutes {
  return (BREAK_GLASS_TTL_PRESETS as readonly number[]).includes(value)
}

/**
 * Returns the active, approved, non-expired break-glass session for the given
 * admin + org, or null if no such session exists. A pending-approval session
 * does NOT satisfy `requireBreakGlass` — it must be approved first.
 *
 * Consulted by:
 *  - Cross-tenant impersonation flow (#437/#502)
 *  - Cross-tenant user-PII gating (#436): see `getUnlockedOrgIds` for the
 *    multi-org variant used by `/instance/users` and `/instance/orgs/[id]`
 */
export async function requireBreakGlass(
  adminId: string,
  orgId: string,
): Promise<BreakGlassSession | null> {
  const now = new Date()
  const session = await db.query.breakGlassSessions.findFirst({
    where: and(
      eq(breakGlassSessions.instanceAdminId, adminId),
      eq(breakGlassSessions.targetOrgId, orgId),
      isNull(breakGlassSessions.revokedAt),
      gt(breakGlassSessions.expiresAt, now),
      or(
        eq(breakGlassSessions.requiresApproval, false),
        isNotNull(breakGlassSessions.approvedAt),
      ),
    ),
  })
  return session ?? null
}

/**
 * Returns the set of org IDs the given instance admin currently has active,
 * approved, non-expired break-glass sessions for. Empty set if none.
 *
 * Multi-org variant of `requireBreakGlass` for surfaces that need to filter
 * a list (e.g., the cross-tenant user list) without N round-trips. Mirrors
 * the same gating rules: pending-approval sessions do NOT count; expired
 * and revoked sessions do NOT count.
 *
 * Added for #436 (gate cross-tenant user-PII reads on break-glass).
 */
export async function getUnlockedOrgIds(adminId: string): Promise<Set<string>> {
  const now = new Date()
  const rows = await db.query.breakGlassSessions.findMany({
    where: and(
      eq(breakGlassSessions.instanceAdminId, adminId),
      isNull(breakGlassSessions.revokedAt),
      gt(breakGlassSessions.expiresAt, now),
      or(
        eq(breakGlassSessions.requiresApproval, false),
        isNotNull(breakGlassSessions.approvedAt),
      ),
    ),
    columns: { targetOrgId: true },
  })
  return new Set(rows.map(r => r.targetOrgId))
}
