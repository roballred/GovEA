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

/** Returns only top-level taxonomy terms (parentId IS NULL) — used as domain options. */
export async function getTaxonomyDomains(organizationId: string) {
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, isNull, and }) => and(eq(t.organizationId, organizationId), isNull(t.parentId)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}

/** Returns all terms for the taxonomy management page, with child counts. */
export async function getTaxonomyTermsWithChildren(organizationId: string) {
  const allTerms = await db.query.taxonomyTerms.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })

  // Separate top-level (domains) from children
  const domains = allTerms.filter(t => t.parentId === null)
  const children = allTerms.filter(t => t.parentId !== null)

  return { domains, children }
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

  // Promote children to top-level before deleting the parent
  await db.update(taxonomyTerms)
    .set({ parentId: null })
    .where(and(eq(taxonomyTerms.parentId, termId), eq(taxonomyTerms.organizationId, orgId)))

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
