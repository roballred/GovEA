/**
 * Data Architecture graph data fetcher (#363 PR-3).
 *
 * Reads the four metamodel object types and the three semantic-relationship
 * tables from a single org, applies role gating (viewer sees only published)
 * and federation visibility, and returns a flat graph shape suitable for
 * the Chen Notation renderer.
 *
 * Edges include the structural FK relationship (entity ↔ business key
 * "instantiates") as well as the three explicit relationship-table kinds
 * (is-related / characterized-by / shares).
 *
 * Capability: da-chen-visualization
 * Persona: Enterprise Data Architect, Data Modeler
 */

import { db } from '@/db/client'
import {
  dataEntities, dataAttributes, dataLinks, dataBusinessKeys,
  dataEntityOwners, dataAttributeOwners, dataBusinessKeyOwners,
  dataEntityRelations, dataEntityAttributeLinks, dataAttributeShares,
  type DataEntity, type DataAttribute, type DataLink, type DataBusinessKey,
  type PhysicalAttributeType, type PhysicalLinkType,
} from '@/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'

type Status = 'draft' | 'published' | 'archived'

export type GraphNodeKind = 'entity' | 'attribute' | 'business-key'

export interface GraphEntityNode {
  kind: 'entity'
  id: string
  name: string
  status: Status
  ownerPersonaIds: string[]
  physicalHubTableName: string | null
}

export interface GraphAttributeNode {
  kind: 'attribute'
  id: string
  name: string
  status: Status
  ownerPersonaIds: string[]
  physicalSatelliteTableName: string | null
  physicalAttributeType: PhysicalAttributeType | null
}

export interface GraphBusinessKeyNode {
  kind: 'business-key'
  id: string
  name: string
  status: Status
  ownerPersonaIds: string[]
  dataType: string | null
  /** The entity this business key instantiates. */
  owningEntityId: string
}

export type GraphNode = GraphEntityNode | GraphAttributeNode | GraphBusinessKeyNode

export type EdgeKind = 'is-related' | 'characterized-by' | 'shares' | 'instantiates'

export interface GraphEdge {
  kind: EdgeKind
  /** Lower-UUID side for symmetric kinds; the entity side for directed kinds. */
  sourceId: string
  /** Higher-UUID side for symmetric kinds; the attribute or business-key side for directed kinds. */
  targetId: string
}

export interface GraphFilters {
  /** Persona ID — node visible only if at least one owner matches. Multiple values OR'd. */
  ownerPersonaIds?: string[]
  /** Free-text match against entity/attribute/business-key name (case-insensitive contains). */
  nameSearch?: string
  /** Restrict attributes to a specific physical type tag. */
  physicalAttributeType?: PhysicalAttributeType
  /** Restrict to entities/attributes/BKs linked to a specific physical link type. v1 reads this off the dataLinks table. */
  physicalLinkType?: PhysicalLinkType
}

export interface DataArchitectureGraph {
  entities: GraphEntityNode[]
  attributes: GraphAttributeNode[]
  businessKeys: GraphBusinessKeyNode[]
  links: DataLink[]
  edges: GraphEdge[]
}

// ── Implementation ──────────────────────────────────────────────────────────

interface FetchArgs {
  organizationId: string
  role: 'admin' | 'contributor' | 'viewer'
  filters?: GraphFilters
}

/**
 * Returns the graph for one organization. Viewer role sees only published
 * objects. Filters reduce visible nodes; orphan edges are dropped.
 *
 * Federation is intentionally not implemented in v1 — the diagram is
 * org-scoped only. Cross-org viewing of a partner org's data architecture
 * is deferred; the metamodel objects have visibility flags that respect
 * federation when read individually, but rendering a graph across orgs is
 * a separate UX question (whose Chen layout do you trust?) and out of scope.
 */
