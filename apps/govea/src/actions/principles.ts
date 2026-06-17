'use server'

import { db } from '@/db/client'
import { principles, principleAdrs, principleCapabilities, entityTaxonomyValues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
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

type DBOrTx = Pick<typeof db, 'insert'>

async function insertJunctions(tx: DBOrTx, principleId: string, adrIds: string[], capabilityIds: string[]) {
  if (adrIds.length > 0)
    await tx.insert(principleAdrs).values(adrIds.map(adrId => ({ principleId, adrId }))).onConflictDoNothing()
  if (capabilityIds.length > 0)
    await tx.insert(principleCapabilities).values(capabilityIds.map(capabilityId => ({ principleId, capabilityId }))).onConflictDoNothing()
}

export async function getPrinciples(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(orgId) : []

  return db.query.principles.findMany({
    where: () => {
      const vis = listScopeFilter(principles, { orgId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(principles.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      principleAdrs: { with: { adr: true } },
      principleCapabilities: { with: { capability: true } },
    },
    orderBy: (p, { asc }) => [asc(p.title)],
  })
}

export async function getPrinciple(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const principle = await db.query.principles.findFirst({
    where: eq(principles.id, id),
    with: {
      organization: true,
      principleAdrs: { with: { adr: true } },
      principleCapabilities: { with: { capability: true } },
    },
  })

  if (!principle) return null
  const visible = await canReadFederatedEntity(principle.organizationId, principle.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && principle.status !== 'published') return null

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(principle.organizationId, 'principle', id),
    getEntityTaxonomyDefinitions(principle.organizationId, 'principle'),
  ])
  return { ...principle, taxonomyValues, taxonomyDefinitions }
}

export async function createPrinciple(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const title = (formData.get('title') as string) || null
  const rationale = (formData.get('rationale') as string) || null
  const implications = (formData.get('implications') as string) || null
  const principleType = (formData.get('principleType') as 'architecture' | 'data') ?? 'architecture'
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  await db.transaction(async (tx) => {
    const [principle] = await tx.insert(principles).values({
      name, description, title, rationale, implications, principleType, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    await insertJunctions(tx, principle.id, adrIds, capabilityIds)

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'principle', principle.id, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'principle.create',
      entityType: 'principle',
      entityId: principle.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, status, visibility },
    })
  })
}

export async function editPrinciple(principleId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const title = (formData.get('title') as string) || null
  const rationale = (formData.get('rationale') as string) || null
  const implications = (formData.get('implications') as string) || null
  const principleType = formData.get('principleType') as 'architecture' | 'data'
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.update(principles).set({
      name, description, title, rationale, implications, principleType, status, visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(principles.id, principleId), eq(principles.organizationId, orgId)))

    await tx.delete(principleAdrs).where(eq(principleAdrs.principleId, principleId))
    await tx.delete(principleCapabilities).where(eq(principleCapabilities.principleId, principleId))
    await insertJunctions(tx, principleId, adrIds, capabilityIds)

    const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
    await syncEntityTaxonomyValues(tx, orgId, 'principle', principleId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'principle.edit',
      entityType: 'principle',
      entityId: principleId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status, visibility },
    })
  })
}

export async function deletePrinciple(principleId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'principle'), eq(entityTaxonomyValues.entityId, principleId))
    )

    await tx.delete(principles).where(
      and(eq(principles.id, principleId), eq(principles.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'principle.delete',
      entityType: 'principle',
      entityId: principleId,
      userId: session.user.id,
      organizationId: orgId,
      before: { title: before?.title },
    })
  })
}
