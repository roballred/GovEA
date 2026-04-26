'use server'

import { db } from '@/db/client'
import { applications, applicationCapabilities, objectiveCapabilities } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

export async function getApplication(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const application = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      organization: true,
      // Note: capability is fetched shallow (no objectiveCapabilities nesting) to avoid
      // PostgreSQL's 63-char identifier limit causing alias collisions on 4-level deep queries.
      // Objectives linked through capabilities are fetched separately below.
      applicationCapabilities: {
        with: { capability: true },
      },
      initiativeApplications: { with: { initiative: true } },
      adrApplications: { with: { adr: true } },
    },
  })

  if (!application) return null
  const visible = await canReadFederatedEntity(application.organizationId, application.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && application.status !== 'published') return null

  // Fetch objectives linked through this application's capabilities as a flat query.
  const capabilityIds = application.applicationCapabilities.map(ac => ac.capabilityId)
  const capabilityObjectives = capabilityIds.length > 0
    ? await db.query.objectiveCapabilities.findMany({
        where: inArray(objectiveCapabilities.capabilityId, capabilityIds),
        with: { objective: true },
      })
    : []

  return { ...application, capabilityObjectives }
}

export async function getApplications(organizationId: string, role?: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)
  const isViewer = role === 'viewer'

  return db.query.applications.findMany({
    where: (a, { eq, or, and, inArray }) => {
      const base = eq(a.organizationId, organizationId)
      const instanceWide = eq(a.visibility, 'instance')
      const statusFilter = isViewer ? eq(a.status, 'published') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(a.organizationId, connectedOrgIds), inArray(a.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
    },
    with: {
      organization: true,
      applicationCapabilities: { with: { capability: true } },
    },
    orderBy: (a, { asc }) => [asc(a.name)],
  })
}

export async function createApplication(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const vendor = (formData.get('vendor') as string) || null
  const version = (formData.get('version') as string) || null
  const hostingModel = (formData.get('hostingModel') as string) || null
  const lifecycleStatus = (formData.get('lifecycleStatus') as 'active' | 'sunset' | 'decommissioned' | 'planned') ?? 'active'
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const [application] = await db.insert(applications).values({
    name,
    description,
    vendor,
    version,
    hostingModel,
    lifecycleStatus,
    status,
    visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  if (capabilityIds.length > 0) {
    await db.insert(applicationCapabilities).values(
      capabilityIds.map(capabilityId => ({ applicationId: application.id, capabilityId }))
    )
  }

  await writeAuditLog({
    action: 'application.create',
    entityType: 'application',
    entityId: application.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, vendor, lifecycleStatus, status, visibility, capabilityIds },
  })
}

export async function editApplication(applicationId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const vendor = (formData.get('vendor') as string) || null
  const version = (formData.get('version') as string) || null
  const hostingModel = (formData.get('hostingModel') as string) || null
  const lifecycleStatus = formData.get('lifecycleStatus') as 'active' | 'sunset' | 'decommissioned' | 'planned'
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const before = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(applications).set({
    name,
    description,
    vendor,
    version,
    hostingModel,
    lifecycleStatus,
    status,
    visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(applications.id, applicationId), eq(applications.organizationId, orgId)))

  // Replace capability links
  await db.delete(applicationCapabilities).where(eq(applicationCapabilities.applicationId, applicationId))
  if (capabilityIds.length > 0) {
    await db.insert(applicationCapabilities).values(
      capabilityIds.map(capabilityId => ({ applicationId, capabilityId }))
    )
  }

  await writeAuditLog({
    action: 'application.edit',
    entityType: 'application',
    entityId: applicationId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status, visibility: before?.visibility },
    after: { name, vendor, lifecycleStatus, status, visibility, capabilityIds },
  })
}

export async function deleteApplication(applicationId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(applications).where(
    and(eq(applications.id, applicationId), eq(applications.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'application.delete',
    entityType: 'application',
    entityId: applicationId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

export async function markApplicationReviewed(applicationId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.update(applications).set({
    lastReviewedBy: session.user.id,
    lastReviewedAt: now,
  }).where(and(eq(applications.id, applicationId), eq(applications.organizationId, orgId)))

  await writeAuditLog({
    action: 'application.reviewed',
    entityType: 'application',
    entityId: applicationId,
    userId: session.user.id,
    organizationId: orgId,
    after: { lastReviewedAt: now.toISOString() },
  })

  revalidatePath(`/applications/${applicationId}`)
}
