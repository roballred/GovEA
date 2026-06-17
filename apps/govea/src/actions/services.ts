'use server'

import { db } from '@/db/client'
import {
  services, serviceCapabilities, servicePersonas,
  serviceValueStreams, entityTaxonomyValues, applicationCapabilities,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { redirect } from 'next/navigation'
import { syncEntityTaxonomyValues, getEntityTaxonomyValues, getEntityTaxonomyDefinitions } from '@/lib/entity-taxonomy-helpers'

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
      serviceCapabilities: {
        with: {
          capability: { columns: { id: true, name: true, domain: true } },
        },
      },
      servicePersonas: { with: { persona: true } },
      serviceValueStreams: { with: { valueStream: true } },
    },
  })

  if (!service) return null
  const visible = await canReadFederatedEntity(service.organizationId, service.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && service.status !== 'published') return null

  // Fetch capability → application links in a separate query (Drizzle doesn't support 3-level deep joins)
  const capIds = service.serviceCapabilities.map(sc => sc.capabilityId)
  const capabilityApps = capIds.length > 0
    ? await db.query.applicationCapabilities.findMany({
        where: inArray(applicationCapabilities.capabilityId, capIds),
        with: { application: { columns: { id: true, name: true, vendor: true } } },
      })
    : []

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(service.organizationId, 'service', id),
    getEntityTaxonomyDefinitions(service.organizationId, 'service'),
  ])

  return { ...service, capabilityApps, taxonomyValues, taxonomyDefinitions }
}

export async function getServices(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  return db.query.services.findMany({
    where: () => {
      const vis = listScopeFilter(services, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(services.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
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
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('service', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [service] = await tx.insert(services).values({
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
      await tx.insert(servicePersonas).values(
        personaIds.map(personaId => ({ serviceId: service.id, personaId }))
      )
    }

    if (taxonomyTermIds.length > 0) {
      await syncEntityTaxonomyValues(tx, orgId, 'service', service.id, taxonomyTermIds)
    }

    await writeAuditLog(tx, {
      action: 'service.create',
      entityType: 'service',
      entityId: service.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, description, serviceOwner, channels, status, visibility, personaIds },
    })
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
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]

  const before = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.update(services).set({
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
    await tx.delete(servicePersonas).where(eq(servicePersonas.serviceId, serviceId))
    if (personaIds.length > 0) {
      await tx.insert(servicePersonas).values(
        personaIds.map(personaId => ({ serviceId, personaId }))
      )
    }

    // Replace taxonomy values
    await syncEntityTaxonomyValues(tx, orgId, 'service', serviceId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'service.edit',
      entityType: 'service',
      entityId: serviceId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status, visibility: before?.visibility },
      after: { name, description, serviceOwner, channels, status, visibility, personaIds },
    })
  })
}

export async function deleteService(serviceId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(
        eq(entityTaxonomyValues.organizationId, orgId),
        eq(entityTaxonomyValues.entityType, 'service'),
        eq(entityTaxonomyValues.entityId, serviceId),
      )
    )

    await tx.delete(services).where(
      and(eq(services.id, serviceId), eq(services.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'service.delete',
      entityType: 'service',
      entityId: serviceId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name },
    })
  })
}
