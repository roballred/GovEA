'use server'

import { db } from '@/db/client'
import { taxonomyTerms } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
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
