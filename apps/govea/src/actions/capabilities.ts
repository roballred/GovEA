'use server'

import { db } from '@/db/client'
import { capabilities, capabilityPersonas, capabilityRelationships, entityTaxonomyValues } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/actions/taxonomy'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { flagLinksForVisibilityDrop, clearLinksFlag } from '@/lib/cross-org-link-helpers'

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

export async function getCapability(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const capability = await db.query.capabilities.findFirst({
    where: eq(capabilities.id, id),
    with: {
      organization: true,
      capabilityPersonas: { with: { persona: true } },
      applicationCapabilities: { with: { application: true } },
      objectiveCapabilities: { with: { objective: true } },
      initiativeCapabilities: { with: { initiative: true } },
      adrCapabilities: { with: { adr: true } },
      principleCapabilities: { with: { principle: true } },
    },
  })

  if (!capability) return null
  const visible = await canReadFederatedEntity(capability.organizationId, capability.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && capability.status !== 'published') return null

  // Fetch relationships separately — avoids Drizzle relational schema cache for self-referential table
  const [childRels, parentRels] = await Promise.all([
    db.select({
      parentId: capabilityRelationships.parentId,
      childId: capabilityRelationships.childId,
    }).from(capabilityRelationships).where(eq(capabilityRelationships.parentId, id)),
    db.select({
      parentId: capabilityRelationships.parentId,
      childId: capabilityRelationships.childId,
    }).from(capabilityRelationships).where(eq(capabilityRelationships.childId, id)),
  ])

  // Fetch names for related caps
  const relatedIds = [...childRels.map(r => r.childId), ...parentRels.map(r => r.parentId)]
  const relatedCaps = relatedIds.length > 0
    ? await db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
        .where(inArray(capabilities.id, relatedIds))
    : []
  const capNameById = new Map(relatedCaps.map(c => [c.id, c.name]))

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(capability.organizationId, 'capability', id),
    getEntityTaxonomyDefinitions(capability.organizationId, 'capability'),
  ])

  return {
    ...capability,
    childRelationships: childRels.map(r => ({ ...r, child: { id: r.childId, name: capNameById.get(r.childId) ?? '' } })),
    parentRelationships: parentRels.map(r => ({ ...r, parent: { id: r.parentId, name: capNameById.get(r.parentId) ?? '' } })),
    taxonomyValues,
    taxonomyDefinitions,
  }
}

export async function getCapabilities(organizationId: string, role?: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)
  const isViewer = role === 'viewer'

  const rows = await db.query.capabilities.findMany({
    where: (c, { eq, or, and, inArray }) => {
      const base = eq(c.organizationId, organizationId)
      const instanceWide = eq(c.visibility, 'instance')
      const statusFilter = isViewer ? eq(c.status, 'published') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(c.organizationId, connectedOrgIds), inArray(c.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
    },
    with: {
      organization: true,
      capabilityPersonas: { with: { persona: true } },
    },
    orderBy: (c, { asc }) => [asc(c.name)],
  })

  // Fetch capability relationships separately and attach — avoids relying on Drizzle
  // relational query schema cache for the self-referential junction table.
  if (rows.length === 0) return rows.map(r => ({ ...r, childRelationships: [], parentRelationships: [] }))
  const capIds = rows.map(r => r.id)
  const rels = await db.select().from(capabilityRelationships).where(
    and(
      inArray(capabilityRelationships.parentId, capIds),
    )
  )
  const parentRels = await db.select().from(capabilityRelationships).where(
    inArray(capabilityRelationships.childId, capIds)
  )
  const childRelMap = new Map<string, { parentId: string; childId: string }[]>()
  const parentRelMap = new Map<string, { parentId: string; childId: string }[]>()
  for (const r of rels) {
    const arr = childRelMap.get(r.parentId) ?? []
    arr.push(r)
    childRelMap.set(r.parentId, arr)
  }
  for (const r of parentRels) {
    const arr = parentRelMap.get(r.childId) ?? []
    arr.push(r)
    parentRelMap.set(r.childId, arr)
  }
  return rows.map(r => ({
    ...r,
    childRelationships:  childRelMap.get(r.id)  ?? [],
    parentRelationships: parentRelMap.get(r.id) ?? [],
  }))
}

