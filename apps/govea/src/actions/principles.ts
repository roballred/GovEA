'use server'

import { db } from '@/db/client'
import { principles, principleAdrs, principleCapabilities, entityTaxonomyValues, capabilities, adrs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
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

type DBOrTx = Pick<typeof db, 'insert'>

async function insertJunctions(tx: DBOrTx, principleId: string, adrIds: string[], capabilityIds: string[]) {
  if (adrIds.length > 0)
    await tx.insert(principleAdrs).values(adrIds.map(adrId => ({ principleId, adrId }))).onConflictDoNothing()
  if (capabilityIds.length > 0)
    await tx.insert(principleCapabilities).values(capabilityIds.map(capabilityId => ({ principleId, capabilityId }))).onConflictDoNothing()
}

export async function getPrinciples(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(orgId) : []

  return db.query.principles.findMany({
    where: () => {
      const vis = listScopeFilter(principles, { orgId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(principles.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      principleAdrs: { with: { adr: true } },
      principleCapabilities: { with: { capability: true } },
    },
    orderBy: (p, { asc }) => [asc(p.title)],
  })
}

export async function getPrinciple(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const principle = await db.query.principles.findFirst({
    where: eq(principles.id, id),
    with: {
      organization: true,
      principleAdrs: { with: { adr: true } },
      principleCapabilities: { with: { capability: true } },
    },
  })

  if (!principle) return null
  const visible = await canReadFederatedEntity(principle.organizationId, principle.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && principle.status !== 'published') return null

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(principle.organizationId, 'principle', id),
    getEntityTaxonomyDefinitions(principle.organizationId, 'principle'),
  ])
  return { ...principle, taxonomyValues, taxonomyDefinitions }
}

export async function createPrinciple(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const title = (formData.get('title') as string) || null
  const rationale = (formData.get('rationale') as string) || null
  const implications = (formData.get('implications') as string) || null
  const principleType = (formData.get('principleType') as 'architecture' | 'data') ?? 'architecture'
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  await db.transaction(async (tx) => {
    const [principle] = await tx.insert(principles).values({
      name, description, title, rationale, implications, principleType, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    await insertJunctions(tx, principle.id, adrIds, capabilityIds)

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'principle', principle.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'principle.create',
      entityType: 'principle',
      entityId: principle.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, status, visibility },
    })
  })
}

export async function editPrinciple(principleId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const title = (formData.get('title') as string) || null
  const rationale = (formData.get('rationale') as string) || null
  const implications = (formData.get('implications') as string) || null
  const principleType = formData.get('principleType') as 'architecture' | 'data'
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.update(principles).set({
      name, description, title, rationale, implications, principleType, status, visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(principles.id, principleId), eq(principles.organizationId, orgId)))

    await tx.delete(principleAdrs).where(eq(principleAdrs.principleId, principleId))
    await tx.delete(principleCapabilities).where(eq(principleCapabilities.principleId, principleId))
    await insertJunctions(tx, principleId, adrIds, capabilityIds)

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'principle', principleId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'principle.edit',
      entityType: 'principle',
      entityId: principleId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status, visibility },
    })
  })
}

export async function deletePrinciple(principleId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'principle'), eq(entityTaxonomyValues.entityId, principleId))
    )

    await tx.delete(principles).where(
      and(eq(principles.id, principleId), eq(principles.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'principle.delete',
      entityType: 'principle',
      entityId: principleId,
      userId: session.user.id,
      organizationId: orgId,
      before: { title: before?.title },
    })
  })
}

// ── CSV import (#748) ───────────────────────────────────────────────────────
// `name` is the case-insensitive upsert key. `adrs` resolves ADR numbers and
// `capabilities` resolves capability names within the caller's org (unknown
// keys are row warnings, not failures). `dryRun` returns counts without writing.

export type PrincipleImportResult = { created: number; updated: number; skipped: number; errors: string[] }

const VALID_PRINCIPLE_TYPE = new Set(['architecture', 'data'])
const VALID_PRINCIPLE_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_PRINCIPLE_VISIBILITY = new Set(['org', 'connections', 'instance'])

export async function importPrinciples(formData: FormData, dryRun = false): Promise<PrincipleImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }
  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgCaps, orgAdrs] = await Promise.all([
    db.query.principles.findMany({ where: eq(principles.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.capabilities.findMany({ where: eq(capabilities.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.adrs.findMany({ where: eq(adrs.organizationId, orgId), columns: { id: true, number: true } }),
  ])
  const existingByName = new Map(existing.map(p => [p.name.toLowerCase(), p.id]))
  const capIdByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const adrIdByNumber = new Map(orgAdrs.map(a => [a.number.toLowerCase(), a.id]))

  type ValidRow = {
    name: string
    description: string | null
    title: string | null
    rationale: string | null
    implications: string | null
    principleType: 'architecture' | 'data'
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    capabilityIds: string[]
    adrIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const principleType = (row['principle_type'] || 'architecture').trim().toLowerCase()
    const status = (row['status'] || 'draft').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()
    if (!VALID_PRINCIPLE_TYPE.has(principleType)) { errors.push(`Row ${rowNum}: invalid principle_type "${principleType}"`); skipped++; continue }
    if (!VALID_PRINCIPLE_STATUS.has(status)) { errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue }
    if (!VALID_PRINCIPLE_VISIBILITY.has(visibility)) { errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue }

    const capabilityIds: string[] = []
    for (const capName of splitSemicolonList(row['capabilities'])) {
      const id = capIdByName.get(capName.toLowerCase())
      if (id) capabilityIds.push(id)
      else errors.push(`Row ${rowNum}: capability "${capName}" not found in this org — skipped`)
    }
    const adrIds: string[] = []
    for (const adrNum of splitSemicolonList(row['adrs'])) {
      const id = adrIdByNumber.get(adrNum.toLowerCase())
      if (id) adrIds.push(id)
      else errors.push(`Row ${rowNum}: ADR "${adrNum}" not found in this org — skipped`)
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++
    validRows.push({
      name,
      description: row['description'] || null,
      title: row['title'] || null,
      rationale: row['rationale'] || null,
      implications: row['implications'] || null,
      principleType: principleType as 'architecture' | 'data',
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      capabilityIds: [...new Set(capabilityIds)],
      adrIds: [...new Set(adrIds)],
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let principleId = r.existingId
        if (principleId) {
          await tx.update(principles).set({
            description: r.description, title: r.title, rationale: r.rationale, implications: r.implications,
            principleType: r.principleType, status: r.status, visibility: r.visibility,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(principles.id, principleId), eq(principles.organizationId, orgId)))
          await tx.delete(principleCapabilities).where(eq(principleCapabilities.principleId, principleId))
          await tx.delete(principleAdrs).where(eq(principleAdrs.principleId, principleId))
        } else {
          const [inserted] = await tx.insert(principles).values({
            name: r.name, description: r.description, title: r.title, rationale: r.rationale, implications: r.implications,
            principleType: r.principleType, status: r.status, visibility: r.visibility,
            organizationId: orgId, createdBy: session.user.id, updatedBy: session.user.id,
          }).returning({ id: principles.id })
          principleId = inserted.id
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(principleCapabilities).values(r.capabilityIds.map(capabilityId => ({ principleId: principleId!, capabilityId })))
        }
        if (r.adrIds.length > 0) {
          await tx.insert(principleAdrs).values(r.adrIds.map(adrId => ({ principleId: principleId!, adrId })))
        }
      }

      await writeAuditLog(tx, {
        action: 'principle.import', entityType: 'principle', entityId: orgId,
        userId: session.user.id, organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
