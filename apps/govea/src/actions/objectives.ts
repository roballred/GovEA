'use server'

import { db } from '@/db/client'
import {
  strategicObjectives, objectiveCapabilities, objectiveValueStreams, entityTaxonomyValues,
  capabilities, valueStreams,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { ensurePublishReady } from '@/lib/publish-readiness-gate'
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

export async function getObjectives(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  return db.query.strategicObjectives.findMany({
    where: () => {
      const vis = listScopeFilter(strategicObjectives, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(strategicObjectives.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    orderBy: (o, { asc }) => [asc(o.name)],
    with: {
      organization: true,
      objectiveCapabilities: { with: { capability: true } },
      objectiveValueStreams: { with: { valueStream: true } },
      goalObjectives: { with: { goal: true } },
    },
  })
}

export async function getObjective(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Split into two queries to keep Drizzle's generated SQL aliases under
  // Postgres's 63-char NAMEDATALEN limit (#558). The deeply-nested chain
  //   strategicObjectives → objectiveCapabilities → capability
  //                       → applicationCapabilities → application
  // produces auto-generated alias names longer than 63 chars, which
  // Postgres truncates and then fails to resolve in LATERAL subqueries.
  const objective = await db.query.strategicObjectives.findFirst({
    where: (o, { eq }) => eq(o.id, id),
    with: {
      objectiveCapabilities: {
        with: { capability: true },
      },
      objectiveValueStreams: { with: { valueStream: true } },
      initiativeObjectives: { with: { initiative: true } },
    },
  })

  if (!objective) return null
  const visible = await canReadFederatedEntity(objective.organizationId, objective.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && objective.status !== 'published') return null

  // Second query: applicationCapabilities for the capabilities found above,
  // joined to their application. Grafted onto each capability below so the
  // consumer-facing shape matches the original deep `with` chain.
  const capabilityIds = objective.objectiveCapabilities.map(oc => oc.capability.id)
  const appCaps = capabilityIds.length > 0
    ? await db.query.applicationCapabilities.findMany({
        where: (ac, { inArray }) => inArray(ac.capabilityId, capabilityIds),
        with: { application: true },
      })
    : []

  const appCapsByCapId = new Map<string, typeof appCaps>()
  for (const ac of appCaps) {
    const list = appCapsByCapId.get(ac.capabilityId) ?? []
    list.push(ac)
    appCapsByCapId.set(ac.capabilityId, list)
  }

  const objectiveCapabilitiesWithApps = objective.objectiveCapabilities.map(oc => ({
    ...oc,
    capability: {
      ...oc.capability,
      applicationCapabilities: appCapsByCapId.get(oc.capability.id) ?? [],
    },
  }))

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(objective.organizationId, 'objective', id),
    getEntityTaxonomyDefinitions(objective.organizationId, 'objective'),
  ])
  return {
    ...objective,
    objectiveCapabilities: objectiveCapabilitiesWithApps,
    taxonomyValues,
    taxonomyDefinitions,
  }
}

export async function createObjective(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const successMetric = (formData.get('successMetric') as string) || null
  const timeHorizon = (formData.get('timeHorizon') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const valueStreamIds = formData.getAll('valueStreamIds') as string[]

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('objective', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [obj] = await tx.insert(strategicObjectives).values({
      name, description, successMetric, timeHorizon, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    if (capabilityIds.length > 0) {
      await tx.insert(objectiveCapabilities).values(
        capabilityIds.map(cId => ({ objectiveId: obj.id, capabilityId: cId }))
      )
    }
    if (valueStreamIds.length > 0) {
      await tx.insert(objectiveValueStreams).values(
        valueStreamIds.map(vId => ({ objectiveId: obj.id, valueStreamId: vId }))
      )
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'objective', obj.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'objective.create', entityType: 'objective', entityId: obj.id,
      userId: session.user.id, organizationId: orgId, after: { name, status },
    })
  })
}

export async function editObjective(objectiveId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const successMetric = (formData.get('successMetric') as string) || null
  const timeHorizon = (formData.get('timeHorizon') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const valueStreamIds = formData.getAll('valueStreamIds') as string[]

  const before = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, objectiveId),
  })
  assertOwnership(before?.organizationId, orgId)

  // #567 Part B — publish-readiness gate.
  const transitioningToPublished = before?.status !== 'published' && status === 'published'
  const publishReadyResult = ensurePublishReady({
    entityType: 'objective',
    formData,
    transitioningToPublished,
    acknowledged: formData.get('acknowledgePublishIncomplete') === 'on',
  })

  await db.transaction(async (tx) => {
    await tx.update(strategicObjectives).set({
      name, description, successMetric, timeHorizon, status, visibility,
      updatedBy: session.user.id, updatedAt: new Date(),
    }).where(and(eq(strategicObjectives.id, objectiveId), eq(strategicObjectives.organizationId, orgId)))

    await tx.delete(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, objectiveId))
    if (capabilityIds.length > 0) {
      await tx.insert(objectiveCapabilities).values(
        capabilityIds.map(cId => ({ objectiveId, capabilityId: cId }))
      )
    }

    await tx.delete(objectiveValueStreams).where(eq(objectiveValueStreams.objectiveId, objectiveId))
    if (valueStreamIds.length > 0) {
      await tx.insert(objectiveValueStreams).values(
        valueStreamIds.map(vId => ({ objectiveId, valueStreamId: vId }))
      )
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'objective', objectiveId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'objective.edit', entityType: 'objective', entityId: objectiveId,
      userId: session.user.id, organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status },
    })

    if (publishReadyResult.missingFields.length > 0) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_incomplete',
        entityType: 'objective',
        entityId: objectiveId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { missingFields: publishReadyResult.missingFields },
      })
    }
  })
}

