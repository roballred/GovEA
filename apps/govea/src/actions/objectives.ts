'use server'

import { db } from '@/db/client'
import { strategicObjectives, objectiveCapabilities, objectiveValueStreams, entityTaxonomyValues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { ensurePublishReady } from '@/lib/publish-readiness-gate'
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

export async function getObjectives() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.strategicObjectives.findMany({
    where: (o, { eq, or, and, inArray }) => {
      const base = eq(o.organizationId, organizationId)
      const instanceWide = eq(o.visibility, 'instance')
      const statusFilter = isViewer ? eq(o.status, 'published') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(o.organizationId, connectedOrgIds), inArray(o.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
    },
    orderBy: (o, { asc }) => [asc(o.name)],
    with: {
      organization: true,
      objectiveCapabilities: { with: { capability: true } },
      objectiveValueStreams: { with: { valueStream: true } },
      goalObjectives: { with: { goal: true } },
    },
  })
}

export async function getObjective(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Split into two queries to keep Drizzle's generated SQL aliases under
  // Postgres's 63-char NAMEDATALEN limit (#558). The deeply-nested chain
  //   strategicObjectives → objectiveCapabilities → capability
  //                       → applicationCapabilities → application
  // produces auto-generated alias names longer than 63 chars, which
  // Postgres truncates and then fails to resolve in LATERAL subqueries.
  const objective = await db.query.strategicObjectives.findFirst({
    where: (o, { eq }) => eq(o.id, id),
    with: {
      objectiveCapabilities: {
        with: { capability: true },
      },
      objectiveValueStreams: { with: { valueStream: true } },
      initiativeObjectives: { with: { initiative: true } },
    },
  })

  if (!objective) return null
  const visible = await canReadFederatedEntity(objective.organizationId, objective.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && objective.status !== 'published') return null

  // Second query: applicationCapabilities for the capabilities found above,
  // joined to their application. Grafted onto each capability below so the
  // consumer-facing shape matches the original deep `with` chain.
  const capabilityIds = objective.objectiveCapabilities.map(oc => oc.capability.id)
  const appCaps = capabilityIds.length > 0
    ? await db.query.applicationCapabilities.findMany({
        where: (ac, { inArray }) => inArray(ac.capabilityId, capabilityIds),
        with: { application: true },
      })
    : []

  const appCapsByCapId = new Map<string, typeof appCaps>()
  for (const ac of appCaps) {
    const list = appCapsByCapId.get(ac.capabilityId) ?? []
    list.push(ac)
    appCapsByCapId.set(ac.capabilityId, list)
  }

  const objectiveCapabilitiesWithApps = objective.objectiveCapabilities.map(oc => ({
    ...oc,
    capability: {
      ...oc.capability,
      applicationCapabilities: appCapsByCapId.get(oc.capability.id) ?? [],
    },
  }))

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(objective.organizationId, 'objective', id),
    getEntityTaxonomyDefinitions(objective.organizationId, 'objective'),
  ])
  return {
    ...objective,
    objectiveCapabilities: objectiveCapabilitiesWithApps,
    taxonomyValues,
    taxonomyDefinitions,
  }
}

export async function createObjective(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const successMetric = (formData.get('successMetric') as string) || null
  const timeHorizon = (formData.get('timeHorizon') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const valueStreamIds = formData.getAll('valueStreamIds') as string[]

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('objective', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  await db.transaction(async (tx) => {
    const [obj] = await tx.insert(strategicObjectives).values({
      name, description, successMetric, timeHorizon, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    if (capabilityIds.length > 0) {
      await tx.insert(objectiveCapabilities).values(
        capabilityIds.map(cId => ({ objectiveId: obj.id, capabilityId: cId }))
      )
    }
    if (valueStreamIds.length > 0) {
      await tx.insert(objectiveValueStreams).values(
        valueStreamIds.map(vId => ({ objectiveId: obj.id, valueStreamId: vId }))
      )
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'objective', obj.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'objective.create', entityType: 'objective', entityId: obj.id,
      userId: session.user.id, organizationId: orgId, after: { name, status },
    })
  })
}

export async function editObjective(objectiveId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const successMetric = (formData.get('successMetric') as string) || null
  const timeHorizon = (formData.get('timeHorizon') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const valueStreamIds = formData.getAll('valueStreamIds') as string[]

  const before = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, objectiveId),
  })
  assertOwnership(before?.organizationId, orgId)

  // #567 Part B — publish-readiness gate.
  const transitioningToPublished = before?.status !== 'published' && status === 'published'
  const publishReadyResult = ensurePublishReady({
    entityType: 'objective',
    formData,
    transitioningToPublished,
    acknowledged: formData.get('acknowledgePublishIncomplete') === 'on',
  })

  await db.transaction(async (tx) => {
    await tx.update(strategicObjectives).set({
      name, description, successMetric, timeHorizon, status, visibility,
      updatedBy: session.user.id, updatedAt: new Date(),
    }).where(and(eq(strategicObjectives.id, objectiveId), eq(strategicObjectives.organizationId, orgId)))

    await tx.delete(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, objectiveId))
    if (capabilityIds.length > 0) {
      await tx.insert(objectiveCapabilities).values(
        capabilityIds.map(cId => ({ objectiveId, capabilityId: cId }))
      )
    }

    await tx.delete(objectiveValueStreams).where(eq(objectiveValueStreams.objectiveId, objectiveId))
    if (valueStreamIds.length > 0) {
      await tx.insert(objectiveValueStreams).values(
        valueStreamIds.map(vId => ({ objectiveId, valueStreamId: vId }))
      )
    }

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'objective', objectiveId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'objective.edit', entityType: 'objective', entityId: objectiveId,
      userId: session.user.id, organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status },
    })

    if (publishReadyResult.missingFields.length > 0) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_incomplete',
        entityType: 'objective',
        entityId: objectiveId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { missingFields: publishReadyResult.missingFields },
      })
    }
  })
}

export async function deleteObjective(objectiveId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, objectiveId),
  })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'objective'), eq(entityTaxonomyValues.entityId, objectiveId))
    )

    await tx.delete(strategicObjectives).where(
      and(eq(strategicObjectives.id, objectiveId), eq(strategicObjectives.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'objective.delete', entityType: 'objective', entityId: objectiveId,
      userId: session.user.id, organizationId: orgId, before: { name: before?.name },
    })
  })
}
