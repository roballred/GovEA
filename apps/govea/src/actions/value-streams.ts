'use server'

import { db } from '@/db/client'
import {
  valueStreams, valueStreamStages, valueStreamStageCapabilities,
  valueStreamPersonas, valueStreamCapabilities, personas, capabilities,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
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

// ── Value Streams ─────────────────────────────────────────────────────────────

export async function getValueStreams(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  return db.query.valueStreams.findMany({
    where: () => {
      const vis = listScopeFilter(valueStreams, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(valueStreams.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    orderBy: (vs, { asc }) => [asc(vs.name)],
    with: {
      organization: true,
      stages: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: {
          stageCapabilities: {
            with: { capability: true },
          },
        },
      },
    },
  })
}

export async function getValueStream(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const valueStream = await db.query.valueStreams.findFirst({
    where: (vs, { eq }) => eq(vs.id, id),
    with: {
      stages: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: {
          stageCapabilities: {
            with: { capability: true },
          },
        },
      },
      valueStreamPersonas: { with: { persona: true } },
      valueStreamCapabilities: { with: { capability: true } },
      objectiveValueStreams: { with: { objective: true } },
      strategyValueStreams: { with: { strategy: true } },
    },
  })

  if (!valueStream) return null
  const visible = await canReadFederatedEntity(valueStream.organizationId, valueStream.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && valueStream.status !== 'published') return null
  return valueStream
}

export async function createValueStream(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valueItem = (formData.get('valueItem') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'

  await db.transaction(async (tx) => {
    const [vs] = await tx.insert(valueStreams).values({
      name,
      description,
      valueItem,
      status,
      visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    await writeAuditLog(tx, {
      action: 'value_stream.create',
      entityType: 'value_stream',
      entityId: vs.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, status },
    })
  })
}

export async function editValueStream(valueStreamId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valueItem = (formData.get('valueItem') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'

  const before = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })

  await db.transaction(async (tx) => {
    await tx.update(valueStreams).set({
      name,
      description,
      valueItem,
      status,
      visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'value_stream.edit',
      entityType: 'value_stream',
      entityId: valueStreamId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status },
    })
  })
}

export async function deleteValueStream(valueStreamId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })

  await db.transaction(async (tx) => {
    await tx.delete(valueStreams).where(
      and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'value_stream.delete',
      entityType: 'value_stream',
      entityId: valueStreamId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name },
    })
  })
}

// ── Stages ────────────────────────────────────────────────────────────────────

export async function addStage(valueStreamId: string, name: string, description: string) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  // Verify the value stream belongs to this org
  const vs = await db.query.valueStreams.findFirst({
    where: and(eq(valueStreams.id, valueStreamId), eq(valueStreams.organizationId, orgId)),
  })
  if (!vs) throw new Error('Value stream not found')

  // Next order = current max + 1
  const existing = await db.query.valueStreamStages.findMany({
    where: eq(valueStreamStages.valueStreamId, valueStreamId),
  })
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order)) + 1 : 0

  await db.insert(valueStreamStages).values({
    valueStreamId,
    name: name.trim(),
    description: description.trim() || null,
    order: nextOrder,
  })
}

async function requireStageOwnership(stageId: string, orgId: string) {
  const stage = await db.query.valueStreamStages.findFirst({
    where: eq(valueStreamStages.id, stageId),
    with: { valueStream: true },
  })
  if (!stage) throw new Error('Stage not found')
  assertOwnership(stage.valueStream.organizationId, orgId)
  return stage
}

export async function editStage(stageId: string, name: string, description: string) {
  const session = await requireContributor()
  await requireStageOwnership(stageId, session.user.organizationId!)

  await db.update(valueStreamStages).set({
    name: name.trim(),
    description: description.trim() || null,
  }).where(eq(valueStreamStages.id, stageId))
}

export async function deleteStage(stageId: string) {
  const session = await requireContributor()
  await requireStageOwnership(stageId, session.user.organizationId!)
  await db.delete(valueStreamStages).where(eq(valueStreamStages.id, stageId))
}

export async function moveStage(stageId: string, direction: 'up' | 'down') {
  const session = await requireContributor()

  const stage = await db.query.valueStreamStages.findFirst({
    where: eq(valueStreamStages.id, stageId),
    with: { valueStream: true },
  })
  if (!stage) return
  assertOwnership(stage.valueStream.organizationId, session.user.organizationId!)

  const siblings = await db.query.valueStreamStages.findMany({
    where: eq(valueStreamStages.valueStreamId, stage.valueStream.id),
    orderBy: (s, { asc }) => [asc(s.order)],
  })

  const idx = siblings.findIndex(s => s.id === stageId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= siblings.length) return

  const swapStage = siblings[swapIdx]

  await db.update(valueStreamStages)
    .set({ order: swapStage.order })
    .where(eq(valueStreamStages.id, stageId))

  await db.update(valueStreamStages)
    .set({ order: stage.order })
    .where(eq(valueStreamStages.id, swapStage.id))
}

// ── Stage Capabilities ────────────────────────────────────────────────────────

export async function addCapabilityToStage(stageId: string, capabilityId: string) {
  const session = await requireContributor()
  await requireStageOwnership(stageId, session.user.organizationId!)
  await db.insert(valueStreamStageCapabilities)
    .values({ stageId, capabilityId })
    .onConflictDoNothing()
}

