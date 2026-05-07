'use server'

import { db } from '@/db/client'
import {
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives, entityTaxonomyValues,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/actions/taxonomy'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
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

  const [adr] = await db.insert(adrs).values({
    number,
    title,
    context,
    decision,
    consequences,
    status,
    visibility,
    supersededBy,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  await insertJunctions(adr.id, capabilityIds, applicationIds, initiativeIds, objectiveIds)

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  await syncEntityTaxonomyValues(orgId, 'adr', adr.id, taxonomyTermIds)

  await writeAuditLog({
    action: 'adr.create',
    entityType: 'adr',
    entityId: adr.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { number, title, status, visibility },
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

  const before = await db.query.adrs.findFirst({ where: eq(adrs.id, id) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(adrs).set({
    number,
    title,
    context,
    decision,
    consequences,
    status,
    visibility,
    supersededBy,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(adrs.id, id), eq(adrs.organizationId, orgId)))

  await db.delete(adrCapabilities).where(eq(adrCapabilities.adrId, id))
  await db.delete(adrApplications).where(eq(adrApplications.adrId, id))
  await db.delete(adrInitiatives).where(eq(adrInitiatives.adrId, id))
  await db.delete(adrObjectives).where(eq(adrObjectives.adrId, id))
  await insertJunctions(id, capabilityIds, applicationIds, initiativeIds, objectiveIds)

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  await syncEntityTaxonomyValues(orgId, 'adr', id, taxonomyTermIds)

  await writeAuditLog({
    action: 'adr.edit',
    entityType: 'adr',
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    before: { number: before?.number, title: before?.title, status: before?.status },
    after: { number, title, status, visibility },
  })
}

export async function deleteADR(id: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.adrs.findFirst({ where: eq(adrs.id, id) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(entityTaxonomyValues).where(
    and(eq(entityTaxonomyValues.entityType, 'adr'), eq(entityTaxonomyValues.entityId, id))
  )

  await db.delete(adrs).where(and(eq(adrs.id, id), eq(adrs.organizationId, orgId)))

  await writeAuditLog({
    action: 'adr.delete',
    entityType: 'adr',
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    before: { number: before?.number, title: before?.title },
  })
}

async function insertJunctions(
  adrId: string,
  capabilityIds: string[],
  applicationIds: string[],
  initiativeIds: string[],
  objectiveIds: string[],
) {
  if (capabilityIds.length > 0)
    await db.insert(adrCapabilities).values(capabilityIds.map(capabilityId => ({ adrId, capabilityId }))).onConflictDoNothing()
  if (applicationIds.length > 0)
    await db.insert(adrApplications).values(applicationIds.map(applicationId => ({ adrId, applicationId }))).onConflictDoNothing()
  if (initiativeIds.length > 0)
    await db.insert(adrInitiatives).values(initiativeIds.map(initiativeId => ({ adrId, initiativeId }))).onConflictDoNothing()
  if (objectiveIds.length > 0)
    await db.insert(adrObjectives).values(objectiveIds.map(objectiveId => ({ adrId, objectiveId }))).onConflictDoNothing()
}
