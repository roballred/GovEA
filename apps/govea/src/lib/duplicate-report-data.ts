/**
 * Data assembly for the Repository Duplicates report (#718).
 *
 * Fetches minimal name/context rows for every repository entity type in ONE
 * organization, runs the pure duplicate grouping from duplicate-report.ts,
 * and returns per-entity-type sections plus taxonomy coverage:
 *
 *  - standard entities (capabilities … data business keys): exact + near
 *    name matches, near-tier scoped to the natural grouping (capability
 *    domain, glossary domain) where one exists
 *  - taxonomy types (root terms) and taxonomy values (scoped to their type)
 *  - conflicting entity-taxonomy assignments: one entity tagged with two or
 *    more same-type values whose names are duplicates of each other
 *
 * Read-only: detection never merges, deletes, or mutates records.
 */

import { db } from '@/db/client'
import {
  capabilities, applications, personas, adrs, initiatives, strategicObjectives,
  goals, services, valueStreams, principles, glossaryTerms,
  dataEntities, dataAttributes, dataLinks, dataBusinessKeys,
  taxonomyTerms, entityTaxonomyValues,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { findDuplicateGroups, type DuplicateGroup, type DuplicateRecord } from '@/lib/duplicate-report'

export type DuplicateReportSection = {
  key: string
  label: string
  /** How many records were scanned (drives the empty-state copy). */
  scanned: number
  groups: DuplicateGroup[]
}

type StandardSource = {
  key: string
  label: string
  /** entityType literal used by entity_taxonomy_values rows, where applicable. */
  assignmentKey?: string
  hrefBase: string
  /** True when the route has no per-record detail page. */
  listOnly?: boolean
  fetch: (orgId: string) => Promise<{
    id: string
    name: string
    status?: string | null
    context?: string | null
    nearGroupKey?: string | null
  }[]>
}

const STANDARD_SOURCES: StandardSource[] = [
  {
    key: 'capabilities', label: 'Capabilities', assignmentKey: 'capability', hrefBase: '/capabilities',
    fetch: async orgId => (await db.select({
      id: capabilities.id, name: capabilities.name, status: capabilities.status, domain: capabilities.domain,
    }).from(capabilities).where(eq(capabilities.organizationId, orgId)))
      .map(r => ({ ...r, context: r.domain, nearGroupKey: r.domain ?? '' })),
  },
  {
    key: 'applications', label: 'Applications', assignmentKey: 'application', hrefBase: '/applications',
    fetch: async orgId => db.select({
      id: applications.id, name: applications.name, status: applications.status,
    }).from(applications).where(eq(applications.organizationId, orgId)),
  },
  {
    key: 'personas', label: 'Personas', assignmentKey: 'persona', hrefBase: '/personas',
    fetch: async orgId => db.select({
      id: personas.id, name: personas.name, status: personas.status,
    }).from(personas).where(eq(personas.organizationId, orgId)),
  },
  {
    key: 'adrs', label: 'Decisions (ADRs)', assignmentKey: 'adr', hrefBase: '/adrs',
    fetch: async orgId => db.select({
      id: adrs.id, name: adrs.title, status: adrs.status,
    }).from(adrs).where(eq(adrs.organizationId, orgId)),
  },
  {
    key: 'initiatives', label: 'Initiatives', assignmentKey: 'initiative', hrefBase: '/initiatives',
    fetch: async orgId => db.select({
      id: initiatives.id, name: initiatives.name, status: initiatives.status,
    }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
  },
  {
    key: 'objectives', label: 'Objectives', assignmentKey: 'objective', hrefBase: '/objectives',
    fetch: async orgId => db.select({
      id: strategicObjectives.id, name: strategicObjectives.name, status: strategicObjectives.status,
    }).from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId)),
  },
  {
    key: 'goals', label: 'Goals', assignmentKey: 'goal', hrefBase: '/goals',
    fetch: async orgId => db.select({
      id: goals.id, name: goals.name, status: goals.status,
    }).from(goals).where(eq(goals.organizationId, orgId)),
  },
  {
    key: 'services', label: 'Services', assignmentKey: 'service', hrefBase: '/services',
    fetch: async orgId => db.select({
      id: services.id, name: services.name, status: services.status,
    }).from(services).where(eq(services.organizationId, orgId)),
  },
  {
    key: 'value-streams', label: 'Value Streams', assignmentKey: 'value-stream', hrefBase: '/value-streams',
    fetch: async orgId => db.select({
      id: valueStreams.id, name: valueStreams.name, status: valueStreams.status,
    }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
  },
  {
    key: 'principles', label: 'Principles', assignmentKey: 'principle', hrefBase: '/principles',
    fetch: async orgId => (await db.select({
      id: principles.id, name: principles.name, status: principles.status, principleType: principles.principleType,
    }).from(principles).where(eq(principles.organizationId, orgId)))
      .map(r => ({ ...r, context: r.principleType })),
  },
  {
    key: 'glossary', label: 'Glossary Terms', assignmentKey: 'glossary', hrefBase: '/glossary',
    fetch: async orgId => (await db.select({
      id: glossaryTerms.id, name: glossaryTerms.term, status: glossaryTerms.status, domain: glossaryTerms.domain,
    }).from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId)))
      .map(r => ({ ...r, context: r.domain, nearGroupKey: r.domain ?? '' })),
  },
  {
    key: 'data-entities', label: 'Data Entities', assignmentKey: 'data_entity', hrefBase: '/data', listOnly: true,
    fetch: async orgId => db.select({
      id: dataEntities.id, name: dataEntities.name, status: dataEntities.status,
    }).from(dataEntities).where(eq(dataEntities.organizationId, orgId)),
  },
  {
    key: 'data-attributes', label: 'Data Attributes', hrefBase: '/data', listOnly: true,
    fetch: async orgId => db.select({
      id: dataAttributes.id, name: dataAttributes.name, status: dataAttributes.status,
    }).from(dataAttributes).where(eq(dataAttributes.organizationId, orgId)),
  },
  {
    key: 'data-relationships', label: 'Data Relationships', hrefBase: '/data', listOnly: true,
    fetch: async orgId => db.select({
      id: dataLinks.id, name: dataLinks.name, status: dataLinks.status,
    }).from(dataLinks).where(eq(dataLinks.organizationId, orgId)),
  },
  {
    key: 'data-business-keys', label: 'Data Business Keys', hrefBase: '/data', listOnly: true,
    fetch: async orgId => db.select({
      id: dataBusinessKeys.id, name: dataBusinessKeys.name, status: dataBusinessKeys.status,
    }).from(dataBusinessKeys).where(eq(dataBusinessKeys.organizationId, orgId)),
  },
]

