'use server'

import { db } from '@/db/client'
import {
  initiatives, initiativeCapabilities, initiativeObjectives, initiativeApplications, entityTaxonomyValues,
  capabilities, strategicObjectives,
} from '@/db/schema'
import { eq, and, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'

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

// Viewer-visible initiative statuses — Option B decision from #202
const VIEWER_INITIATIVE_STATUSES: Array<'active' | 'proposed' | 'on-hold' | 'complete' | 'cancelled'> = ['active', 'complete']

export async function getInitiatives(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(orgId) : []

  return db.query.initiatives.findMany({
    where: () => {
      const vis = listScopeFilter(initiatives, { orgId, scope, connectedOrgIds })
      const statusFilter = isViewer ? inArray(initiatives.status, VIEWER_INITIATIVE_STATUSES) : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      initiativeCapabilities: { with: { capability: true } },
      initiativeObjectives: { with: { objective: true } },
    },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}

export async function getInitiative(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const initiative = await db.query.initiatives.findFirst({
    where: eq(initiatives.id, id),
    with: {
      initiativeCapabilities: { with: { capability: true } },
      initiativeObjectives: { with: { objective: true } },
      initiativeApplications: { with: { application: true } },
      strategyInitiatives: { with: { strategy: true } },
    },
  })

  if (!initiative) return null
  const visible = await canReadFederatedEntity(initiative.organizationId, initiative.visibility, session.user.organizationId!)
  if (!visible) return null
  // Viewer status gate — enforced in the action so all callers inherit the rule (#208)
  if (session.user.role === 'viewer' && !VIEWER_INITIATIVE_STATUSES.includes(initiative.status)) return null

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(initiative.organizationId, 'initiative', id),
    getEntityTaxonomyDefinitions(initiative.organizationId, 'initiative'),
  ])
  return { ...initiative, taxonomyValues, taxonomyDefinitions }
}

export async function createInitiative(formData: FormData) {
  const session = await requireContributor()

  const orgId = session.user.organizationId as string
  const userId = session.user.id

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('initiative', orgId, formData.get('name') as string, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [row] = await tx.insert(initiatives).values({
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      status: (formData.get('status') as 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled') || 'proposed',
      startDate: (formData.get('startDate') as string) || null,
      endDate: (formData.get('endDate') as string) || null,
      visibility: (formData.get('visibility') as 'org' | 'connections' | 'instance') || 'org',
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,
    }).returning()

    const capabilityEntries = buildCapabilityEntries(formData, row.id)
    if (capabilityEntries.length > 0) {
      await tx.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
    }

    const objectiveIds = formData.getAll('objectiveIds') as string[]
    if (objectiveIds.length > 0) {
      await tx.insert(initiativeObjectives)
        .values(objectiveIds.map(objectiveId => ({ initiativeId: row.id, objectiveId })))
        .onConflictDoNothing()
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'initiative', row.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'initiative.create',
      entityType: 'initiative',
      entityId: row.id,
      userId,
      organizationId: orgId,
      after: { name: row.name, status: row.status, visibility: row.visibility },
    })
  })
}

export async function editInitiative(id: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const before = await db.query.initiatives.findFirst({ where: eq(initiatives.id, id) })
  assertOwnership(before?.organizationId, orgId)

  const userId = session.user.id
  const name = formData.get('name') as string
  const status = (formData.get('status') as 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled') || 'proposed'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') || 'org'

  await db.transaction(async (tx) => {
    await tx.update(initiatives).set({
      name,
      description: (formData.get('description') as string) || null,
      status,
      startDate: (formData.get('startDate') as string) || null,
      endDate: (formData.get('endDate') as string) || null,
      visibility,
      updatedBy: userId,
      updatedAt: new Date(),
    }).where(eq(initiatives.id, id))

    // Replace capability junctions
    await tx.delete(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, id))
    const capabilityEntries = buildCapabilityEntries(formData, id)
    if (capabilityEntries.length > 0) {
      await tx.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
    }

    // Replace objective junctions
    await tx.delete(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, id))
    const objectiveIds = formData.getAll('objectiveIds') as string[]
    if (objectiveIds.length > 0) {
      await tx.insert(initiativeObjectives)
        .values(objectiveIds.map(objectiveId => ({ initiativeId: id, objectiveId })))
        .onConflictDoNothing()
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'initiative', id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'initiative.edit',
      entityType: 'initiative',
      entityId: id,
      userId,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status, visibility },
    })
  })
}

