/**
 * Domain-owner overwrite gate (#581).
 *
 * Surfaced by the Domain Architect persona walk (#580):
 *   "Other contributors can inadvertently overwrite or misclassify domain
 *    records, with no notification to the domain owner."
 *
 * Translation:
 *   - Any architecture object (capability / application / ADR) can optionally
 *     name a domain owner.
 *   - When a non-owner Contributor edits an owned object, they must
 *     explicitly acknowledge that they are overwriting someone else's record.
 *   - The edit is NOT blocked — the gate exists to make the act visible and
 *     auditable, not to prevent it. Established-practice EA teams need
 *     coordination, not approval queues (the issue's "Out of scope" call-out).
 *
 * Same shape as `debt-publish-gate.ts` (#381 PR-3): a single function the
 * server action calls, plus a typed error class the client form catches to
 * prompt the user for the acknowledgment checkbox.
 */
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Validate that a user-id supplied by the form (e.g. the picked domain
 * owner) is a user in the caller's organization. Throws otherwise.
 * Mirrors `assertEntityInOrg` from federation.ts but for users — those
 * helpers don't cover user references because no other column references
 * users by foreign key today.
 */
export async function assertUserInOrg(userId: string, callerOrgId: string): Promise<void> {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.organizationId, callerOrgId)),
    columns: { id: true },
  })
  if (!row) throw new Error('Domain owner must be a user in your organization')
}

/**
 * Thrown when a non-owner attempts to save an edit to an owned object
 * without `acknowledgeOverwrite=on` in the form. Carries the owner's
 * display name + email so the client can render "owned by Carlos Carter"
 * in the warning banner without a second round-trip.
 */
export class DomainOwnerOverwriteAcknowledgmentRequiredError extends Error {
  readonly code = 'DOMAIN_OWNER_ACK_REQUIRED'
  readonly ownerUserId: string
  readonly ownerName: string | null
  readonly ownerEmail: string | null

  constructor(ownerUserId: string, ownerName: string | null, ownerEmail: string | null) {
    const who = ownerName ?? ownerEmail ?? 'another contributor'
    super(
      `This object is owned by ${who}. Acknowledge the overwrite warning before saving.`,
    )
    this.ownerUserId = ownerUserId
    this.ownerName = ownerName
    this.ownerEmail = ownerEmail
  }
}

/**
 * Call from an edit action with the pre-edit `domainOwnerUserId` (read from
 * the `before` snapshot), the actor's user id, and whether the form sent
 * `acknowledgeOverwrite=on`.
 *
 * Returns `{ gated: true, ... }` when the gate fired and was acknowledged —
 * the caller writes a `domain_owner.overwrite_acknowledged` audit row.
 * Returns `{ gated: false }` when no gate applied (no owner / actor is owner).
 * Throws when the gate fired and was NOT acknowledged.
 *
 * The owner lookup runs only when actor !== owner, so the common case (no
 * owner, or owner editing their own record) does zero extra DB work.
 */
export async function ensureDomainOwnerOverwriteAck({
  beforeOwnerUserId,
  actorUserId,
  acknowledged,
}: {
  beforeOwnerUserId: string | null | undefined
  actorUserId: string
  acknowledged: boolean
}): Promise<{ gated: false } | { gated: true; ownerUserId: string; ownerName: string | null; ownerEmail: string | null }> {
  if (!beforeOwnerUserId) return { gated: false }
  if (beforeOwnerUserId === actorUserId) return { gated: false }

  // Resolve owner name/email so the error (or the audit row) carries the
  // human-readable attribution. One query, only on the rare path.
  const owner = await db.query.users.findFirst({
    where: eq(users.id, beforeOwnerUserId),
    columns: { id: true, name: true, email: true },
  })
  if (!owner) {
    // Owner row was deleted between the form load and the save. Schema's
    // ON DELETE SET NULL means the column will already be cleared; treat
    // as ungated so the save proceeds without a spurious warning.
    return { gated: false }
  }

  if (!acknowledged) {
    throw new DomainOwnerOverwriteAcknowledgmentRequiredError(owner.id, owner.name, owner.email)
  }
  return { gated: true, ownerUserId: owner.id, ownerName: owner.name, ownerEmail: owner.email }
}
