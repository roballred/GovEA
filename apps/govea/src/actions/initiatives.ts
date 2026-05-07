'use server'

import { db } from '@/db/client'
import {
  initiatives, initiativeCapabilities, initiativeObjectives, entityTaxonomyValues,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/actions/taxonomy'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

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

export async function getInitiatives() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.initiatives.findMany({
    where: (i, { eq, or, and, inArray }) => {
      const base = eq(i.organizationId, orgId)
      const instanceWide = eq(i.visibility, 'instance')
      const statusFilter = isViewer ? inArray(i.status, VIEWER_INITIATIVE_STATUSES) : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(i.organizationId, connectedOrgIds), inArray(i.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
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

  const [row] = await db.insert(initiatives).values({
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
    await db.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
  }

  const objectiveIds = formData.getAll('objectiveIds') as string[]
  if (objectiveIds.length > 0) {
    await db.insert(initiativeObjectives)
      .values(objectiveIds.map(objectiveId => ({ initiativeId: row.id, objectiveId })))
      .onConflictDoNothing()
  }

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  await syncEntityTaxonomyValues(orgId, 'initiative', row.id, taxonomyTermIds)

  await writeAuditLog({
    action: 'initiative.create',
    entityType: 'initiative',
    entityId: row.id,
    userId,
    organizationId: orgId,
    after: { name: row.name, status: row.status, visibility: row.visibility },
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

  await db.update(initiatives).set({
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
  await db.delete(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, id))
  const capabilityEntries = buildCapabilityEntries(formData, id)
  if (capabilityEntries.length > 0) {
    await db.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
  }

  // Replace objective junctions
  await db.delete(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, id))
  const objectiveIds = formData.getAll('objectiveIds') as string[]
  if (objectiveIds.length > 0) {
    await db.insert(initiativeObjectives)
      .values(objectiveIds.map(objectiveId => ({ initiativeId: id, objectiveId })))
      .onConflictDoNothing()
  }

  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  await syncEntityTaxonomyValues(orgId, 'initiative', id, taxonomyTermIds)

  await writeAuditLog({
    action: 'initiative.edit',
    entityType: 'initiative',
    entityId: id,
    userId,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status },
    after: { name, status, visibility },
  })
}

export async function deleteInitiative(id: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.initiatives.findFirst({ where: eq(initiatives.id, id) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(entityTaxonomyValues).where(
    and(eq(entityTaxonomyValues.entityType, 'initiative'), eq(entityTaxonomyValues.entityId, id))
  )

  await db.delete(initiatives).where(eq(initiatives.id, id))

  await writeAuditLog({
    action: 'initiative.delete',
    entityType: 'initiative',
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status },
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