export async function deleteInitiative(id: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.initiatives.findFirst({ where: eq(initiatives.id, id) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'initiative'), eq(entityTaxonomyValues.entityId, id))
    )

    await tx.delete(initiatives).where(eq(initiatives.id, id))

    await writeAuditLog(tx, {
      action: 'initiative.delete',
      entityType: 'initiative',
      entityId: id,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status },
    })
  })
}

// ── Related-initiatives view (#600) ──────────────────────────────────────────
//
// Surfaces other initiatives that share at least one linked capability or
// application with the given initiative. Powers the "Concurrent work" panel
// on the initiative detail page, which addresses the Business Stakeholder /
// Programme Director persona's stated need to "see whether their programme's
// intended changes overlap with other active initiatives — to find conflicts
// or opportunities to share."
//
// Two flags per related initiative:
//   - hasTimelineOverlap — both initiatives are in a "concurrent" status
//     bucket (active / proposed / on-hold). Free-text start/end dates aren't
//     parsed; this is the conservative shape, treating any concurrent
//     active/planned work as schedule-overlapping.
//   - hasLabelConflict — the same application is impacted in opposing ways
//     (one initiative `retire`s while another `build`s / `improve`s / `migrate`s).
//     This is the highest-signal early warning the seed data supports.

const CONCURRENT_STATUSES: Array<'active' | 'proposed' | 'on-hold'> = ['active', 'proposed', 'on-hold']
const RETIRE_LABEL = 'retire'
const BUILD_LABELS = ['build', 'improve', 'migrate']

function hasOpposingLabel(thisImpact: string | null, otherImpact: string | null): boolean {
  if (!thisImpact || !otherImpact) return false
  return (thisImpact === RETIRE_LABEL && BUILD_LABELS.includes(otherImpact))
      || (otherImpact === RETIRE_LABEL && BUILD_LABELS.includes(thisImpact))
}

export type RelatedInitiative = {
  id: string
  name: string
  status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled'
  startDate: string | null
  endDate: string | null
  sharedCapabilities: { id: string; name: string; thisImpact: string | null; otherImpact: string | null }[]
  sharedApplications: { id: string; name: string; thisImpact: string | null; otherImpact: string | null }[]
  hasTimelineOverlap: boolean
  hasLabelConflict: boolean
}

