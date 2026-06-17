'use server'

import { db } from '@/db/client'
import {
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives, entityTaxonomyValues,
  capabilities, applications, initiatives, strategicObjectives,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { notifySubscribers, notifyDomainOwner } from './notifications'
import { ensurePublishOpenDebtAck } from '@/lib/debt-publish-gate'
import { ensureDomainOwnerOverwriteAck, assertUserInOrg } from '@/lib/domain-owner-gate'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { parseCsv, splitSemicolonList } from '@/lib/csv'

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

// Viewer-visible ADR status — Option B decision from #202
const VIEWER_ADR_STATUS = 'accepted' as const

export async function getADRs(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(orgId) : []

  return db.query.adrs.findMany({
    where: () => {
      const vis = listScopeFilter(adrs, { orgId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(adrs.status, VIEWER_ADR_STATUS) : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      supersededByAdr: true,
      adrCapabilities: { with: { capability: true } },
      adrApplications: { with: { application: true } },
      adrInitiatives: { with: { initiative: true } },
      adrObjectives: { with: { objective: true } },
    },
    orderBy: (a, { asc }) => [asc(a.number)],
  })
}

export async function getADR(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const adr = await db.query.adrs.findFirst({
    where: eq(adrs.id, id),
    with: {
      organization: true,
      supersededByAdr: true,
      adrCapabilities: { with: { capability: true } },
      adrApplications: { with: { application: true } },
      adrInitiatives: { with: { initiative: true } },
      adrObjectives: { with: { objective: true } },
      principleAdrs: { with: { principle: true } },
    },
  })

  if (!adr) return null
  const visible = await canReadFederatedEntity(adr.organizationId, adr.visibility, session.user.organizationId!)
  if (!visible) return null
  // Viewer status gate — enforced in the action so all callers inherit the rule (#208)
  if (session.user.role === 'viewer' && adr.status !== VIEWER_ADR_STATUS) return null

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(adr.organizationId, 'adr', id),
    getEntityTaxonomyDefinitions(adr.organizationId, 'adr'),
  ])
  return { ...adr, taxonomyValues, taxonomyDefinitions }
}

export async function createADR(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const number = formData.get('number') as string
  const title = formData.get('title') as string
  const context = (formData.get('context') as string) || null
  const decision = (formData.get('decision') as string) || null
  const consequences = (formData.get('consequences') as string) || null
  const status = (formData.get('status') as 'proposed' | 'accepted' | 'deprecated' | 'superseded') ?? 'proposed'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const supersededBy = (formData.get('supersededBy') as string) || null

  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const applicationIds = formData.getAll('applicationIds') as string[]
  const initiativeIds = formData.getAll('initiativeIds') as string[]
  const objectiveIds = formData.getAll('objectiveIds') as string[]

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  await db.transaction(async (tx) => {
    const [adr] = await tx.insert(adrs).values({
      number,
      title,
      context,
      decision,
      consequences,
      status,
      visibility,
      supersededBy,
      domainOwnerUserId,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    await insertJunctions(tx, adr.id, capabilityIds, applicationIds, initiativeIds, objectiveIds)

    await syncEntityTaxonomyValues(tx, orgId, 'adr', adr.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'adr.create',
      entityType: 'adr',
      entityId: adr.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { number, title, status, visibility },
    })
  })
}

export async function editADR(id: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const number = formData.get('number') as string
  const title = formData.get('title') as string
  const context = (formData.get('context') as string) || null
  const decision = (formData.get('decision') as string) || null
  const consequences = (formData.get('consequences') as string) || null
  const status = formData.get('status') as 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const supersededBy = (formData.get('supersededBy') as string) || null

  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const applicationIds = formData.getAll('applicationIds') as string[]
  const initiativeIds = formData.getAll('initiativeIds') as string[]
  const objectiveIds = formData.getAll('objectiveIds') as string[]

  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  const before = await db.query.adrs.findFirst({ where: eq(adrs.id, id) })
  assertOwnership(before?.organizationId, orgId)

  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]

  // Domain-owner overwrite gate (#581) — see capabilities.ts for context.
  const acknowledgeOverwrite = formData.get('acknowledgeOverwrite') === 'on'
  const ownerAck = await ensureDomainOwnerOverwriteAck({
    beforeOwnerUserId: before?.domainOwnerUserId,
    actorUserId: session.user.id,
    acknowledged: acknowledgeOverwrite,
  })

  // Publish-time debt gate (#381 PR-3). For ADRs, "publish" = accepted.
  const transitioningToAccepted = before?.status !== 'accepted' && status === 'accepted'
  const acknowledgeOpenDebt = formData.get('acknowledgeOpenDebt') === 'on'
  const debtAck = await ensurePublishOpenDebtAck({
    entityType: 'adr',
    entityId: id,
    transitioningToPublished: transitioningToAccepted,
    acknowledged: acknowledgeOpenDebt,
  })

  await db.transaction(async (tx) => {
    await tx.update(adrs).set({
      number,
      title,
      context,
      decision,
      consequences,
      status,
      visibility,
      supersededBy,
      domainOwnerUserId,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(adrs.id, id), eq(adrs.organizationId, orgId)))

    await tx.delete(adrCapabilities).where(eq(adrCapabilities.adrId, id))
    await tx.delete(adrApplications).where(eq(adrApplications.adrId, id))
    await tx.delete(adrInitiatives).where(eq(adrInitiatives.adrId, id))
    await tx.delete(adrObjectives).where(eq(adrObjectives.adrId, id))
    await insertJunctions(tx, id, capabilityIds, applicationIds, initiativeIds, objectiveIds)

    await syncEntityTaxonomyValues(tx, orgId, 'adr', id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'adr.edit',
      entityType: 'adr',
      entityId: id,
      userId: session.user.id,
      organizationId: orgId,
      before: { number: before?.number, title: before?.title, status: before?.status },
      after: { number, title, status, visibility },
    })

    // #581 — notify subscribers of this ADR's change.
    await notifySubscribers(tx, {
      organizationId: orgId,
      entityType: 'adr',
      entityId: id,
      action: 'adr.edit',
      actorUserId: session.user.id,
      summary: `${session.user.name ?? session.user.email ?? 'Someone'} updated ${title}`,
    })

    // #581 follow-up: domain-owner overwrite acknowledgment audit row.
    if (ownerAck.gated) {
      await writeAuditLog(tx, {
        action: 'domain_owner.overwrite_acknowledged',
        entityType: 'adr',
        entityId: id,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          ownerUserId: ownerAck.ownerUserId,
          ownerName: ownerAck.ownerName,
          ownerEmail: ownerAck.ownerEmail,
        },
      })
      await notifyDomainOwner(tx, {
        organizationId: orgId,
        entityType: 'adr',
        entityId: id,
        action: 'adr.edit_by_non_owner',
        actorUserId: session.user.id,
        ownerUserId: ownerAck.ownerUserId,
        summary: `${session.user.name ?? session.user.email ?? 'Someone'} edited your ADR "${title}"`,
      })
    }

    if (debtAck.acknowledged) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_open_debt',
        entityType: 'adr',
        entityId: id,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          criticalCount: debtAck.criticalCount,
          highCount: debtAck.highCount,
          publishedAt: new Date().toISOString(),
        },
      })
    }
  })
}

