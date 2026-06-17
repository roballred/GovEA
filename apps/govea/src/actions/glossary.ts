'use server'

import { db } from '@/db/client'
import { glossaryTerms, glossaryTermSources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { redirect } from 'next/navigation'
import { validateWebUrl } from '@/lib/url'
import { parseCsv } from '@/lib/csv'
import { ensureDomainValue } from '@/lib/ensure-domain-value'

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

export async function getGlossaryTerms() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  // Glossary is shared vocabulary, not a traceability entity — it stays
  // federated by default. The #811 active-org default applies only to traceable
  // list views (capabilities, applications, services, etc.), not reference
  // content meant to be discovered across connected and instance scopes.
  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.glossaryTerms.findMany({
    where: () => {
      const vis = listScopeFilter(glossaryTerms, { orgId, scope: 'federated', connectedOrgIds })
      const statusFilter = isViewer ? eq(glossaryTerms.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      sources: { orderBy: (s, { asc }) => [asc(s.name)] },
    },
    orderBy: (g, { asc }) => [asc(g.term)],
  })
}

export async function getGlossaryTerm(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const term = await db.query.glossaryTerms.findFirst({
    where: eq(glossaryTerms.id, id),
    with: {
      organization: true,
      sources: {
        orderBy: (s, { asc }) => [asc(s.name)],
      },
    },
  })

  if (!term) return null
  const visible = await canReadFederatedEntity(term.organizationId, term.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && term.status !== 'published') return null
  return term
}

export async function createGlossaryTerm(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const term = formData.get('term') as string
  const definition = formData.get('definition') as string
  const definitionSource = (formData.get('definitionSource') as string) || null
  const definitionSourceUrl = validateWebUrl((formData.get('definitionSourceUrl') as string) || null)
  const domain = (formData.get('domain') as string) || null
  const notes = (formData.get('notes') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'

  // Parse sources outside the transaction so a JSON parse error doesn't
  // happen inside the tx callback.
  const sourcesJson = formData.get('sources') as string | null
  const parsedSources: { name: string; url?: string; definition: string }[] | null =
    sourcesJson ? JSON.parse(sourcesJson) : null

  // #566 — soft-warn on duplicate term names.
  await ensureNoDuplicateName('glossary', orgId, term, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [entry] = await tx.insert(glossaryTerms).values({
      term, definition, definitionSource, definitionSourceUrl,
      domain, notes, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    // Insert reference sources if provided — validate each URL before storage
    if (parsedSources && parsedSources.length > 0) {
      await tx.insert(glossaryTermSources).values(
        parsedSources.map(s => ({ termId: entry.id, name: s.name, url: validateWebUrl(s.url ?? null), definition: s.definition }))
      )
    }

    await writeAuditLog(tx, {
      action: 'glossary.create',
      entityType: 'glossary',
      entityId: entry.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { term, status, visibility, definitionSource },
    })
  })
}

export async function editGlossaryTerm(termId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const term = formData.get('term') as string
  const definition = formData.get('definition') as string
  const definitionSource = (formData.get('definitionSource') as string) || null
  const definitionSourceUrl = validateWebUrl((formData.get('definitionSourceUrl') as string) || null)
  const domain = (formData.get('domain') as string) || null
  const notes = (formData.get('notes') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'

  const before = await db.query.glossaryTerms.findFirst({ where: eq(glossaryTerms.id, termId) })
  assertOwnership(before?.organizationId, orgId)

  const sourcesJson = formData.get('sources') as string | null
  const parsedSources: { name: string; url?: string; definition: string }[] | null =
    sourcesJson !== null ? JSON.parse(sourcesJson) : null

  await db.transaction(async (tx) => {
    await tx.update(glossaryTerms).set({
      term, definition, definitionSource, definitionSourceUrl,
      domain, notes, status, visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(glossaryTerms.id, termId), eq(glossaryTerms.organizationId, orgId)))

    // Replace reference sources: delete all existing, re-insert — validate each URL
    if (parsedSources !== null) {
      await tx.delete(glossaryTermSources).where(eq(glossaryTermSources.termId, termId))
      if (parsedSources.length > 0) {
        await tx.insert(glossaryTermSources).values(
          parsedSources.map(s => ({ termId, name: s.name, url: validateWebUrl(s.url ?? null), definition: s.definition }))
        )
      }
    }

    await writeAuditLog(tx, {
      action: 'glossary.edit',
      entityType: 'glossary',
      entityId: termId,
      userId: session.user.id,
      organizationId: orgId,
      before: { term: before?.term, status: before?.status, definitionSource: before?.definitionSource },
      after: { term, status, visibility, definitionSource },
    })
  })
}

export async function deleteGlossaryTerm(termId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.glossaryTerms.findFirst({ where: eq(glossaryTerms.id, termId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(glossaryTerms).where(
      and(eq(glossaryTerms.id, termId), eq(glossaryTerms.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'glossary.delete',
      entityType: 'glossary',
      entityId: termId,
      userId: session.user.id,
      organizationId: orgId,
      before: { term: before?.term },
    })
  })
}

// ── CSV import (#721) ──────────────────────────────────────────────────────
// Mirrors importCapabilities (#596): `term` is the case-insensitive upsert key;
// all rows are pre-validated before the transaction; `dryRun` returns counts +
// errors without writing. An imported `domain` creates the "Domain" taxonomy
// value (shared ensureDomainValue, #717) and is normalized to the canonical
// name — no orphaned domains.

export type GlossaryImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const VALID_GLOSSARY_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_GLOSSARY_VISIBILITY = new Set(['org', 'connections', 'instance'])

export async function importGlossary(formData: FormData, dryRun = false): Promise<GlossaryImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const existing = await db.query.glossaryTerms.findMany({
    where: eq(glossaryTerms.organizationId, orgId),
    columns: { id: true, term: true },
  })
  const existingByTerm = new Map(existing.map(t => [t.term.toLowerCase(), t.id]))

  type ValidRow = {
    term: string
    definition: string
    domain: string | null
    notes: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2 // 1-indexed + header row
    const term = row['term']?.trim()
    if (!term) { errors.push(`Row ${rowNum}: missing required field "term"`); skipped++; continue }

    const definition = row['definition']?.trim()
    if (!definition) { errors.push(`Row ${rowNum}: missing required field "definition"`); skipped++; continue }

    const status = (row['status'] || 'draft').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()
    if (!VALID_GLOSSARY_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue
    }
    if (!VALID_GLOSSARY_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue
    }

    const existingId = existingByTerm.get(term.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      term,
      definition,
      domain: row['domain']?.trim() || null,
      notes: row['notes']?.trim() || null,
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      // Ensure each imported domain is a "Domain" taxonomy value, then normalize
      // each row's domain to the canonical name (#717).
      const canonicalDomain = new Map<string, string>()
      for (const r of validRows) {
        if (r.domain && !canonicalDomain.has(r.domain)) {
          canonicalDomain.set(r.domain, await ensureDomainValue(tx, orgId, r.domain, session.user.id))
        }
      }

      for (const r of validRows) {
        const domain = r.domain ? canonicalDomain.get(r.domain) ?? r.domain : null
        if (r.existingId) {
          await tx.update(glossaryTerms).set({
            definition: r.definition, domain, notes: r.notes,
            status: r.status, visibility: r.visibility,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(glossaryTerms.id, r.existingId), eq(glossaryTerms.organizationId, orgId)))
        } else {
          await tx.insert(glossaryTerms).values({
            organizationId: orgId, term: r.term, definition: r.definition, domain, notes: r.notes,
            status: r.status, visibility: r.visibility,
            createdBy: session.user.id, updatedBy: session.user.id,
          })
        }
      }

      await writeAuditLog(tx, {
        action: 'glossary.import',
        entityType: 'glossary',
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
