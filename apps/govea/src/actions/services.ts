'use server'

import { db } from '@/db/client'
import {
  services, serviceCapabilities, servicePersonas,
  serviceApplications, serviceValueStreams,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
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

export async function getService(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const service = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      organization: true,
      serviceCapabilities: { with: { capability: true } },
      servicePersonas: { with: { persona: true } },
      serviceApplications: { with: { application: true } },
      serviceValueStreams: { with: { valueStream: true } },
    },
  })

  if (!service) return null
  const visible = await canReadFederatedEntity(service.organizationId, service.visibility, session.user.organizationId!)
  return visible ? service : null
}

export async function getServices(organizationId: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.services.findMany({
    where: (s, { eq, or, and, inArray }) => {
      const base = eq(s.organizationId, organizationId)
      const instanceWide = eq(s.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(s.organizationId, connectedOrgIds),
          inArray(s.visibility, ['connections', 'instance'])
        )
      )
    },
    with: {
      organization: true,
      servicePersonas: { with: { persona: true } },
    },
    orderBy: (s, { asc }) => [asc(s.name)],
  })
}

export async function createService(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const serviceOwner = (formData.get('serviceOwner') as string) || null
  const channels = formData.getAll('channels') as string[]
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const personaIds = formData.getAll('personaIds') as string[]

  const [service] = await db.insert(services).values({
    name,
    description,
    serviceOwner,
    channels,
    status,
    visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  if (personaIds.length > 0) {
    await db.insert(servicePersonas).values(
      personaIds.map(personaId => ({ serviceId: service.id, personaId }))
    )
  }

  await writeAuditLog({
    action: 'service.create',
    entityType: 'service',
    entityId: service.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, description, serviceOwner, channels, status, visibility, personaIds },
  })
}

export async function editService(serviceId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const serviceOwner = (formData.get('serviceOwner') as string) || null
  const channels = formData.getAll('channels') as string[]
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const personaIds = formData.getAll('personaIds') as string[]

  const before = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(services).set({
    name,
    description,
    serviceOwner,
    channels,
    status,
    visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(services.id, serviceId), eq(services.organizationId, orgId)))

  // Replace persona links
  await db.delete(servicePersonas).where(eq(servicePersonas.serviceId, serviceId))
  if (personaIds.length > 0) {
    await db.insert(servicePersonas).values(
      personaIds.map(personaId => ({ serviceId, personaId }))
    )
  }

  await writeAuditLog({
    action: 'service.edit',
    entityType: 'service',
    entityId: serviceId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status, visibility: before?.visibility },
    after: { name, description, serviceOwner, channels, status, visibility, personaIds },
  })
}

export async function deleteService(serviceId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(services).where(
    and(eq(services.id, serviceId), eq(services.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'service.delete',
    entityType: 'service',
    entityId: serviceId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}