export async function getRepositoryDuplicateReport(orgId: string): Promise<DuplicateReportSection[]> {
  const sections: DuplicateReportSection[] = []

  // entityType:entityId → display name, for assignment-conflict context.
  const entityNames = new Map<string, string>()

  // ── Standard entity sections ────────────────────────────────────────────
  for (const source of STANDARD_SOURCES) {
    const rows = await source.fetch(orgId)
    if (source.assignmentKey) {
      for (const r of rows) entityNames.set(`${source.assignmentKey}:${r.id}`, r.name)
    }
    const records: DuplicateRecord[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status ?? null,
      context: r.context ?? null,
      nearGroupKey: r.nearGroupKey ?? '',
      href: source.listOnly ? source.hrefBase : `${source.hrefBase}/${r.id}`,
    }))
    sections.push({
      key: source.key,
      label: source.label,
      scanned: rows.length,
      groups: findDuplicateGroups(records),
    })
  }

  // ── Taxonomy types and values ───────────────────────────────────────────
  const terms = await db.select({
    id: taxonomyTerms.id, name: taxonomyTerms.name, parentId: taxonomyTerms.parentId,
  }).from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))

  const termById = new Map(terms.map(t => [t.id, t]))
  const types = terms.filter(t => t.parentId === null)
  const values = terms.filter(t => t.parentId !== null)
  const typeName = (id: string | null) =>
    (id !== null ? termById.get(id)?.name : null) ?? '(unknown type)'

  sections.push({
    key: 'taxonomy-types',
    label: 'Taxonomy Types',
    scanned: types.length,
    groups: findDuplicateGroups(types.map(t => ({
      id: t.id, name: t.name, href: '/taxonomy', nearGroupKey: '',
    }))),
  })

  sections.push({
    key: 'taxonomy-values',
    label: 'Taxonomy Values',
    scanned: values.length,
    // Scoped to the parent type: duplicate names across different types are
    // legitimate (e.g. "Other" under several types).
    groups: findDuplicateGroups(values.map(v => ({
      id: v.id, name: v.name, href: '/taxonomy',
      context: typeName(v.parentId), nearGroupKey: v.parentId,
    }))),
  })

  // ── Conflicting entity-taxonomy assignments ─────────────────────────────
  // Exact duplicate assignment rows are blocked by the etv_entity_term_uniq
  // index; the reviewable problem is one entity tagged with two or more
  // values OF THE SAME TYPE whose names duplicate each other (e.g. both
  // "Public Safety" and "public-safety" after an import).
  const assignments = await db.select({
    id: entityTaxonomyValues.id,
    entityType: entityTaxonomyValues.entityType,
    entityId: entityTaxonomyValues.entityId,
    taxonomyTermId: entityTaxonomyValues.taxonomyTermId,
  }).from(entityTaxonomyValues).where(eq(entityTaxonomyValues.organizationId, orgId))

  const assignmentGroups: DuplicateGroup[] = []
  const byEntity = new Map<string, typeof assignments>()
  for (const a of assignments) {
    const key = `${a.entityType}:${a.entityId}`
    const list = byEntity.get(key) ?? []
    list.push(a)
    byEntity.set(key, list)
  }

  const sourceByAssignmentKey = new Map(
    STANDARD_SOURCES.filter(s => s.assignmentKey).map(s => [s.assignmentKey!, s]),
  )

  for (const [entityKey, list] of byEntity) {
    if (list.length < 2) continue
    const [entityType, entityId] = entityKey.split(':')
    const entityLabel = entityNames.get(entityKey) ?? entityId
    const source = sourceByAssignmentKey.get(entityType)
    const href = source ? (source.listOnly ? source.hrefBase : `${source.hrefBase}/${entityId}`) : null

    // Group this entity's assigned values by their taxonomy type.
    const records: DuplicateRecord[] = list.flatMap(a => {
      const term = termById.get(a.taxonomyTermId)
      if (!term) return []
      return [{
        id: a.id,
        name: term.name,
        context: `${typeName(term.parentId)} on ${entityType} “${entityLabel}”`,
        href,
        nearGroupKey: term.parentId, // same-type values only
      }]
    })

    assignmentGroups.push(...findDuplicateGroups(records))
  }

  sections.push({
    key: 'taxonomy-assignments',
    label: 'Entity-Taxonomy Assignments',
    scanned: assignments.length,
    groups: assignmentGroups,
  })

  return sections
}
