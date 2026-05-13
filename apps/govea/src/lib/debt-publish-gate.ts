/**
 * Publish-time debt gate (#381 PR-3).
 *
 * Per `rm-architecture-debt.md` §Rules:
 *   "When a user attempts to publish an architecture object that has one or
 *    more linked `critical` or `high` severity debt items in `open` status,
 *    the system must display a warning and require explicit acknowledgment
 *    before publishing proceeds — the publish action is not blocked, but
 *    the acknowledgment is mandatory and logged in the audit trail."
 *
 * Used by capability, application, and ADR edit actions. The form submits
 * `acknowledgeOpenDebt` when the user has explicitly confirmed the warning.
 * If the gate fires and the ack is missing, the action throws a specific
 * error class that the form catches and uses to prompt the user.
 */
import { db } from '@/db/client'
import {
  architectureDebtItems,
  debtApplications, debtCapabilities, debtAdrs,
  type DebtSeverity,
} from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

export type GatedEntityType = 'application' | 'capability' | 'adr'

const OPEN_STATUSES = ['draft', 'published', 'in-progress'] as const
const GATING_SEVERITIES: DebtSeverity[] = ['critical', 'high']

/**
 * Error thrown when a publish attempt needs explicit acknowledgment of
 * linked critical/high open debt. Callers (server actions) should let this
 * propagate; the client form catches it, shows the ack dialog, and resubmits
 * with `acknowledgeOpenDebt=on`.
 */
export class OpenDebtAcknowledgmentRequiredError extends Error {
  readonly code = 'OPEN_DEBT_ACK_REQUIRED'
  readonly criticalCount: number
  readonly highCount: number

  constructor(criticalCount: number, highCount: number) {
    super(
      `Publishing requires acknowledgment of ${criticalCount} critical and ${highCount} high-severity open debt items linked to this object.`,
    )
    this.criticalCount = criticalCount
    this.highCount = highCount
  }
}

/**
 * Returns counts of open critical/high debt linked to a given entity.
 * Used by the publish gate and by audit-log payloads.
 */
export async function countGatingDebt(
  entityType: GatedEntityType,
  entityId: string,
): Promise<{ criticalCount: number; highCount: number }> {
  const linkedDebtIds = await readLinkedDebtIds(entityType, entityId)
  if (linkedDebtIds.length === 0) return { criticalCount: 0, highCount: 0 }

  const rows = await db
    .select({ severity: architectureDebtItems.severity })
    .from(architectureDebtItems)
    .where(and(
      inArray(architectureDebtItems.id, linkedDebtIds),
      inArray(architectureDebtItems.severity, GATING_SEVERITIES),
      inArray(architectureDebtItems.status, [...OPEN_STATUSES]),
    ))

  let criticalCount = 0
  let highCount = 0
  for (const r of rows) {
    if (r.severity === 'critical') criticalCount++
    else if (r.severity === 'high') highCount++
  }
  return { criticalCount, highCount }
}

/**
 * The gate itself. Call from a publish-changing server action with:
 *   - `transitioningToPublished`: true when the edit moves the entity from a
 *     non-published state into a published one. Re-publishes (already-published
 *     edits) do not trigger the gate.
 *   - `acknowledged`: true when the form sent `acknowledgeOpenDebt=on`.
 *
 * Throws `OpenDebtAcknowledgmentRequiredError` when the gate fires and the
 * ack is missing. When ack IS present, returns the counts so the caller can
 * write a `publish.acknowledged_open_debt` audit row.
 */
export async function ensurePublishOpenDebtAck({
  entityType, entityId, transitioningToPublished, acknowledged,
}: {
  entityType: GatedEntityType
  entityId: string
  transitioningToPublished: boolean
  acknowledged: boolean
}): Promise<{ acknowledged: boolean; criticalCount: number; highCount: number }> {
  if (!transitioningToPublished) {
    return { acknowledged: false, criticalCount: 0, highCount: 0 }
  }
  const { criticalCount, highCount } = await countGatingDebt(entityType, entityId)
  if (criticalCount === 0 && highCount === 0) {
    return { acknowledged: false, criticalCount: 0, highCount: 0 }
  }
  if (!acknowledged) {
    throw new OpenDebtAcknowledgmentRequiredError(criticalCount, highCount)
  }
  return { acknowledged: true, criticalCount, highCount }
}

async function readLinkedDebtIds(entityType: GatedEntityType, entityId: string): Promise<string[]> {
  switch (entityType) {
    case 'application': {
      const rows = await db.select({ id: debtApplications.debtItemId }).from(debtApplications).where(eq(debtApplications.applicationId, entityId))
      return rows.map(r => r.id)
    }
    case 'capability': {
      const rows = await db.select({ id: debtCapabilities.debtItemId }).from(debtCapabilities).where(eq(debtCapabilities.capabilityId, entityId))
      return rows.map(r => r.id)
    }
    case 'adr': {
      const rows = await db.select({ id: debtAdrs.debtItemId }).from(debtAdrs).where(eq(debtAdrs.adrId, entityId))
      return rows.map(r => r.id)
    }
  }
}