export async function getRelatedInitiatives(initiativeId: string): Promise<RelatedInitiative[]> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  // Load this initiative's own linked capability/application ids + impacts.
  const thisInitiative = await db.query.initiatives.findFirst({
    where: eq(initiatives.id, initiativeId),
    with: {
      initiativeCapabilities: true,
      initiativeApplications: true,
    },
  })
  if (!thisInitiative) return []

  // Same federation rule as getInitiative: caller must already be able to read
  // this initiative through canReadFederatedEntity. The detail page enforces
  // that gate before calling this action; we double-check here to avoid an
  // accidental cross-tenant disclosure if a caller forgets.
  const visible = await canReadFederatedEntity(
    thisInitiative.organizationId,
    thisInitiative.visibility,
    orgId,
  )
  if (!visible) return []

  // Viewer-status gate parity with getInitiative.
  if (isViewer && !VIEWER_INITIATIVE_STATUSES.includes(thisInitiative.status)) return []

  const thisCapabilityIds = thisInitiative.initiativeCapabilities.map(ic => ic.capabilityId)
  const thisApplicationIds = thisInitiative.initiativeApplications.map(ia => ia.applicationId)
  if (thisCapabilityIds.length === 0 && thisApplicationIds.length === 0) return []

  // Index this initiative's own impact labels for conflict detection.
  const thisCapImpactById = new Map(thisInitiative.initiativeCapabilities.map(ic => [ic.capabilityId, ic.impact ?? null]))
  const thisAppImpactById = new Map(thisInitiative.initiativeApplications.map(ia => [ia.applicationId, ia.impact ?? null]))

  // Find candidate other-initiative ids via the junctions.
  const [capJunctionRows, appJunctionRows] = await Promise.all([
    thisCapabilityIds.length > 0
      ? db.select({
            initiativeId: initiativeCapabilities.initiativeId,
            capabilityId: initiativeCapabilities.capabilityId,
            impact: initiativeCapabilities.impact,
          })
          .from(initiativeCapabilities)
          .where(and(
            inArray(initiativeCapabilities.capabilityId, thisCapabilityIds),
            ne(initiativeCapabilities.initiativeId, initiativeId),
          ))
      : Promise.resolve([]),
    thisApplicationIds.length > 0
      ? db.select({
            initiativeId: initiativeApplications.initiativeId,
            applicationId: initiativeApplications.applicationId,
            impact: initiativeApplications.impact,
          })
          .from(initiativeApplications)
          .where(and(
            inArray(initiativeApplications.applicationId, thisApplicationIds),
            ne(initiativeApplications.initiativeId, initiativeId),
          ))
      : Promise.resolve([]),
  ])

  const candidateIds = Array.from(new Set([
    ...capJunctionRows.map(r => r.initiativeId),
    ...appJunctionRows.map(r => r.initiativeId),
  ]))
  if (candidateIds.length === 0) return []

  // Load candidate initiatives, applying the same federation + viewer-status
  // gates as the list view. Visibility: same-org, instance-wide, or connected-
  // org-with-connections/instance-visibility.
  const connectedOrgIds = await getConnectedOrgIds(orgId)
  const candidates = await db.query.initiatives.findMany({
    where: (i, { eq: e, inArray: ia, and: an, or: o }) => {
      const idFilter = ia(i.id, candidateIds)
      const base = e(i.organizationId, orgId)
      const instanceWide = e(i.visibility, 'instance')
      const orgFilter = connectedOrgIds.length === 0
        ? o(base, instanceWide)
        : o(base, instanceWide, an(ia(i.organizationId, connectedOrgIds), ia(i.visibility, ['connections', 'instance'])))
      const statusFilter = isViewer ? ia(i.status, VIEWER_INITIATIVE_STATUSES) : undefined
      return statusFilter ? an(idFilter, orgFilter, statusFilter) : an(idFilter, orgFilter)
    },
    with: {
      initiativeCapabilities: { with: { capability: true } },
      initiativeApplications: { with: { application: true } },
    },
  })

  return candidates.map(c => {
    const sharedCapabilities = c.initiativeCapabilities
      .filter(ic => thisCapImpactById.has(ic.capabilityId))
      .map(ic => ({
        id: ic.capability.id,
        name: ic.capability.name,
        thisImpact: thisCapImpactById.get(ic.capabilityId) ?? null,
        otherImpact: ic.impact ?? null,
      }))

    const sharedApplications = c.initiativeApplications
      .filter(ia => thisAppImpactById.has(ia.applicationId))
      .map(ia => ({
        id: ia.application.id,
        name: ia.application.name,
        thisImpact: thisAppImpactById.get(ia.applicationId) ?? null,
        otherImpact: ia.impact ?? null,
      }))

    const hasTimelineOverlap = CONCURRENT_STATUSES.includes(thisInitiative.status as typeof CONCURRENT_STATUSES[number])
                            && CONCURRENT_STATUSES.includes(c.status as typeof CONCURRENT_STATUSES[number])

    const hasLabelConflict = sharedApplications.some(s => hasOpposingLabel(s.thisImpact, s.otherImpact))

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      sharedCapabilities,
      sharedApplications,
      hasTimelineOverlap,
      hasLabelConflict,
    }
  })
  // Sort: conflicts first, then concurrent-timeline, then everything else; by
  // name for stable ordering within each bucket.
  .sort((a, b) => {
    const rank = (r: RelatedInitiative) => r.hasLabelConflict ? 0 : r.hasTimelineOverlap ? 1 : 2
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name)
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCapabilityEntries(formData: FormData, initiativeId: string) {
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  return capabilityIds.map(capabilityId => ({
    initiativeId,
    capabilityId,
    impact: (formData.get(`impact_${capabilityId}`) as string) || null,
  }))
}

// ── CSV Import (#629) ────────────────────────────────────────────────────────

export type InitiativeImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const VALID_INITIATIVE_STATUS = new Set(['proposed', 'active', 'on-hold', 'complete', 'cancelled'])
const VALID_INITIATIVE_VISIBILITY = new Set(['org', 'connections', 'instance'])

/**
 * Initiative CSV import — #629. Same pattern as importCapabilities /
 * importPersonas / importADRs:
 *   - Two-step flow via dryRun (preview → confirm)
 *   - Case-insensitive upsert by name
 *   - Capability + Objective names resolve against the org's own records;
 *     unknown names report as row warnings, not row failures
 *   - On upsert, the two junctions (capabilities, objectives) are replaced
 *     wholesale; the application junction is left alone because the
 *     CSV does not carry impact labels — see export route for context
 */
export async function importInitiatives(formData: FormData, dryRun = false): Promise<InitiativeImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgCaps, orgObjs] = await Promise.all([
    db.query.initiatives.findMany({
      where: eq(initiatives.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.strategicObjectives.findMany({
      where: eq(strategicObjectives.organizationId, orgId),
      columns: { id: true, name: true },
    }),
  ])
  const existingByName = new Map(existing.map(r => [r.name.toLowerCase(), r.id]))
  const capByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const objByName = new Map(orgObjs.map(o => [o.name.toLowerCase(), o.id]))

  type ValidRow = {
    name: string
    description: string | null
    status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled'
    startDate: string | null
    endDate: string | null
    visibility: 'org' | 'connections' | 'instance'
    capabilityIds: string[]
    objectiveIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const status = (row['status'] || 'proposed').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()
    if (!VALID_INITIATIVE_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_INITIATIVE_VISIBILITY.has(visibility)) {
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
    const objectiveIds = resolveList(splitSemicolonList(row['objectives']), objByName, 'objective')

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      name,
      description: row['description'] || null,
      status: status as ValidRow['status'],
      startDate: row['start_date'] || null,
      endDate: row['end_date'] || null,
      visibility: visibility as ValidRow['visibility'],
      capabilityIds,
      objectiveIds,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let initiativeId = r.existingId
        if (initiativeId) {
          await tx.update(initiatives).set({
            description: r.description,
            status: r.status,
            startDate: r.startDate,
            endDate: r.endDate,
            visibility: r.visibility,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(initiatives.id, initiativeId), eq(initiatives.organizationId, orgId)))
          await tx.delete(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, initiativeId))
          await tx.delete(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, initiativeId))
        } else {
          const [inserted] = await tx.insert(initiatives).values({
            name: r.name,
            description: r.description,
            status: r.status,
            startDate: r.startDate,
            endDate: r.endDate,
            visibility: r.visibility,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: initiatives.id })
          initiativeId = inserted.id
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(initiativeCapabilities).values(
            r.capabilityIds.map(capabilityId => ({ initiativeId: initiativeId!, capabilityId, impact: null }))
          )
        }
        if (r.objectiveIds.length > 0) {
          await tx.insert(initiativeObjectives).values(
            r.objectiveIds.map(objectiveId => ({ initiativeId: initiativeId!, objectiveId }))
          )
        }
      }

      await writeAuditLog(tx, {
        action: 'initiative.import',
        entityType: 'initiative',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, errorCount: errors.length },
      })
    })

    revalidatePath('/initiatives')
  }

  return { created, updated, skipped, errors }
}
