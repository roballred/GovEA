'use server'

import { db } from '@/db/client'
import { taxonomyTerms, principles, entityTaxonomyDefinitions, entityTaxonomyValues } from '@/db/schema'
import { eq, and, isNull, inArray, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { assertOwnership } from '@/lib/federation'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')
  return session
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getTaxonomyTerms(organizationId: string) {
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.domain), asc(t.sortOrder), asc(t.name)],
  })
}

/**
 * Returns the values (children) of the "Domain" taxonomy type.
 * These are the options shown in the capability/glossary domain selects.
 * Returns an empty array if no "Domain" type has been defined yet.
 */
export async function getTaxonomyDomains(organizationId: string) {
  const domainType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(eq(t.organizationId, organizationId), isNull(t.parentId), eq(t.slug, 'domain')),
  })
  if (!domainType) return []

  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), eq(t.parentId, domainType.id)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}

/** Returns all terms for the taxonomy management page — types at top, values as children. */
export async function getTaxonomyTermsWithChildren(organizationId: string) {
  const allTerms = await db.query.taxonomyTerms.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })

  const types = allTerms.filter(t => t.parentId === null)
  const values = allTerms.filter(t => t.parentId !== null)

  return { types, values }
}

/**
 * Returns a map of taxonomy term id → count of principles using that term as their
 * principleType, for all values under the "Principle Type" taxonomy type.
 *
 * Used by the taxonomy management page to show blocking warnings before deletion.
 * Returns an empty object if the "Principle Type" type doesn't exist or has no values.
 */
export async function getPrincipleTypeValueUsage(organizationId: string): Promise<Record<string, number>> {
  const principleType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, and, isNull }) =>
      and(eq(t.organizationId, organizationId), isNull(t.parentId), eq(t.slug, 'principle-type')),
  })
  if (!principleType) return {}

  const children = await db.query.taxonomyTerms.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), eq(t.parentId, principleType.id)),
  })
  if (children.length === 0) return {}

  const slugToId = Object.fromEntries(children.map(c => [c.slug, c.id]))

  const rows = await db
    .select({ principleType: principles.principleType, total: count() })
    .from(principles)
    .where(and(
      eq(principles.organizationId, organizationId),
      inArray(principles.principleType, children.map(c => c.slug))
    ))
    .groupBy(principles.principleType)

  // Map from termId → count, defaulting to 0 for values with no principles
  const result: Record<string, number> = Object.fromEntries(children.map(c => [c.id, 0]))
  for (const row of rows) {
    const id = slugToId[row.principleType]
    if (id) result[id] = row.total
  }
  return result
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createTaxonomyTerm(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const parentId = (formData.get('parentId') as string) || null
  const sortOrder = (formData.get('sortOrder') as string)?.trim() || null

  const [entry] = await db.insert(taxonomyTerms).values({
    organizationId: orgId,
    name,
    slug: toSlug(name),
    description,
    parentId,
    sortOrder,
  }).returning()

  await writeAuditLog({
    action: 'taxonomy.create',
    entityType: 'taxonomy_term',
    entityId: entry.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, parentId },
  })
}

export async function editTaxonomyTerm(termId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const existing = await db.query.taxonomyTerms.findFirst({
    where: eq(taxonomyTerms.id, termId),
  })
  assertOwnership(existing?.organizationId, orgId)

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const sortOrder = (formData.get('sortOrder') as string)?.trim() || null

  await db.update(taxonomyTerms)
    .set({ name, slug: toSlug(name), description, sortOrder, updatedAt: new Date() })
    .where(and(eq(taxonomyTerms.id, termId), eq(taxonomyTerms.organizationId, orgId)))

  await writeAuditLog({
    action: 'taxonomy.edit',
    entityType: 'taxonomy_term',
    entityId: termId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: existing?.name },
    after: { name },
  })
}

export async function deleteTaxonomyTerm(termId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const existing = await db.query.taxonomyTerms.findFirst({
    where: eq(taxonomyTerms.id, termId),
  })
  assertOwnership(existing?.organizationId, orgId)

  // ── Principle-type safety guard ───────────────────────────────────────────
  // principles.principleType stores taxonomy slugs as plain text (no FK).
  // Deleting a principle-type value or its parent type would silently orphan
  // any principles referencing those slugs. Block deletion if any are in use.

  if (existing?.parentId !== null && existing) {
    // Deleting a value — check if its parent is the "Principle Type" type
    const parent = await db.query.taxonomyTerms.findFirst({
      where: eq(taxonomyTerms.id, existing.parentId!),
    })
    if (parent?.slug === 'principle-type') {
      const [{ total }] = await db
        .select({ total: count() })
        .from(principles)
        .where(and(eq(principles.organizationId, orgId), eq(principles.principleType, existing.slug)))
      if (total > 0) {
        throw new Error(
          `Cannot delete "${existing.name}" — ${total} principle${total !== 1 ? 's' : ''} use this type. Reassign them before deleting.`
        )
      }
    }
  }

  if (existing?.parentId === null && existing?.slug === 'principle-type') {
    // Deleting the "Principle Type" parent — check all its children
    const children = await db.query.taxonomyTerms.findMany({
      where: and(eq(taxonomyTerms.parentId, termId), eq(taxonomyTerms.organizationId, orgId)),
    })
    if (children.length > 0) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(principles)
        .where(and(
          eq(principles.organizationId, orgId),
          inArray(principles.principleType, children.map(c => c.slug))
        ))
      if (total > 0) {
        throw new Error(
          `Cannot delete "Principle Type" — ${total} principle${total !== 1 ? 's' : ''} use one of its values. Reassign them before deleting.`
        )
      }
    }
  }

  // When deleting a type, also delete its values (not promote — orphaned values are useless)
  // When deleting a value, just delete it
  if (existing?.parentId === null) {
    await db.delete(taxonomyTerms)
      .where(and(eq(taxonomyTerms.parentId, termId), eq(taxonomyTerms.organizationId, orgId)))
  }

  await db.delete(taxonomyTerms)
    .where(and(eq(taxonomyTerms.id, termId), eq(taxonomyTerms.organizationId, orgId)))

  await writeAuditLog({
    action: 'taxonomy.delete',
    entityType: 'taxonomy_term',
    entityId: termId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: existing?.name },
  })
}

