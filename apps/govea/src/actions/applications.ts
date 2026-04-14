'use server'

import { db } from '@/db/client'
import { applications, applicationCapabilities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, getConnectedOrgIds } from '@/lib/federation'
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

export async function getApplication(id: string) {
  return db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      organization: true,
      applicationCapabilities: { with: { capability: true } },
    },
  })
}

export async function getApplications(organizationId: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.applications.findMany({
    where: (a, { eq, or, and, inArray }) => {
      const base = eq(a.organizationId, organizationId)
      const instanceWide = eq(a.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(a.organizationId, connectedOrgIds),
          inArray(a.visibility, ['connections', 'instance'])
        )
      )
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
