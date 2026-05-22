'use server'

import { db } from '@/db/client'
import {
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives, entityTaxonomyValues,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { notifySubscribers } from './notifications'
import { ensurePublishOpenDebtAck } from '@/lib/debt-publish-gate'
import { ensureDomainOwnerOverwriteAck, assertUserInOrg } from '@/lib/domain-owner-gate'
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

// Viewer-visible ADR status — Option B decision from #202
const VIEWER_ADR_STATUS = 'accepted' as const

export async function getADRs() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.adrs.findMany({
    where: (a, { eq, or, and, inArray }) => {
      const base = eq(a.organizationId, orgId)
      const instanceWide = eq(a.visibility, 'instance')
      const statusFilter = isViewer ? eq(a.status, VIEWER_ADR_STATUS) : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(a.organizationId, connectedOrgIds), inArray(a.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
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