export async function deleteADR(id: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.adrs.findFirst({ where: eq(adrs.id, id) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'adr'), eq(entityTaxonomyValues.entityId, id))
    )

    await tx.delete(adrs).where(and(eq(adrs.id, id), eq(adrs.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'adr.delete',
      entityType: 'adr',
      entityId: id,
      userId: session.user.id,
      organizationId: orgId,
      before: { number: before?.number, title: before?.title },
    })
  })
}

type DBOrTx = Pick<typeof db, 'insert'>

// ── CSV Import (#596) ────────────────────────────────────────────────────────

export type ADRImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const VALID_ADR_STATUS = new Set(['proposed', 'accepted', 'deprecated', 'superseded'])
const VALID_ADR_VISIBILITY = new Set(['org', 'connections', 'instance'])

/**
 * ADR CSV import — #596. Mirrors importCapabilities / importPersonas with two
 * ADR-specific wrinkles:
 *   - Upsert key is `number` (e.g. "ADR-001"), not `name`.
 *   - `superseded_by` references another ADR by its number; the reference is
 *     resolved against the org's ADR set (including newly-created rows in the
 *     same import), so round-trip exports import cleanly even when one ADR
 *     supersedes another within the same batch.
 *   - Four junction tables (capabilities / applications / initiatives /
 *     objectives) — unknown names report as warnings, not row failures.
 */