/** Returns values (children) of the "Principle Type" taxonomy type. */
export async function getPrincipleTypes(organizationId: string) {
  const type = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), isNull(t.parentId), eq(t.slug, 'principle-type')),
  })
  if (!type) return []
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), eq(t.parentId, type.id)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}

/** Returns values (children) of the "Persona Type" taxonomy type. */
export async function getPersonaTypesFromTaxonomy(organizationId: string) {
  const type = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), isNull(t.parentId), eq(t.slug, 'persona-type')),
  })
  if (!type) return []
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), eq(t.parentId, type.id)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}

/** Returns values (children) of the "Persona Tag" taxonomy type. */
export async function getPersonaTagsFromTaxonomy(organizationId: string) {
  const type = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), isNull(t.parentId), eq(t.slug, 'persona-tag')),
  })
  if (!type) return []
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.organizationId, organizationId), eq(t.parentId, type.id)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}

// ── Entity Taxonomy Definitions ──────────────────────────────────────────────

/**
 * Returns definitions for a given entity type, including the type name and its values.
 * Used by create/edit forms to render dynamic taxonomy inputs.
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

export async function addEntityTaxonomyDefinition(formData: FormData) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const entityType = (formData.get('entityType') as string).trim()
  const taxonomyTypeId = (formData.get('taxonomyTypeId') as string).trim()
  const selectionMode = (formData.get('selectionMode') as string) || 'single'
  const required = formData.get('required') === 'true'
  const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10)

  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: orgId,
    entityType,
    taxonomyTypeId,
    selectionMode,
    required,
    sortOrder,
  }).onConflictDoNothing()
}

export async function removeEntityTaxonomyDefinition(definitionId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  await db.delete(entityTaxonomyDefinitions)
    .where(and(
      eq(entityTaxonomyDefinitions.id, definitionId),
      eq(entityTaxonomyDefinitions.organizationId, orgId),
    ))
}

// ── Entity Taxonomy Values ────────────────────────────────────────────────────

/** Returns selected taxonomy values for a single entity record, grouped by type. */
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
 */
export async function syncEntityTaxonomyValues(
  organizationId: string,
  entityType: string,
  entityId: string,
  termIds: string[],
) {
  await db.delete(entityTaxonomyValues)
    .where(and(
      eq(entityTaxonomyValues.organizationId, organizationId),
      eq(entityTaxonomyValues.entityType, entityType),
      eq(entityTaxonomyValues.entityId, entityId),
    ))

  if (termIds.length > 0) {
    await db.insert(entityTaxonomyValues).values(
      termIds.map(termId => ({
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

/**
 * Ad-hoc: creates a new value under the "Domain" type.
 * If the "Domain" type doesn't exist yet, it is created first.
 * Returns the name of the created value so the caller can set the field.
 */
export async function createDomainValue(name: string): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const trimmed = name.trim()

  // Find or create the "Domain" type
  let domainType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(eq(t.organizationId, orgId), isNull(t.parentId), eq(t.slug, 'domain')),
  })

  if (!domainType) {
    const [created] = await db.insert(taxonomyTerms).values({
      organizationId: orgId,
      name: 'Domain',
      slug: 'domain',
      parentId: null,
    }).returning()
    domainType = created
  }

  // Avoid duplicates (case-insensitive)
  const existing = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq, and, sql }) =>
      and(
        eq(t.organizationId, orgId),
        eq(t.parentId, domainType!.id),
        sql`lower(${t.name}) = lower(${trimmed})`
      ),
  })
  if (existing) return existing.name

  const [entry] = await db.insert(taxonomyTerms).values({
    organizationId: orgId,
    name: trimmed,
    slug: toSlug(trimmed),
    parentId: domainType.id,
  }).returning()

  await writeAuditLog({
    action: 'taxonomy.create',
    entityType: 'taxonomy_term',
    entityId: entry.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name: trimmed, parentId: domainType.id },
  })

  return entry.name
}