export async function getDataArchitectureGraph(args: FetchArgs): Promise<DataArchitectureGraph> {
  const { organizationId, role, filters } = args
  const viewerOnlyPublished = role === 'viewer'

  // Pull all four object types in parallel.
  const [entityRows, attributeRows, linkRows, bkRows] = await Promise.all([
    db.select().from(dataEntities).where(eq(dataEntities.organizationId, organizationId)),
    db.select().from(dataAttributes).where(eq(dataAttributes.organizationId, organizationId)),
    db.select().from(dataLinks).where(eq(dataLinks.organizationId, organizationId)),
    db.select().from(dataBusinessKeys).where(eq(dataBusinessKeys.organizationId, organizationId)),
  ])

  // Role gating: viewer drops non-published from each list.
  const passStatus = <T extends { status: Status }>(r: T) => !viewerOnlyPublished || r.status === 'published'
  const visibleEntities = entityRows.filter(passStatus)
  const visibleAttributes = attributeRows.filter(passStatus)
  const visibleLinks = linkRows.filter(passStatus)
  const visibleBKs = bkRows.filter(passStatus)

  // Owner lookups for filter + display. Skip the query if no rows survived role gating.
  const [entityOwners, attributeOwners, bkOwners] = await Promise.all([
    visibleEntities.length === 0 ? [] : db.select().from(dataEntityOwners)
      .where(inArray(dataEntityOwners.dataEntityId, visibleEntities.map(e => e.id))),
    visibleAttributes.length === 0 ? [] : db.select().from(dataAttributeOwners)
      .where(inArray(dataAttributeOwners.dataAttributeId, visibleAttributes.map(a => a.id))),
    visibleBKs.length === 0 ? [] : db.select().from(dataBusinessKeyOwners)
      .where(inArray(dataBusinessKeyOwners.dataBusinessKeyId, visibleBKs.map(bk => bk.id))),
  ])

  const ownersBy = <T extends { [k: string]: unknown }>(
    rows: T[], idKey: keyof T,
  ): Map<string, string[]> => {
    const m = new Map<string, string[]>()
    for (const r of rows) {
      const id = r[idKey] as string
      const pid = (r as unknown as { personaId: string }).personaId
      const list = m.get(id) ?? []
      list.push(pid)
      m.set(id, list)
    }
    return m
  }

  const entityOwnerMap = ownersBy(entityOwners, 'dataEntityId')
  const attributeOwnerMap = ownersBy(attributeOwners, 'dataAttributeId')
  const bkOwnerMap = ownersBy(bkOwners, 'dataBusinessKeyId')

  const buildEntityNode = (e: DataEntity): GraphEntityNode => ({
    kind: 'entity',
    id: e.id,
    name: e.name,
    status: e.status,
    ownerPersonaIds: entityOwnerMap.get(e.id) ?? [],
    physicalHubTableName: e.physicalHubTableName,
  })
  const buildAttributeNode = (a: DataAttribute): GraphAttributeNode => ({
    kind: 'attribute',
    id: a.id,
    name: a.name,
    status: a.status,
    ownerPersonaIds: attributeOwnerMap.get(a.id) ?? [],
    physicalSatelliteTableName: a.physicalSatelliteTableName,
    physicalAttributeType: a.physicalAttributeType,
  })
  const buildBKNode = (bk: DataBusinessKey): GraphBusinessKeyNode => ({
    kind: 'business-key',
    id: bk.id,
    name: bk.name,
    status: bk.status,
    ownerPersonaIds: bkOwnerMap.get(bk.id) ?? [],
    dataType: bk.dataType,
    owningEntityId: bk.owningDataEntityId,
  })

  let entities = visibleEntities.map(buildEntityNode)
  let attributes = visibleAttributes.map(buildAttributeNode)
  let businessKeys = visibleBKs.map(buildBKNode)

  // Apply filters.
  if (filters?.ownerPersonaIds?.length) {
    const targetSet = new Set(filters.ownerPersonaIds)
    const ownsAny = (owners: string[]) => owners.some(o => targetSet.has(o))
    entities = entities.filter(e => ownsAny(e.ownerPersonaIds))
    attributes = attributes.filter(a => ownsAny(a.ownerPersonaIds))
    businessKeys = businessKeys.filter(bk => ownsAny(bk.ownerPersonaIds))
  }
  if (filters?.nameSearch) {
    const needle = filters.nameSearch.toLowerCase()
    const matches = (n: { name: string }) => n.name.toLowerCase().includes(needle)
    entities = entities.filter(matches)
    attributes = attributes.filter(matches)
    businessKeys = businessKeys.filter(matches)
  }
  if (filters?.physicalAttributeType) {
    attributes = attributes.filter(a => a.physicalAttributeType === filters.physicalAttributeType)
  }
  // physicalLinkType filter is applied to dataLinks separately — links are not nodes in the graph
  // (they were renamed from "Relationship" because the cross-object relationship kinds are
  //  rendered as edges, not as nodes). Surfaced here for completeness in the returned `links` list.
  let surfacedLinks = visibleLinks
  if (filters?.physicalLinkType) {
    surfacedLinks = surfacedLinks.filter(l => l.physicalLinkType === filters.physicalLinkType)
  }

  // Edge fetch — only for the surviving nodes.
  const entityIds = entities.map(e => e.id)
  const attributeIds = attributes.map(a => a.id)
  const bkIds = businessKeys.map(bk => bk.id)

  const [relRows, charRows, shareRows] = await Promise.all([
    entityIds.length === 0
      ? []
      : db.select().from(dataEntityRelations).where(and(
          eq(dataEntityRelations.organizationId, organizationId),
          or(
            inArray(dataEntityRelations.leftDataEntityId, entityIds),
            inArray(dataEntityRelations.rightDataEntityId, entityIds),
          ),
        )),
    entityIds.length === 0 || attributeIds.length === 0
      ? []
      : db.select().from(dataEntityAttributeLinks).where(and(
          eq(dataEntityAttributeLinks.organizationId, organizationId),
          inArray(dataEntityAttributeLinks.dataEntityId, entityIds),
          inArray(dataEntityAttributeLinks.dataAttributeId, attributeIds),
        )),
    attributeIds.length < 2
      ? []
      : db.select().from(dataAttributeShares).where(and(
          eq(dataAttributeShares.organizationId, organizationId),
          inArray(dataAttributeShares.leftDataAttributeId, attributeIds),
          inArray(dataAttributeShares.rightDataAttributeId, attributeIds),
        )),
  ])

  const visibleEntityIdSet = new Set(entityIds)
  const visibleAttributeIdSet = new Set(attributeIds)

  const edges: GraphEdge[] = []

  // entity ↔ entity "is related" — drop pairs where either endpoint was filtered out
  for (const r of relRows) {
    if (visibleEntityIdSet.has(r.leftDataEntityId) && visibleEntityIdSet.has(r.rightDataEntityId)) {
      edges.push({ kind: 'is-related', sourceId: r.leftDataEntityId, targetId: r.rightDataEntityId })
    }
  }

  // entity ↔ attribute "characterized by"
  for (const r of charRows) {
    if (visibleEntityIdSet.has(r.dataEntityId) && visibleAttributeIdSet.has(r.dataAttributeId)) {
      edges.push({ kind: 'characterized-by', sourceId: r.dataEntityId, targetId: r.dataAttributeId })
    }
  }

  // attribute ↔ attribute "shares"
  for (const r of shareRows) {
    if (visibleAttributeIdSet.has(r.leftDataAttributeId) && visibleAttributeIdSet.has(r.rightDataAttributeId)) {
      edges.push({ kind: 'shares', sourceId: r.leftDataAttributeId, targetId: r.rightDataAttributeId })
    }
  }

  // entity → business-key "instantiates" — structural FK, not a junction table.
  for (const bk of businessKeys) {
    if (visibleEntityIdSet.has(bk.owningEntityId)) {
      edges.push({ kind: 'instantiates', sourceId: bk.owningEntityId, targetId: bk.id })
    }
  }

  return { entities, attributes, businessKeys, links: surfacedLinks, edges }
}
