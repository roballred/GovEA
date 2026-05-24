import { db } from '@/db/client'
import { entityTaxonomyValues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Structural type accepting either the top-level db client or a Drizzle tx
 * handle. Used by mutating helpers so they can participate in the caller's
 * transaction (#416).
 */
type DBOrTx = Pick<typeof db, 'delete' | 'insert'>

// Internal helpers used by mutations and detail-page reads in actions/capabilities.ts,
// actions/personas.ts, actions/applications.ts, actions/objectives.ts,
// actions/initiatives.ts, actions/principles.ts, actions/services.ts, actions/adrs.ts,
// and a handful of admin pages. They live in lib/ — not actions/ — so they cannot be
// reached as 'use server' RPC endpoints. Each caller is itself authenticated; these
// helpers trust that the caller has already validated the session and ownership of
// the entity in question.
//
// History: previously these were exported from actions/taxonomy.ts with no auth check,
// making them callable by any authenticated user with any organizationId. See #427.

// ── Entity Taxonomy Definitions ──────────────────────────────────────────────

/**
 * Returns definitions for a given entity type, including the type name and its values.
 * Used by create/edit forms to render dynamic taxonomy inputs.
 *
 * Caller MUST pass an organizationId derived from the actor's session.
 */
export async function getEntityTaxonomyDefinitions(organizationId: string, entityType: string) {
  const defs = await db.query.entityTaxonomyDefinitions.findMany({
    where: (d, { eq, and }) =>
      and(eq(d.organizationId, organizationId), eq(d.entityType, entityType)),
    orderBy: (d, { asc }) => [asc(d.sortOrder)],
  })

  if (defs.length === 0) return []

  const typeIds = defs.map(d => d.taxonomyTypeId)
  const types = await db.query.taxonomyTerms.findMany({
    where: (t, { inArray }) => inArray(t.id, typeIds),
  })
  const typeMap = Object.fromEntries(types.map(t => [t.id, t]))

  const values = await db.query.taxonomyTerms.findMany({
    where: (t, { eq, and, inArray }) =>
      and(eq(t.organizationId, organizationId), inArray(t.parentId, typeIds)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })

  return defs.map(def => ({
    ...def,
    typeName: typeMap[def.taxonomyTypeId]?.name ?? '',
    typeSlug: typeMap[def.taxonomyTypeId]?.slug ?? '',
    values: values.filter(v => v.parentId === def.taxonomyTypeId),
  }))
}

/**
 * Returns all definitions grouped by entity type, with type names.
 * Used by the taxonomy admin page to show which types are wired to which entity types.
 *
 * Caller MUST pass an organizationId derived from the actor's session.
 */
export async function getAllEntityTaxonomyDefinitions(organizationId: string) {
  const defs = await db.query.entityTaxonomyDefinitions.findMany({
    where: (d, { eq }) => eq(d.organizationId, organizationId),
    orderBy: (d, { asc }) => [asc(d.entityType), asc(d.sortOrder)],
  })

  if (defs.length === 0) return []

  const typeIds = [...new Set(defs.map(d => d.taxonomyTypeId))]
  const types = await db.query.taxonomyTerms.findMany({
    where: (t, { inArray }) => inArray(t.id, typeIds),
  })
  const typeMap = Object.fromEntries(types.map(t => [t.id, t]))

  return defs.map(def => ({
    ...def,
    typeName: typeMap[def.taxonomyTypeId]?.name ?? '',
    typeSlug: typeMap[def.taxonomyTypeId]?.slug ?? '',
  }))
}

// ── Entity Taxonomy Values ────────────────────────────────────────────────────

/**
 * Returns selected taxonomy values for a single entity record, grouped by type.
 *
 * Caller MUST pass an organizationId derived from the actor's session, and have
 * already verified that the entity belongs to that org (or is federated-readable).
 */
export async function getEntityTaxonomyValues(organizationId: string, entityType: string, entityId: string) {
  const rows = await db.query.entityTaxonomyValues.findMany({
    where: (v, { eq, and }) =>
      and(
        eq(v.organizationId, organizationId),
        eq(v.entityType, entityType),
        eq(v.entityId, entityId),
      ),
  })
  return rows
}

/**
 * Replaces all taxonomy values for an entity record.
 * Deletes current selections and inserts the new set atomically.
 *
 * Caller MUST pass an organizationId derived from the actor's session, and have
 * already verified write authorization on the entity.
 *
 * Pass the caller's transaction handle as `tx` so this helper participates in
 * the same transaction as the surrounding mutation and audit write (#416).
 */
// Optional single-select taxonomy fields render an empty `<option value="">`
// for the "— None —" case. When the form submits, `formData.getAll(...)` for
// that field includes an empty string. Without filtering, the empty string
// reaches the DB as a `uuid` column value and Postgres throws
// `invalid input syntax for type uuid: ""` (#631). Also defends against
// whitespace-only values in case of caller-side trimming bugs.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sanitizeTaxonomyTermIds(termIds: string[]): string[] {
  return termIds
    .map(id => id.trim())
    .filter(id => UUID_REGEX.test(id))
}

export async function syncEntityTaxonomyValues(
  tx: DBOrTx,
  organizationId: string,
  entityType: string,
  entityId: string,
  termIds: string[],
) {
  await tx.delete(entityTaxonomyValues)
    .where(and(
      eq(entityTaxonomyValues.organizationId, organizationId),
      eq(entityTaxonomyValues.entityType, entityType),
      eq(entityTaxonomyValues.entityId, entityId),
    ))

  const validTermIds = sanitizeTaxonomyTermIds(termIds)
  if (validTermIds.length > 0) {
    await tx.insert(entityTaxonomyValues).values(
      validTermIds.map(termId => ({
        organizationId,
        entityType,
        entityId,
        taxonomyTermId: termId,
      }))
    )
  }
}

/**
 * Returns taxonomy values for multiple entity records of the same type.
 * Returns a map of entityId → array of term rows.
 *
 * Caller MUST pass an organizationId derived from the actor's session.
 */
export async function getEntityTaxonomyValuesForMany(
  organizationId: string,
  entityType: string,
  entityIds: string[],
): Promise<Record<string, typeof entityTaxonomyValues.$inferSelect[]>> {
  if (entityIds.length === 0) return {}

  const rows = await db.query.entityTaxonomyValues.findMany({
    where: (v, { eq, and, inArray }) =>
      and(
        eq(v.organizationId, organizationId),
        eq(v.entityType, entityType),
        inArray(v.entityId, entityIds),
      ),
  })

  const result: Record<string, typeof entityTaxonomyValues.$inferSelect[]> = {}
  for (const row of rows) {
    if (!result[row.entityId]) result[row.entityId] = []
    result[row.entityId].push(row)
  }
  return result
}
