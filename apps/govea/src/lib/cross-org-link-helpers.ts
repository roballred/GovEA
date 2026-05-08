import { db } from '@/db/client'
import { crossOrgLinks } from '@/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'

export type CrossOrgEntityType = 'capability' | 'persona'

// Internal helpers used by mutations in actions/capabilities.ts, actions/personas.ts,
// and actions/connections.ts. They live in lib/ — not actions/ — so they cannot be
// reached as 'use server' RPC endpoints. Each caller is itself a server action with
// its own auth check; these helpers trust that the caller has already validated the
// session and authorization.
//
// History: previously these were exported from actions/cross-org-links.ts with no
// auth check, making them callable by any network client. See #412.

/**
 * Flag all active and pending cross-org links involving an entity for review.
 * Called when an entity's visibility drops to 'org' so both orgs are alerted that
 * a link may no longer be accessible.
 *
 * Caller MUST have already verified that the entity belongs to the actor's org.
 */
export async function flagLinksForVisibilityDrop(
  entityType: CrossOrgEntityType,
  entityId: string,
  reason: string,
) {
  await db.update(crossOrgLinks).set({
    flaggedForReview: true,
    flagReason: reason,
    updatedAt: new Date(),
  }).where(
    and(
      or(
        and(eq(crossOrgLinks.sourceEntityType, entityType), eq(crossOrgLinks.sourceEntityId, entityId)),
        and(eq(crossOrgLinks.targetEntityType, entityType), eq(crossOrgLinks.targetEntityId, entityId)),
      ),
      inArray(crossOrgLinks.status, ['pending', 'active']),
    )
  )
}

/**
 * Clear stale review flags on cross-org links for an entity.
 * Called when visibility is raised back to 'connections' or 'instance'.
 *
 * Caller MUST have already verified that the entity belongs to the actor's org.
 */
export async function clearLinksFlag(
  entityType: CrossOrgEntityType,
  entityId: string,
) {
  await db.update(crossOrgLinks).set({
    flaggedForReview: false,
    flagReason: null,
    updatedAt: new Date(),
  }).where(
    and(
      or(
        and(eq(crossOrgLinks.sourceEntityType, entityType), eq(crossOrgLinks.sourceEntityId, entityId)),
        and(eq(crossOrgLinks.targetEntityType, entityType), eq(crossOrgLinks.targetEntityId, entityId)),
      ),
      eq(crossOrgLinks.flaggedForReview, true),
    )
  )
}

/**
 * Delete every cross-org link between two organizations. Called when a connection
 * between orgA and orgB is removed.
 *
 * `actorUserId` and `actorOrgId` are required so the audit row identifies who
 * performed the removal. Caller MUST be an admin of one of the two orgs.
 */
export async function removeLinksForConnection(
  orgAId: string,
  orgBId: string,
  actorUserId: string,
  actorOrgId: string,
) {
  const affectedLinks = await db.query.crossOrgLinks.findMany({
    where: or(
      and(eq(crossOrgLinks.sourceOrgId, orgAId), eq(crossOrgLinks.targetOrgId, orgBId)),
      and(eq(crossOrgLinks.sourceOrgId, orgBId), eq(crossOrgLinks.targetOrgId, orgAId)),
    ),
  })

  await db.delete(crossOrgLinks).where(
    or(
      and(eq(crossOrgLinks.sourceOrgId, orgAId), eq(crossOrgLinks.targetOrgId, orgBId)),
      and(eq(crossOrgLinks.sourceOrgId, orgBId), eq(crossOrgLinks.targetOrgId, orgAId)),
    )
  )

  if (affectedLinks.length > 0) {
    await writeAuditLog({
      action: 'cross_org_link.remove_for_connection',
      entityType: 'org_connection',
      userId: actorUserId,
      organizationId: actorOrgId,
      before: {
        orgAId,
        orgBId,
        removedLinkIds: affectedLinks.map(link => link.id),
        removedLinks: affectedLinks.map(link => ({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          targetEntityId: link.targetEntityId,
          status: link.status,
          linkType: link.linkType,
        })),
      },
    })
  }
}
