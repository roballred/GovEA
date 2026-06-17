'use server'

import { db } from '@/db/client'
import {
  services, serviceCapabilities, servicePersonas,
  serviceValueStreams, entityTaxonomyValues, applicationCapabilities,
  capabilities, personas, valueStreams,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { redirect } from 'next/navigation'
import { syncEntityTaxonomyValues, getEntityTaxonomyValues, getEntityTaxonomyDefinitions } from '@/lib/entity-taxonomy-helpers'
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

// ── CSV import (#748) ───────────────────────────────────────────────────────
// `name` is the case-insensitive upsert key. `channels` is a semicolon list of
// channel keys; `personas`, `capabilities`, `value_streams` resolve names within
// the caller's org (unknown names are row warnings). `dryRun` writes nothing.

export type ServiceImportResult = { created: number; updated: number; skipped: number; errors: string[] }

const VALID_SERVICE_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_SERVICE_VISIBILITY = new Set(['org', 'connections', 'instance'])
const VALID_CHANNELS = new Set(['online', 'in-person', 'phone', 'mobile'])

export async function importServices(formData: FormData, dryRun = false): Promise<ServiceImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }
  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgCaps, orgPersonas, orgVs] = await Promise.all([
    db.query.services.findMany({ where: eq(services.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.capabilities.findMany({ where: eq(capabilities.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.personas.findMany({ where: eq(personas.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.valueStreams.findMany({ where: eq(valueStreams.organizationId, orgId), columns: { id: true, name: true } }),
  ])
  const existingByName = new Map(existing.map(s => [s.name.toLowerCase(), s.id]))
  const capIdByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const personaIdByName = new Map(orgPersonas.map(p => [p.name.toLowerCase(), p.id]))
  const vsIdByName = new Map(orgVs.map(v => [v.name.toLowerCase(), v.id]))

  type ValidRow = {
    name: string
    description: string | null
    serviceOwner: string | null
    channels: string[]
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    capabilityIds: string[]
    personaIds: string[]
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
    if (!VALID_SERVICE_STATUS.has(status)) { errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue }
    if (!VALID_SERVICE_VISIBILITY.has(visibility)) { errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue }

    const channels: string[] = []
    for (const ch of splitSemicolonList(row['channels'])) {
      const c = ch.toLowerCase()
      if (VALID_CHANNELS.has(c)) channels.push(c)
      else errors.push(`Row ${rowNum}: invalid channel "${ch}" — skipped`)
    }

    function resolve(col: string, map: Map<string, string>, label: string): string[] {
      const ids: string[] = []
      for (const n of splitSemicolonList(row[col])) {
        const id = map.get(n.toLowerCase())
        if (id) ids.push(id)
        else errors.push(`Row ${rowNum}: ${label} "${n}" not found in this org — skipped`)
      }
      return [...new Set(ids)]
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++
    validRows.push({
      name,
      description: row['description'] || null,
      serviceOwner: row['service_owner'] || null,
      channels: [...new Set(channels)],
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      capabilityIds: resolve('capabilities', capIdByName, 'capability'),
      personaIds: resolve('personas', personaIdByName, 'persona'),
      valueStreamIds: resolve('value_streams', vsIdByName, 'value stream'),
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let serviceId = r.existingId
        if (serviceId) {
          await tx.update(services).set({
            description: r.description, serviceOwner: r.serviceOwner, channels: r.channels,
            status: r.status, visibility: r.visibility,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(services.id, serviceId), eq(services.organizationId, orgId)))
          await tx.delete(serviceCapabilities).where(eq(serviceCapabilities.serviceId, serviceId))
          await tx.delete(servicePersonas).where(eq(servicePersonas.serviceId, serviceId))
          await tx.delete(serviceValueStreams).where(eq(serviceValueStreams.serviceId, serviceId))
        } else {
          const [inserted] = await tx.insert(services).values({
            name: r.name, description: r.description, serviceOwner: r.serviceOwner, channels: r.channels,
            status: r.status, visibility: r.visibility,
            organizationId: orgId, createdBy: session.user.id, updatedBy: session.user.id,
          }).returning({ id: services.id })
          serviceId = inserted.id
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(serviceCapabilities).values(r.capabilityIds.map(capabilityId => ({ serviceId: serviceId!, capabilityId })))
        }
        if (r.personaIds.length > 0) {
          await tx.insert(servicePersonas).values(r.personaIds.map(personaId => ({ serviceId: serviceId!, personaId })))
        }
        if (r.valueStreamIds.length > 0) {
          await tx.insert(serviceValueStreams).values(r.valueStreamIds.map(valueStreamId => ({ serviceId: serviceId!, valueStreamId })))
        }
      }

      await writeAuditLog(tx, {
        action: 'service.import', entityType: 'service', entityId: orgId,
        userId: session.user.id, organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
