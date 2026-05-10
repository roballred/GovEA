/**
 * Cross-page debt surfacing helpers (#381 PR-2).
 *
 * Used by application / capability / ADR detail pages to show "this object
 * carries known debt" inline. Federation rules from `rm-architecture-debt.md`:
 *
 *   "An Enterprise Architect cannot use debt tracking as a surveillance
 *    mechanism to discover problems in agencies that have not chosen to
 *    share them."
 *
 * Concretely: when caller-org views an entity owned by some other org,
 * the inline marker only shows debt items that are visible per
 * `mo-content-visibility`:
 *   - Caller-owned debt linked to this entity (always visible to caller)
 *   - Debt visible from connected orgs at 'connections' or 'instance' visibility
 * Never shows another org's `org`-visibility debt against an entity, even
 * when caller can see the entity itself.
 */
import { db } from '@/db/client'
import {
  architectureDebtItems,
  debtApplications, debtCapabilities, debtAdrs, debtInitiatives,
  type DebtSeverity, type DebtStatus, type ArchitectureDebtItem,
} from '@/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'
import { getConnectedOrgIds } from './federation'

export type DebtLinkedEntityType = 'application' | 'capability' | 'adr' | 'initiative'

export interface LinkedDebtSummary {
  total: number
  /** Counts by severity, omitted when zero. */
  bySeverity: Partial<Record<DebtSeverity, number>>
  /** Number of items in 'open' (draft/published/in-progress) status. */
  openCount: number
  /** Top items by severity then created date for inline rendering. */
  items: Array<Pick<ArchitectureDebtItem, 'id' | 'title' | 'severity' | 'status' | 'securitySensitive'>>
}

const SEVERITY_RANK: Record<DebtSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const OPEN_STATUSES: DebtStatus[] = ['draft', 'published', 'in-progress']

/**
 * Returns linked debt for an entity, federation-filtered.
 *
 * @param entityType which junction table to consult
 * @param entityId   the entity's primary key
 * @param callerOrgId the calling user's org — debt visibility is resolved against this
 * @param role       caller's role; viewers never see security-sensitive items
 * @param limit      max items returned in `items` (default 5)
 */
export async function getLinkedDebt(
  entityType: DebtLinkedEntityType,
  entityId: string,
  callerOrgId: string,
  role: 'admin' | 'contributor' | 'viewer',
  limit = 5,
): Promise<LinkedDebtSummary> {
  // 1. Find debt-item IDs linked to this entity via the relevant junction.
  const linkedIds = await readLinkedDebtIds(entityType, entityId)
  if (linkedIds.length === 0) {
    return { total: 0, bySeverity: {}, openCount: 0, items: [] }
  }

  // 2. Resolve federation visibility — caller's org sees own debt always,
  //    plus connected-org debt at 'connections'/'instance' visibility.
  const connectedOrgIds = await getConnectedOrgIds(callerOrgId)

  const visibilityFilter = connectedOrgIds.length > 0
    ? or(
        eq(architectureDebtItems.organizationId, callerOrgId),
        and(
          inArray(architectureDebtItems.organizationId, connectedOrgIds),
          inArray(architectureDebtItems.visibility, ['connections', 'instance']),
        ),
      )!
    : eq(architectureDebtItems.organizationId, callerOrgId)

  const rows = await db
    .select({
      id: architectureDebtItems.id,
      title: architectureDebtItems.title,
      severity: architectureDebtItems.severity,
      status: architectureDebtItems.status,
      securitySensitive: architectureDebtItems.securitySensitive,
      organizationId: architectureDebtItems.organizationId,
    })
    .from(architectureDebtItems)
    .where(and(
      inArray(architectureDebtItems.id, linkedIds),
      visibilityFilter,
    ))

  // 3. Apply per-row visibility rules: viewers never see security-sensitive
  //    items; viewers also can't see non-published items even from their own
  //    org (matches getDebtItem behaviour from PR-1).
  const visible = rows.filter(r => {
    if (r.securitySensitive && role === 'viewer') return false
    if (role === 'viewer' && r.status !== 'published') return false
    return true
  })

  // 4. Aggregate.
  const bySeverity: Partial<Record<DebtSeverity, number>> = {}
  let openCount = 0
  for (const r of visible) {
    bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1
    if (OPEN_STATUSES.includes(r.status)) openCount++
  }

  const sorted = [...visible].sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (sevDiff !== 0) return sevDiff
    return a.title.localeCompare(b.title)
  })

  return {
    total: visible.length,
    bySeverity,
    openCount,
    items: sorted.slice(0, limit),
  }
}

async function readLinkedDebtIds(entityType: DebtLinkedEntityType, entityId: string): Promise<string[]> {
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
    case 'initiative': {
      const rows = await db.select({ id: debtInitiatives.debtItemId }).from(debtInitiatives).where(eq(debtInitiatives.initiativeId, entityId))
      return rows.map(r => r.id)
    }
  }
}
