import { cookies } from 'next/headers'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  actAsSessions,
  breakGlassSessions,
  type ActAsSession,
  type ActAsEndReason,
  ACT_AS_DEFAULT_TTL_MINUTES,
} from '@/db/schema'
import { requireBreakGlass } from './break-glass'

export const ACT_AS_COOKIE = 'govea_act_as'

/**
 * Reads the current request's act-as cookie, resolves it to a row, and
 * re-verifies that the parent break-glass session is still active.
 *
 * If the parent has been revoked or expired, marks the act-as row ended and
 * returns null — the helper is the authoritative termination point, so a
 * cross-tenant action that calls `requireActAs` immediately after a parent
 * revoke gets the correct refusal without any background job.
 */
export async function getActiveActAsSession(): Promise<ActAsSession | null> {
  const sessionId = (await cookies()).get(ACT_AS_COOKIE)?.value
  if (!sessionId) return null

  const now = new Date()
  const row = await db.query.actAsSessions.findFirst({
    where: and(
      eq(actAsSessions.id, sessionId),
      isNull(actAsSessions.endedAt),
      gt(actAsSessions.expiresAt, now),
    ),
  })
  if (!row) return null

  const parent = await requireBreakGlass(row.instanceAdminId, row.targetOrgId)
  if (!parent) {
    const parentRow = await db.query.breakGlassSessions.findFirst({
      where: eq(breakGlassSessions.id, row.breakGlassSessionId),
    })
    const reason: ActAsEndReason = parentRow?.revokedAt ? 'parent_revoked' : 'parent_expired'
    await endActAsSessionRow(row.id, reason)
    return null
  }

  return row
}

/**
 * Throws if no active act-as session for `orgId` exists. Used at the top of
 * every cross-tenant mutation server action.
 */
export async function requireActAs(targetOrgId: string): Promise<ActAsSession> {
  const session = await getActiveActAsSession()
  if (!session) throw new Error('No active act-as session')
  if (session.targetOrgId !== targetOrgId) {
    throw new Error('Act-as session does not match target org')
  }
  return session
}

export interface StartActAsParams {
  instanceAdminId: string
  targetOrgId: string
  ttlMinutes?: number
}

/**
 * Starts an act-as session. Returns null if the admin's own org equals the
 * target (self-impersonation is a no-op) or if no active break-glass session
 * for that admin+org exists.
 *
 * TTL is the smaller of `ttlMinutes` (default 30) and the parent break-glass
 * session's remaining lifetime — the child cannot outlive its parent.
 */
export async function startActAsSession(
  params: StartActAsParams,
  adminOrgId: string,
): Promise<ActAsSession | null> {
  if (params.targetOrgId === adminOrgId) return null

  const parent = await requireBreakGlass(params.instanceAdminId, params.targetOrgId)
  if (!parent) return null

  const ttl = params.ttlMinutes ?? ACT_AS_DEFAULT_TTL_MINUTES
  const requestedExpiry = new Date(Date.now() + ttl * 60_000)
  const expiresAt = requestedExpiry < parent.expiresAt ? requestedExpiry : parent.expiresAt

  const [row] = await db.insert(actAsSessions).values({
    breakGlassSessionId: parent.id,
    instanceAdminId: params.instanceAdminId,
    targetOrgId: params.targetOrgId,
    expiresAt,
  }).returning()

  return row
}

export async function endActAsSession(sessionId: string, reason: ActAsEndReason = 'admin_ended'): Promise<void> {
  await endActAsSessionRow(sessionId, reason)
}

async function endActAsSessionRow(sessionId: string, reason: ActAsEndReason): Promise<void> {
  await db.update(actAsSessions)
    .set({ endedAt: new Date(), endReason: reason })
    .where(and(eq(actAsSessions.id, sessionId), isNull(actAsSessions.endedAt)))
}
