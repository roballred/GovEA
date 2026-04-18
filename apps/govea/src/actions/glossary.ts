'use server'

import { db } from '@/db/client'
import { glossaryTerms, glossaryTermSources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
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

export async function getGlossaryTerms(orgId: string) {
  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.glossaryTerms.findMany({
    where: (g, { eq, or, and, inArray }) => {
      const base = eq(g.organizationId, orgId)
      const instanceWide = eq(g.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(g.organizationId, connectedOrgIds),
          inArray(g.visibility, ['connections', 'instance'])
        )
      )
    },
    with: { organization: true },
    orderBy: (g, { asc }) => [asc(g.term)],
  })
}

export async function getGlossaryTerm(id: string) {
  return db.query.glossaryTerms.findFirst({
    where: eq(glossaryTerms.id, id),
    with: {
      organization: true,
      sources: {
        orderBy: (s, { asc }) => [asc(s.name)],
      },
    },
  })
}

export async function createGlossaryTerm(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const term = formData.get('term') as string
  const definition = formData.get('definition') as string
  const definitionSource = (formData.get('definitionSource') as string) || null
  const definitionSourceUrl = (formData.get('definitionSourceUrl') as string) || null
  const domain = (formData.get('domain') as string) || null
  const notes = (formData.get('notes') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'

  const [entry] = await db.insert(glossaryTerms).values({
    term, definition, definitionSource, definitionSourceUrl,
    domain, notes, status, visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  // Insert reference sources if provided
  const sourcesJson = formData.get('sources') as string | null
  if (sourcesJson) {
    const sources: { name: string; url?: string; definition: string }[] = JSON.parse(sourcesJson)
    if (sources.length > 0) {
      await db.insert(glossaryTermSources).values(
        sources.map(s => ({ termId: entry.id, name: s.name, url: s.url ?? null, definition: s.definition }))
      )
    }
  }

  await writeAuditLog({
    action: 'glossary.create',
    entityType: 'glossary',
    entityId: entry.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { term, status, visibility },
  })
}

export async function editGlossaryTerm(termId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const term = formData.get('term') as string
  const definition = formData.get('definition') as string
  const definitionSource = (formData.get('definitionSource') as string) || null
  const definitionSourceUrl = (formData.get('definitionSourceUrl') as string) || null
  const domain = (formData.get('domain') as string) || null
  const notes = (formData.get('notes') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'

  const before = await db.query.glossaryTerms.findFirst({ where: eq(glossaryTerms.id, termId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(glossaryTerms).set({
    term, definition, definitionSource, definitionSourceUrl,
    domain, notes, status, visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(glossaryTerms.id, termId), eq(glossaryTerms.organizationId, orgId)))

  // Replace reference sources: delete all existing, re-insert
  const sourcesJson = formData.get('sources') as string | null
  if (sourcesJson !== null) {
    await db.delete(glossaryTermSources).where(eq(glossaryTermSources.termId, termId))
    const sources: { name: string; url?: string; definition: string }[] = JSON.parse(sourcesJson)
    if (sources.length > 0) {
      await db.insert(glossaryTermSources).values(
        sources.map(s => ({ termId, name: s.name, url: s.url ?? null, definition: s.definition }))
      )
    }
  }

  await writeAuditLog({
    action: 'glossary.edit',
    entityType: 'glossary',
    entityId: termId,
    userId: session.user.id,
    organizationId: orgId,
    before: { term: before?.term, status: before?.status },
    after: { term, status, visibility },
  })
}

export async function deleteGlossaryTerm(termId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.glossaryTerms.findFirst({ where: eq(glossaryTerms.id, termId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(glossaryTerms).where(
    and(eq(glossaryTerms.id, termId), eq(glossaryTerms.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'glossary.delete',
    entityType: 'glossary',
    entityId: termId,
    userId: session.user.id,
    organizationId: orgId,
    before: { term: before?.term },
  })
}
