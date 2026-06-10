import { db } from '@/db/client'
import { taxonomyTerms } from '@/db/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'

/**
 * Generic group-by-taxonomy-type report engine (#673 / #665 S3).
 *
 * Buckets a caller-supplied set of entities (id + display name) into the values
 * of one taxonomy type, via `entity_taxonomy_values`, and surfaces an explicit
 * "unmapped" gap set. Framework-agnostic: TOGAF Application Landscape / ADM
 * coverage are just presets that call this with specific slugs.
 *
 * The caller fetches + visibility-filters the entities (this stays pure over the
 * input set) and decides whether to render a `audience: 'framework'` type for
 * the current role — the result exposes `type.audience` so the page can enforce
 * ADR-0001/0002 (hide framework types from viewers / stakeholder views).
 *
 * Multi-select types: an entity tagged with N values appears in N groups; it is
 * counted once in `total`. Entities with no value for this type are `unmapped`.
 */
export interface EntityRef {
  id: string
  name: string
}

export interface TaxonomyGroup {
  termId: string
  termName: string
  termSlug: string
  members: EntityRef[]
}

export interface GroupByTaxonomyResult {
  type: { id: string; name: string; slug: string; audience: string | null }
  groups: TaxonomyGroup[]
  unmapped: EntityRef[]
  total: number
}

export async function groupByTaxonomyType(
  orgId: string,
  entityType: string,
  taxonomyTypeSlug: string,
  entities: EntityRef[],
): Promise<GroupByTaxonomyResult | null> {
  // Resolve the taxonomy *type* (top-level term) by stable slug.
  const [type] = await db
    .select({
      id: taxonomyTerms.id,
      name: taxonomyTerms.name,
      slug: taxonomyTerms.slug,
      audience: taxonomyTerms.audience,
    })
    .from(taxonomyTerms)
    .where(and(
      eq(taxonomyTerms.organizationId, orgId),
      isNull(taxonomyTerms.parentId),
      eq(taxonomyTerms.slug, taxonomyTypeSlug),
    ))
    .limit(1)
  if (!type) return null

  // Its child terms are the groups, in display order.
  const terms = await db
    .select({ id: taxonomyTerms.id, name: taxonomyTerms.name, slug: taxonomyTerms.slug })
    .from(taxonomyTerms)
    .where(and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.parentId, type.id)))
    .orderBy(asc(taxonomyTerms.sortOrder), asc(taxonomyTerms.name))

  const termIds = new Set(terms.map(t => t.id))
  const buckets = new Map<string, EntityRef[]>(terms.map(t => [t.id, []]))
  const unmapped: EntityRef[] = []

  const valueMap = await getEntityTaxonomyValuesForMany(orgId, entityType, entities.map(e => e.id))
  for (const entity of entities) {
    const tagged = (valueMap[entity.id] ?? [])
      .map(v => v.taxonomyTermId)
      .filter(id => termIds.has(id))
    if (tagged.length === 0) {
      unmapped.push(entity)
      continue
    }
    for (const termId of tagged) buckets.get(termId)!.push(entity)
  }

  return {
    type: { id: type.id, name: type.name, slug: type.slug, audience: type.audience ?? null },
    groups: terms.map(t => ({ termId: t.id, termName: t.name, termSlug: t.slug, members: buckets.get(t.id)! })),
    unmapped,
    total: entities.length,
  }
}

/**
 * Whether a taxonomy *type* (top-level term) with this slug exists for the org.
 * Replaces the framework-overlay module gate (#675): a framework report is
 * available iff its recipe's taxonomy is installed.
 */
export async function taxonomyTypeExists(orgId: string, slug: string): Promise<boolean> {
  const [t] = await db
    .select({ id: taxonomyTerms.id })
    .from(taxonomyTerms)
    .where(and(eq(taxonomyTerms.organizationId, orgId), isNull(taxonomyTerms.parentId), eq(taxonomyTerms.slug, slug)))
    .limit(1)
  return !!t
}
