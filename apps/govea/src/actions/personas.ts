'use server'

import { db } from '@/db/client'
import { personas, personaTags } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { ensurePublishReady } from '@/lib/publish-readiness-gate'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { flagLinksForVisibilityDrop, clearLinksFlag } from '@/lib/cross-org-link-helpers'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { taxonomyTerms } from '@/db/schema'

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

// ── Personas ──────────────────────────────────────────────────────────────────

export async function getPersona(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const persona = await db.query.personas.findFirst({
    where: eq(personas.id, id),
    with: {
      organization: true,
      personaTags: { with: { tag: true } },
      capabilityPersonas: { with: { capability: true } },
      valueStreamPersonas: { with: { valueStream: true } },
    },
  })

  if (!persona) return null
  const visible = await canReadFederatedEntity(persona.organizationId, persona.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && persona.status !== 'published') return null
  return persona
}

export async function getPersonas(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  return db.query.personas.findMany({
    where: () => {
      const vis = listScopeFilter(personas, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(personas.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    orderBy: (p, { asc }) => [asc(p.name)],
    with: {
      organization: true,
      personaTags: {
        with: { tag: true },
      },
    },
  })
}

export async function createPersona(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const type = (formData.get('type') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const tagIds = formData.getAll('tagIds') as string[]

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('persona', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [persona] = await tx.insert(personas).values({
      name,
      description,
      type,
      status,
      visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    if (tagIds.length > 0) {
      await tx.insert(personaTags).values(
        tagIds.map(tagId => ({ personaId: persona.id, tagId }))
      )
    }

    await writeAuditLog(tx, {
      action: 'persona.create',
      entityType: 'persona',
      entityId: persona.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, description, type, status, tagIds },
    })
  })
}

export async function editPersona(personaId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const type = (formData.get('type') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const tagIds = formData.getAll('tagIds') as string[]

  const before = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(before?.organizationId, orgId)

  // #567 Part B — publish-readiness gate.
  const transitioningToPublished = before?.status !== 'published' && status === 'published'
  const publishReadyResult = ensurePublishReady({
    entityType: 'persona',
    formData,
    transitioningToPublished,
    acknowledged: formData.get('acknowledgePublishIncomplete') === 'on',
  })

  await db.transaction(async (tx) => {
    await tx.update(personas).set({
      name,
      description,
      type,
      status,
      visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(personas.id, personaId), eq(personas.organizationId, orgId)))

    // Replace junction rows
    await tx.delete(personaTags).where(eq(personaTags.personaId, personaId))
    if (tagIds.length > 0) {
      await tx.insert(personaTags).values(
        tagIds.map(tagId => ({ personaId, tagId }))
      )
    }

    await writeAuditLog(tx, {
      action: 'persona.edit',
      entityType: 'persona',
      entityId: personaId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, description: before?.description, type: before?.type, status: before?.status },
      after: { name, description, type, status, tagIds },
    })

    if (publishReadyResult.missingFields.length > 0) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_incomplete',
        entityType: 'persona',
        entityId: personaId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { missingFields: publishReadyResult.missingFields },
      })
    }

    // Flag or clear cross-org links when visibility changes.
    const prevVis = before?.visibility
    const visDropped = (prevVis === 'connections' || prevVis === 'instance') && visibility === 'org'
    const visRaised = prevVis === 'org' && (visibility === 'connections' || visibility === 'instance')
    if (visDropped) await flagLinksForVisibilityDrop(tx, 'persona', personaId, `"${name}" visibility was restricted to org-only — this link may no longer be accessible to the other org`)
    if (visRaised)  await clearLinksFlag(tx, 'persona', personaId)
  })
}

export async function deletePersona(personaId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(personas).where(
      and(eq(personas.id, personaId), eq(personas.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'persona.delete',
      entityType: 'persona',
      entityId: personaId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name },
    })
  })
}

export async function markPersonaReviewed(personaId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.update(personas).set({
      lastReviewedBy: session.user.id,
      lastReviewedAt: now,
    }).where(and(eq(personas.id, personaId), eq(personas.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'persona.reviewed',
      entityType: 'persona',
      entityId: personaId,
      userId: session.user.id,
      organizationId: orgId,
      after: { lastReviewedAt: now.toISOString() },
    })
  })

  revalidatePath(`/personas/${personaId}`)
}

// ── CSV Import (#596) ────────────────────────────────────────────────────────

export type PersonaImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const VALID_PERSONA_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_PERSONA_VISIBILITY = new Set(['org', 'connections', 'instance'])

/**
 * Persona CSV import — #596. Same shape as importCapabilities:
 *   - Two-step flow via `dryRun` flag (preview → confirm)
 *   - Name match is case-insensitive (matches the export's upsert convention)
 *   - Tags resolve from semicolon-joined names against the "Persona Tag"
 *     taxonomy branch; unknown names report as row warnings, not row failures
 *   - On update, existing tag links are replaced wholesale (matches editPersona)
 */
export async function importPersonas(formData: FormData, dryRun = false): Promise<PersonaImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  // Pre-fetch existing personas (for upsert) and the "Persona Tag" branch
  // (children of the top-level taxonomy term whose slug is `persona-tag`).
  const existing = await db.query.personas.findMany({
    where: eq(personas.organizationId, orgId),
    columns: { id: true, name: true },
  })
  const existingByName = new Map(existing.map(p => [p.name.toLowerCase(), p.id]))

  const tagRoot = await db.query.taxonomyTerms.findFirst({
    where: and(
      eq(taxonomyTerms.organizationId, orgId),
      eq(taxonomyTerms.slug, 'persona-tag'),
    ),
    columns: { id: true },
  })
  const tagByName = new Map<string, string>()
  if (tagRoot) {
    const tags = await db.query.taxonomyTerms.findMany({
      where: and(
        eq(taxonomyTerms.organizationId, orgId),
        eq(taxonomyTerms.parentId, tagRoot.id),
      ),
      columns: { id: true, name: true },
    })
    for (const t of tags) tagByName.set(t.name.toLowerCase(), t.id)
  }

  type ValidRow = {
    name: string
    description: string | null
    type: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    tagIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const status = (row['status'] || 'draft').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()

    if (!VALID_PERSONA_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_PERSONA_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`)
      skipped++; continue
    }

    const tagIds: string[] = []
    for (const tagName of splitSemicolonList(row['tags'])) {
      const id = tagByName.get(tagName.toLowerCase())
      if (id) tagIds.push(id)
      else errors.push(`Row ${rowNum}: tag "${tagName}" not found in this org — skipped`)
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      name,
      description: row['description'] || null,
      type: row['type'] || null,
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      tagIds,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let personaId = r.existingId
        if (personaId) {
          await tx.update(personas).set({
            description: r.description,
            type: r.type,
            status: r.status,
            visibility: r.visibility,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(personas.id, personaId), eq(personas.organizationId, orgId)))
          await tx.delete(personaTags).where(eq(personaTags.personaId, personaId))
        } else {
          const [inserted] = await tx.insert(personas).values({
            name: r.name,
            description: r.description,
            type: r.type,
            status: r.status,
            visibility: r.visibility,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: personas.id })
          personaId = inserted.id
        }
        if (r.tagIds.length > 0) {
          await tx.insert(personaTags).values(
            r.tagIds.map(tagId => ({ personaId: personaId!, tagId }))
          )
        }
      }

      await writeAuditLog(tx, {
        action: 'persona.import',
        entityType: 'persona',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, errorCount: errors.length },
      })
    })

    revalidatePath('/personas')
  }

  return { created, updated, skipped, errors }
}