export async function deleteObjective(objectiveId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, objectiveId),
  })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'objective'), eq(entityTaxonomyValues.entityId, objectiveId))
    )

    await tx.delete(strategicObjectives).where(
      and(eq(strategicObjectives.id, objectiveId), eq(strategicObjectives.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'objective.delete', entityType: 'objective', entityId: objectiveId,
      userId: session.user.id, organizationId: orgId, before: { name: before?.name },
    })
  })
}

// ── CSV Import (#629) ────────────────────────────────────────────────────────

export type ObjectiveImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const VALID_OBJECTIVE_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_OBJECTIVE_VISIBILITY = new Set(['org', 'connections', 'instance'])

/**
 * Strategic Objective CSV import — #629. Mirrors the established pattern:
 *   - Two-step preview/confirm via dryRun
 *   - Case-insensitive upsert by name
 *   - Capability + Value Stream names resolve against the org's records;
 *     unknown names report as row warnings, not row failures
 *   - On upsert, both junctions (capabilities, value_streams) replaced
 *     wholesale. Goal junctions are out of this slice.
 */
export async function importObjectives(formData: FormData, dryRun = false): Promise<ObjectiveImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgCaps, orgVs] = await Promise.all([
    db.query.strategicObjectives.findMany({
      where: eq(strategicObjectives.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.valueStreams.findMany({
      where: eq(valueStreams.organizationId, orgId),
      columns: { id: true, name: true },
    }),
  ])
  const existingByName = new Map(existing.map(r => [r.name.toLowerCase(), r.id]))
  const capByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const vsByName = new Map(orgVs.map(v => [v.name.toLowerCase(), v.id]))

  type ValidRow = {
    name: string
    description: string | null
    successMetric: string | null
    timeHorizon: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    capabilityIds: string[]
    valueStreamIds: string[]
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
    if (!VALID_OBJECTIVE_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_OBJECTIVE_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`)
      skipped++; continue
    }

    const resolveList = (values: string[], lookup: Map<string, string>, label: string): string[] => {
      const ids: string[] = []
      for (const v of values) {
        const id = lookup.get(v.toLowerCase())
        if (id) ids.push(id)
        else errors.push(`Row ${rowNum}: ${label} "${v}" not found in this org — skipped`)
      }
      return ids
    }

    const capabilityIds = resolveList(splitSemicolonList(row['capabilities']), capByName, 'capability')
    const valueStreamIds = resolveList(splitSemicolonList(row['value_streams']), vsByName, 'value stream')

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      name,
      description: row['description'] || null,
      successMetric: row['success_metric'] || null,
      timeHorizon: row['time_horizon'] || null,
      status: status as ValidRow['status'],
      visibility: visibility as ValidRow['visibility'],
      capabilityIds,
      valueStreamIds,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let objectiveId = r.existingId
        if (objectiveId) {
          await tx.update(strategicObjectives).set({
            description: r.description,
            successMetric: r.successMetric,
            timeHorizon: r.timeHorizon,
            status: r.status,
            visibility: r.visibility,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(strategicObjectives.id, objectiveId), eq(strategicObjectives.organizationId, orgId)))
          await tx.delete(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, objectiveId))
          await tx.delete(objectiveValueStreams).where(eq(objectiveValueStreams.objectiveId, objectiveId))
        } else {
          const [inserted] = await tx.insert(strategicObjectives).values({
            name: r.name,
            description: r.description,
            successMetric: r.successMetric,
            timeHorizon: r.timeHorizon,
            status: r.status,
            visibility: r.visibility,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: strategicObjectives.id })
          objectiveId = inserted.id
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(objectiveCapabilities).values(
            r.capabilityIds.map(capabilityId => ({ objectiveId: objectiveId!, capabilityId }))
          )
        }
        if (r.valueStreamIds.length > 0) {
          await tx.insert(objectiveValueStreams).values(
            r.valueStreamIds.map(valueStreamId => ({ objectiveId: objectiveId!, valueStreamId }))
          )
        }
      }

      await writeAuditLog(tx, {
        action: 'objective.import',
        entityType: 'objective',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, errorCount: errors.length },
      })
    })

    revalidatePath('/objectives')
  }

  return { created, updated, skipped, errors }
}