export async function removeCapabilityFromStage(stageId: string, capabilityId: string) {
  const session = await requireContributor()
  await requireStageOwnership(stageId, session.user.organizationId!)
  await db.delete(valueStreamStageCapabilities).where(
    and(
      eq(valueStreamStageCapabilities.stageId, stageId),
      eq(valueStreamStageCapabilities.capabilityId, capabilityId)
    )
  )
}

// ── CSV import (#748) ───────────────────────────────────────────────────────
// `name` is the case-insensitive upsert key. `personas` and `capabilities`
// (stream-level) resolve names within the caller's org. `stages` is a pipe-
// separated, ordered list — each `Stage name: Cap A, Cap B` (capability suffix
// optional) — round-tripping the export encoding. Unknown names are row
// warnings, not failures. `dryRun` writes nothing.

export type ValueStreamImportResult = { created: number; updated: number; skipped: number; errors: string[] }

const VALID_VS_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_VS_VISIBILITY = new Set(['org', 'connections', 'instance'])

type ParsedStage = { name: string; capabilityIds: string[] }

export async function importValueStreams(formData: FormData, dryRun = false): Promise<ValueStreamImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }
  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgPersonas, orgCaps] = await Promise.all([
    db.query.valueStreams.findMany({ where: eq(valueStreams.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.personas.findMany({ where: eq(personas.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.capabilities.findMany({ where: eq(capabilities.organizationId, orgId), columns: { id: true, name: true } }),
  ])
  const existingByName = new Map(existing.map(v => [v.name.toLowerCase(), v.id]))
  const personaIdByName = new Map(orgPersonas.map(p => [p.name.toLowerCase(), p.id]))
  const capIdByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))

  type ValidRow = {
    name: string
    description: string | null
    valueItem: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    personaIds: string[]
    capabilityIds: string[]
    stages: ParsedStage[]
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
    if (!VALID_VS_STATUS.has(status)) { errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue }
    if (!VALID_VS_VISIBILITY.has(visibility)) { errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue }

    const resolveCaps = (names: string[]): string[] => {
      const ids: string[] = []
      for (const n of names) {
        const id = capIdByName.get(n.trim().toLowerCase())
        if (id) ids.push(id)
        else errors.push(`Row ${rowNum}: capability "${n.trim()}" not found in this org — skipped`)
      }
      return ids
    }

    const personaIds: string[] = []
    for (const n of splitSemicolonList(row['personas'])) {
      const id = personaIdByName.get(n.toLowerCase())
      if (id) personaIds.push(id)
      else errors.push(`Row ${rowNum}: persona "${n}" not found in this org — skipped`)
    }

    // Parse ordered stages: "Stage A: Cap1, Cap2 | Stage B".
    const stages: ParsedStage[] = []
    for (const part of (row['stages'] ?? '').split('|').map(s => s.trim()).filter(Boolean)) {
      const colon = part.indexOf(':')
      const stageName = (colon === -1 ? part : part.slice(0, colon)).trim()
      if (!stageName) continue
      const capNames = colon === -1 ? [] : part.slice(colon + 1).split(',').map(s => s.trim()).filter(Boolean)
      stages.push({ name: stageName, capabilityIds: [...new Set(resolveCaps(capNames))] })
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++
    validRows.push({
      name,
      description: row['description'] || null,
      valueItem: row['value_item'] || null,
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      personaIds: [...new Set(personaIds)],
      capabilityIds: [...new Set(resolveCaps(splitSemicolonList(row['capabilities'])))],
      stages,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let vsId = r.existingId
        if (vsId) {
          await tx.update(valueStreams).set({
            description: r.description, valueItem: r.valueItem, status: r.status, visibility: r.visibility,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(valueStreams.id, vsId), eq(valueStreams.organizationId, orgId)))
          await tx.delete(valueStreamPersonas).where(eq(valueStreamPersonas.valueStreamId, vsId))
          await tx.delete(valueStreamCapabilities).where(eq(valueStreamCapabilities.valueStreamId, vsId))
          // Stage rows cascade-delete their stage capabilities (FK onDelete).
          await tx.delete(valueStreamStages).where(eq(valueStreamStages.valueStreamId, vsId))
        } else {
          const [inserted] = await tx.insert(valueStreams).values({
            name: r.name, description: r.description, valueItem: r.valueItem, status: r.status, visibility: r.visibility,
            organizationId: orgId, createdBy: session.user.id, updatedBy: session.user.id,
          }).returning({ id: valueStreams.id })
          vsId = inserted.id
        }
        if (r.personaIds.length > 0) {
          await tx.insert(valueStreamPersonas).values(r.personaIds.map(personaId => ({ valueStreamId: vsId!, personaId })))
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(valueStreamCapabilities).values(r.capabilityIds.map(capabilityId => ({ valueStreamId: vsId!, capabilityId })))
        }
        for (const [order, stage] of r.stages.entries()) {
          const [insertedStage] = await tx.insert(valueStreamStages)
            .values({ valueStreamId: vsId!, name: stage.name, order })
            .returning({ id: valueStreamStages.id })
          if (stage.capabilityIds.length > 0) {
            await tx.insert(valueStreamStageCapabilities).values(
              stage.capabilityIds.map(capabilityId => ({ stageId: insertedStage.id, capabilityId }))
            )
          }
        }
      }

      await writeAuditLog(tx, {
        action: 'value_stream.import', entityType: 'value_stream', entityId: orgId,
        userId: session.user.id, organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
