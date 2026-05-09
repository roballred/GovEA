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
 * Under Option 2 (see #418 design note), this helper has no caller in the
 * read path. It will be consulted by the cross-tenant impersonation feature
 * (#437) once that lands, and by gated cross-tenant reads when #436 promotes
 * to Option 1.
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