export async function importADRs(formData: FormData, dryRun = false): Promise<ADRImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  // Pre-fetch existing ADRs and all four junction targets, org-scoped.
  const [existing, orgCaps, orgApps, orgInits, orgObjs] = await Promise.all([
    db.query.adrs.findMany({
      where: eq(adrs.organizationId, orgId),
      columns: { id: true, number: true },
    }),
    db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.applications.findMany({
      where: eq(applications.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.initiatives.findMany({
      where: eq(initiatives.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.strategicObjectives.findMany({
      where: eq(strategicObjectives.organizationId, orgId),
      columns: { id: true, name: true },
    }),
  ])
  const existingByNumber = new Map(existing.map(a => [a.number.toLowerCase(), a.id]))
  const capByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const appByName = new Map(orgApps.map(a => [a.name.toLowerCase(), a.id]))
  const initByName = new Map(orgInits.map(i => [i.name.toLowerCase(), i.id]))
  const objByName = new Map(orgObjs.map(o => [o.name.toLowerCase(), o.id]))

  type ValidRow = {
    number: string
    title: string
    context: string | null
    decision: string | null
    consequences: string | null
    status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
    visibility: 'org' | 'connections' | 'instance'
    supersededByNumber: string | null
    capabilityIds: string[]
    applicationIds: string[]
    initiativeIds: string[]
    objectiveIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2
    const number = row['number']?.trim()
    const title = row['title']?.trim()
    if (!number) { errors.push(`Row ${rowNum}: missing required field "number"`); skipped++; continue }
    if (!title) { errors.push(`Row ${rowNum}: missing required field "title"`); skipped++; continue }

    const status = (row['status'] || 'proposed').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()
    if (!VALID_ADR_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_ADR_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`)
      skipped++; continue
    }

    const resolveList = (
      values: string[],
      lookup: Map<string, string>,
      label: string,
    ): string[] => {
      const ids: string[] = []
      for (const v of values) {
        const id = lookup.get(v.toLowerCase())
        if (id) ids.push(id)
        else errors.push(`Row ${rowNum}: ${label} "${v}" not found in this org — skipped`)
      }
      return ids
    }

    const capabilityIds = resolveList(splitSemicolonList(row['capabilities']), capByName, 'capability')
    const applicationIds = resolveList(splitSemicolonList(row['applications']), appByName, 'application')
    const initiativeIds = resolveList(splitSemicolonList(row['initiatives']), initByName, 'initiative')
    const objectiveIds = resolveList(splitSemicolonList(row['objectives']), objByName, 'objective')

    const existingId = existingByNumber.get(number.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      number,
      title,
      context: row['context'] || null,
      decision: row['decision'] || null,
      consequences: row['consequences'] || null,
      status: status as 'proposed' | 'accepted' | 'deprecated' | 'superseded',
      visibility: visibility as 'org' | 'connections' | 'instance',
      supersededByNumber: row['superseded_by']?.trim() || null,
      capabilityIds,
      applicationIds,
      initiativeIds,
      objectiveIds,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      // First pass: upsert ADR rows and remember the resolved id by number so
      // a later supersedes_by reference can resolve even if the target was
      // created in the same import.
      const idByNumber = new Map<string, string>(existingByNumber)
      for (const r of validRows) {
        let adrId = r.existingId
        if (adrId) {
          await tx.update(adrs).set({
            title: r.title,
            context: r.context,
            decision: r.decision,
            consequences: r.consequences,
            status: r.status,
            visibility: r.visibility,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(adrs.id, adrId), eq(adrs.organizationId, orgId)))
          // Replace all four junctions wholesale — same semantics as editADR.
          await tx.delete(adrCapabilities).where(eq(adrCapabilities.adrId, adrId))
          await tx.delete(adrApplications).where(eq(adrApplications.adrId, adrId))
          await tx.delete(adrInitiatives).where(eq(adrInitiatives.adrId, adrId))
          await tx.delete(adrObjectives).where(eq(adrObjectives.adrId, adrId))
        } else {
          const [inserted] = await tx.insert(adrs).values({
            number: r.number,
            title: r.title,
            context: r.context,
            decision: r.decision,
            consequences: r.consequences,
            status: r.status,
            visibility: r.visibility,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: adrs.id })
          adrId = inserted.id
        }
        idByNumber.set(r.number.toLowerCase(), adrId)

        await insertJunctions(tx, adrId!, r.capabilityIds, r.applicationIds, r.initiativeIds, r.objectiveIds)
      }

      // Second pass: resolve `supersededBy` references now that every row in
      // this batch has an id. Unresolved references report as warnings.
      for (const r of validRows) {
        if (!r.supersededByNumber) continue
        const targetId = idByNumber.get(r.supersededByNumber.toLowerCase())
        const sourceId = idByNumber.get(r.number.toLowerCase())
        if (!sourceId) continue
        if (!targetId) {
          errors.push(`Row for "${r.number}": superseded_by "${r.supersededByNumber}" not found in this org — left unlinked`)
          continue
        }
        await tx.update(adrs)
          .set({ supersededBy: targetId, updatedAt: new Date() })
          .where(and(eq(adrs.id, sourceId), eq(adrs.organizationId, orgId)))
      }

      await writeAuditLog(tx, {
        action: 'adr.import',
        entityType: 'adr',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, errorCount: errors.length },
      })
    })

    revalidatePath('/adrs')
  }

  return { created, updated, skipped, errors }
}

async function insertJunctions(
  tx: DBOrTx,
  adrId: string,
  capabilityIds: string[],
  applicationIds: string[],
  initiativeIds: string[],
  objectiveIds: string[],
) {
  if (capabilityIds.length > 0)
    await tx.insert(adrCapabilities).values(capabilityIds.map(capabilityId => ({ adrId, capabilityId }))).onConflictDoNothing()
  if (applicationIds.length > 0)
    await tx.insert(adrApplications).values(applicationIds.map(applicationId => ({ adrId, applicationId }))).onConflictDoNothing()
  if (initiativeIds.length > 0)
    await tx.insert(adrInitiatives).values(initiativeIds.map(initiativeId => ({ adrId, initiativeId }))).onConflictDoNothing()
  if (objectiveIds.length > 0)
    await tx.insert(adrObjectives).values(objectiveIds.map(objectiveId => ({ adrId, objectiveId }))).onConflictDoNothing()
}
