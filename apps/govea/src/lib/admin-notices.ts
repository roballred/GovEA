import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { adminNotices, type AdminNotice } from '@/db/schema'

/**
 * Returns the active org-scoped notice for `orgId`, or null if none is active.
 *
 * Only one notice per (scope, organizationId) can be `active = true` at a
 * time — the invariant is enforced by `actions/admin-notices.ts` (activating
 * one notice deactivates the others in a transaction). If a race ever puts
 * two rows in the active state, the most recently updated wins, so the UI
 * remains deterministic.
 */
export async function getActiveOrgNotice(orgId: string): Promise<AdminNotice | null> {
  const row = await db.query.adminNotices.findFirst({
    where: and(
      eq(adminNotices.scope, 'org'),
      eq(adminNotices.organizationId, orgId),
      eq(adminNotices.active, true),
    ),
    orderBy: [desc(adminNotices.updatedAt)],
  })
  return row ?? null
}

/**
 * Returns all notices for `orgId` (active and inactive) for the management UI.
 * Most-recent first.
 */
export async function listOrgNotices(orgId: string): Promise<AdminNotice[]> {
  return db.query.adminNotices.findMany({
    where: and(
      eq(adminNotices.scope, 'org'),
      eq(adminNotices.organizationId, orgId),
    ),
    orderBy: [desc(adminNotices.updatedAt)],
  })
}

/**
 * Validates a "Learn more" URL. Returns the URL if valid, throws otherwise.
 * https-only — http and other schemes are rejected to avoid mixed-content
 * warnings and to keep this from becoming a generic redirect surface.
 */
export function validateLearnMoreUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Learn more URL must be a valid URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Learn more URL must use https')
  }
  return parsed.toString()
}