export async function createCapability(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const behaviors = (formData.get('behaviors') as string) || null
  const rules = (formData.get('rules') as string) || null
  const capabilityType = (formData.get('capabilityType') as 'business' | 'technical') || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const personaIds = formData.getAll('personaIds') as string[]
  const parentId = (formData.get('parentId') as string) || null
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]

  const [capability] = await db.insert(capabilities).values({
    name,
    description,
    domain,
    behaviors,
    rules,
    capabilityType,
    status,
    visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  if (personaIds.length > 0) {
    await db.insert(capabilityPersonas).values(
      personaIds.map(personaId => ({ capabilityId: capability.id, personaId }))
    )
  }

  if (parentId) {
    await db.insert(capabilityRelationships).values({ parentId, childId: capability.id }).onConflictDoNothing()
  }

  if (taxonomyTermIds.length > 0) {
    await syncEntityTaxonomyValues(orgId, 'capability', capability.id, taxonomyTermIds)
  }

  await writeAuditLog({
    action: 'capability.create',
    entityType: 'capability',
    entityId: capability.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, description, domain, capabilityType, status, visibility, personaIds, parentId },
  })
}

export async function editCapability(capabilityId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const behaviors = (formData.get('behaviors') as string) || null
  const rules = (formData.get('rules') as string) || null
  const capabilityType = (formData.get('capabilityType') as 'business' | 'technical') || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const personaIds = formData.getAll('personaIds') as string[]
  const parentId = (formData.get('parentId') as string) || null
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(capabilities).set({
    name,
    description,
    domain,
    behaviors,
    rules,
    capabilityType,
    status,
    visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId)))

  // Replace persona links
  await db.delete(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, capabilityId))
  if (personaIds.length > 0) {
    await db.insert(capabilityPersonas).values(
      personaIds.map(personaId => ({ capabilityId, personaId }))
    )
  }

  // Replace parent relationship (remove existing, add new if set)
  await db.delete(capabilityRelationships).where(eq(capabilityRelationships.childId, capabilityId))
  if (parentId) {
    await db.insert(capabilityRelationships).values({ parentId, childId: capabilityId }).onConflictDoNothing()
  }

  await syncEntityTaxonomyValues(orgId, 'capability', capabilityId, taxonomyTermIds)

  await writeAuditLog({
    action: 'capability.edit',
    entityType: 'capability',
    entityId: capabilityId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status, visibility: before?.visibility },
    after: { name, description, domain, capabilityType, status, visibility, personaIds, parentId },
  })

  // Flag or clear cross-org links when visibility changes.
  const prevVis = before?.visibility
  const visDropped = (prevVis === 'connections' || prevVis === 'instance') && visibility === 'org'
  const visRaised = prevVis === 'org' && (visibility === 'connections' || visibility === 'instance')
  if (visDropped) await flagLinksForVisibilityDrop('capability', capabilityId, `"${name}" visibility was restricted to org-only — this link may no longer be accessible to the other org`)
  if (visRaised)  await clearLinksFlag('capability', capabilityId)
}

export async function deleteCapability(capabilityId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(entityTaxonomyValues).where(
    and(eq(entityTaxonomyValues.entityType, 'capability'), eq(entityTaxonomyValues.entityId, capabilityId))
  )

  await db.delete(capabilities).where(
    and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'capability.delete',
    entityType: 'capability',
    entityId: capabilityId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name },
  })
}

export async function markCapabilityReviewed(capabilityId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.update(capabilities).set({
    lastReviewedBy: session.user.id,
    lastReviewedAt: now,
  }).where(and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId)))

  await writeAuditLog({
    action: 'capability.reviewed',
    entityType: 'capability',
    entityId: capabilityId,
    userId: session.user.id,
    organizationId: orgId,
    after: { lastReviewedAt: now.toISOString() },
  })

  revalidatePath(`/capabilities/${capabilityId}`)
}
