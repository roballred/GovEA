'use server'

import { db } from '@/db/client'
import { taxonomyTerms, principles, entityTaxonomyDefinitions, personas } from '@/db/schema'
import { eq, and, isNull, inArray, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { assertOwnership } from '@/lib/federation'
import { writeAuditLog } from '@/lib/audit'
import { ensureDomainValue } from '@/lib/ensure-domain-value'
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

/**
 * Throws a user-friendly error if a sibling taxonomy term would collide on
 * name or slug within the same (org, parent) scope — mirroring the two DB
 * unique guards in `src/db/sql/taxonomy-terms-dedup.sql`
 * (`..._org_parent_name_unique` and `..._org_parent_slug_unique`, #554/#684).
 *
 * Without this, a duplicate surfaces as a raw Postgres unique-violation stack
 * trace. `excludeId` lets edits skip the row being edited.
 *
 * Note: name and slug are checked separately because toSlug() normalises —
 * "Data Architecture" and "Data  Architecture" have distinct names but the
 * same slug, so a name-only check would let a slug collision through to the
 * DB. The slug guard is the key the recipe upsert (#671) relies on.
 */
async function assertTaxonomyTermAvailable(
  orgId: string,
  parentId: string | null,
  name: string,
  slug: string,
  excludeId?: string,
) {
  const siblings = await db.query.taxonomyTerms.findMany({
    where: (t, { eq: e, and: a, isNull: n }) =>
      parentId
        ? a(e(t.organizationId, orgId), e(t.parentId, parentId))
        : a(e(t.organizationId, orgId), n(t.parentId)),
    columns: { id: true, name: true, slug: true },
  })
  const scope = parentId ? 'this taxonomy type' : 'taxonomy types'
  for (const s of siblings) {
    if (excludeId && s.id === excludeId) continue
    if (s.name.toLowerCase() === name.toLowerCase()) {
      throw new Error(`A term named "${s.name}" already exists in ${scope}.`)
    }
    if (s.slug === slug) {
      throw new Error(`A term with the same identifier ("${slug}") already exists in ${scope}.`)
    }
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getTaxonomyTerms() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
export async function getTaxonomyDomains() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
export async function getTaxonomyTermsWithChildren() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
export async function getPrincipleTypeValueUsage(): Promise<Record<string, number>> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
  const slug = toSlug(name)

  await assertTaxonomyTermAvailable(orgId, parentId, name, slug)

  await db.transaction(async (tx) => {
    const [entry] = await tx.insert(taxonomyTerms).values({
      organizationId: orgId,
      name,
      slug,
      description,
      parentId,
      sortOrder,
    }).returning()

    await writeAuditLog(tx, {
      action: 'taxonomy.create',
      entityType: 'taxonomy_term',
      entityId: entry.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, parentId },
    })
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
  const slug = toSlug(name)

  await assertTaxonomyTermAvailable(orgId, existing?.parentId ?? null, name, slug, termId)

  await db.transaction(async (tx) => {
    await tx.update(taxonomyTerms)
      .set({ name, slug, description, sortOrder, updatedAt: new Date() })
      .where(and(eq(taxonomyTerms.id, termId), eq(taxonomyTerms.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'taxonomy.edit',
      entityType: 'taxonomy_term',
      entityId: termId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: existing?.name },
      after: { name },
    })
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

  // ── Persona-type cascade (#49) ──────────────────────────────────────────
  // personas.type stores the taxonomy term NAME as plain text (no FK), same
  // pattern as principles.principleType. Unlike principles (which BLOCKS the
  // delete when in use), the persona-type design is cascade-to-null so the
  // type is removed and the persona itself is preserved. Computed inside the
  // transaction below so the rename + audit stay atomic.
  let cascadeNullForNames: string[] = []
  if (existing) {
    if (existing.parentId !== null) {
      // Deleting a value — check if its parent is "Persona Type"
      const parent = await db.query.taxonomyTerms.findFirst({
        where: eq(taxonomyTerms.id, existing.parentId),
      })
      if (parent?.slug === 'persona-type') {
        cascadeNullForNames = [existing.name]
      }
    } else if (existing.slug === 'persona-type') {
      // Deleting the "Persona Type" parent — cascade every child's name
      const children = await db.query.taxonomyTerms.findMany({
        where: and(eq(taxonomyTerms.parentId, termId), eq(taxonomyTerms.organizationId, orgId)),
        columns: { name: true },
      })
      cascadeNullForNames = children.map(c => c.name)
    }
  }

  await db.transaction(async (tx) => {
    // Persona-type cascade: null out personas.type for affected names BEFORE
    // deleting the taxonomy rows. We use IN(...) so the cascade for "Persona
    // Type" parent deletes hits every child in a single statement. Capture
    // the affected count for the audit log so the cascade is visible.
    let personasNulledCount = 0
    if (cascadeNullForNames.length > 0) {
      const updated = await tx.update(personas)
        .set({ type: null, updatedAt: new Date() })
        .where(and(
          eq(personas.organizationId, orgId),
          inArray(personas.type, cascadeNullForNames),
        ))
        .returning({ id: personas.id })
      personasNulledCount = updated.length
    }

    // When deleting a type, also delete its values (not promote — orphaned values are useless)
    // When deleting a value, just delete it
    if (existing?.parentId === null) {
      await tx.delete(taxonomyTerms)
        .where(and(eq(taxonomyTerms.parentId, termId), eq(taxonomyTerms.organizationId, orgId)))
    }

    await tx.delete(taxonomyTerms)
      .where(and(eq(taxonomyTerms.id, termId), eq(taxonomyTerms.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'taxonomy.delete',
      entityType: 'taxonomy_term',
      entityId: termId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: existing?.name },
      // #49 — record the cascade so an audit reader can see the persona impact
      metadata: cascadeNullForNames.length > 0
        ? {
            cascade: 'personas.type → null',
            affectedNames: cascadeNullForNames,
            personasNulledCount,
          }
        : undefined,
    })
  })
}

/** Returns values (children) of the "Principle Type" taxonomy type. */
export async function getPrincipleTypes() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
export async function getPersonaTypesFromTaxonomy() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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
export async function getPersonaTagsFromTaxonomy() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!

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

// Note: getEntityTaxonomyDefinitions, getAllEntityTaxonomyDefinitions,
// getEntityTaxonomyValues, syncEntityTaxonomyValues, and
// getEntityTaxonomyValuesForMany previously lived here as exported 'use server'
// functions with no auth check. They are now in lib/entity-taxonomy-helpers.ts
// so they cannot be reached as RPC endpoints. See #427.

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

// Note: getEntityTaxonomyValues, syncEntityTaxonomyValues, and
// getEntityTaxonomyValuesForMany are now in lib/entity-taxonomy-helpers.ts.
// See #427.

/**
 * Ad-hoc: creates a new value under the "Domain" type.
 * If the "Domain" type doesn't exist yet, it is created first.
 * Returns the name of the created value so the caller can set the field.
 */
export async function createDomainValue(name: string): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  // Find or create the "Domain" type + value in one transaction so the audit
  // row is consistent with the inserted value (#416). Shared with the CSV
  // import path (#717) via ensureDomainValue.
  return db.transaction(async (tx) => ensureDomainValue(tx, orgId, name, session.user.id))
}
