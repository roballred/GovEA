import { db } from '@/db/client'
import {
  capabilities, personas, applications, services, valueStreams,
  strategicObjectives, goals, strategies, initiatives, adrs, principles,
} from '@/db/schema'
import { eq } from 'drizzle-orm'

export type FederationVisibility = 'org' | 'connections' | 'instance'

/**
 * Throws if the entity's org doesn't match the caller's org.
 * Use before any write to content fetched without an org filter.
 */
export function assertOwnership(
  entityOrgId: string | null | undefined,
  callerOrgId: string,
): void {
  if (!entityOrgId || entityOrgId !== callerOrgId) {
    throw new Error('Forbidden: content owned by another organization')
  }
}

/**
 * Entity kinds that can appear on either side of a same-org junction row.
 *
 * Cross-org references are only allowed through `crossOrgLinks`, never through
 * the local junction tables. Use `assertEntityInOrg` on every junction insert
 * to enforce that.
 */
export type EntityKind =
  | 'capability'
  | 'persona'
  | 'application'
  | 'service'
  | 'value_stream'
  | 'objective'
  | 'goal'
  | 'strategy'
  | 'initiative'
  | 'adr'
  | 'principle'

/**
 * Asserts that the entity referenced by (kind, id) belongs to the caller's org.
 * Throws if the entity does not exist or belongs to another org.
 *
 * Use before any junction-table insert / update that references an entity ID
 * supplied by the caller. Both endpoints of a junction must be verified.
 */
export async function assertEntityInOrg(
  kind: EntityKind,
  id: string,
  callerOrgId: string,
): Promise<void> {
  let entityOrgId: string | null | undefined
  switch (kind) {
    case 'capability': {
      const r = await db.query.capabilities.findFirst({ where: eq(capabilities.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'persona': {
      const r = await db.query.personas.findFirst({ where: eq(personas.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'application': {
      const r = await db.query.applications.findFirst({ where: eq(applications.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'service': {
      const r = await db.query.services.findFirst({ where: eq(services.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'value_stream': {
      const r = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'objective': {
      const r = await db.query.strategicObjectives.findFirst({ where: eq(strategicObjectives.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'goal': {
      const r = await db.query.goals.findFirst({ where: eq(goals.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'strategy': {
      const r = await db.query.strategies.findFirst({ where: eq(strategies.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'initiative': {
      const r = await db.query.initiatives.findFirst({ where: eq(initiatives.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'adr': {
      const r = await db.query.adrs.findFirst({ where: eq(adrs.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
    case 'principle': {
      const r = await db.query.principles.findFirst({ where: eq(principles.id, id), columns: { organizationId: true } })
      entityOrgId = r?.organizationId
      break
    }
  }
  assertOwnership(entityOrgId, callerOrgId)
}

export async function getConnectedOrgIds(organizationId: string): Promise<string[]> {
  const connections = await db.query.orgConnections.findMany({
    where: (oc, { and, or, eq }) => and(
      or(eq(oc.fromOrgId, organizationId), eq(oc.toOrgId, organizationId)),
      eq(oc.status, 'active')
    ),
  })
  return connections.map(c =>
    c.fromOrgId === organizationId ? c.toOrgId : c.fromOrgId
  )
}

export async function canReadFederatedEntity(
  entityOrgId: string | null | undefined,
  visibility: FederationVisibility | null | undefined,
  callerOrgId: string,
): Promise<boolean> {
  if (!entityOrgId || !visibility) return false
  if (entityOrgId === callerOrgId) return true
  if (visibility === 'instance') return true
  if (visibility !== 'connections') return false

  const connectedOrgIds = await getConnectedOrgIds(callerOrgId)
  return connectedOrgIds.includes(entityOrgId)
}
