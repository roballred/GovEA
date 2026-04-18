'use server'

import { db } from '@/db/client'
import { principles, principleAdrs, principleCapabilities } from '@/db/schema'
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

async function insertJunctions(principleId: string, adrIds: string[], capabilityIds: string[]) {
  if (adrIds.length > 0)
    await db.insert(principleAdrs).values(adrIds.map(adrId => ({ principleId, adrId }))).onConflictDoNothing()
  if (capabilityIds.length > 0)
    await db.insert(principleCapabilities).values(capabilityIds.map(capabilityId => ({ principleId, capabilityId }))).onConflictDoNothing()
}

export async function getPrinciples(orgId: string) {
  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.principles.findMany({
    where: (p, { eq, or, and, inArray }) => {
      const base = eq(p.organizationId, orgId)
      const instanceWide = eq(p.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(p.organizationId, connectedOrgIds),
          inArray(p.visibility, ['connections', 'instance'])
        )
      )
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
  return visible ? principle : null
}

export async function createPrinciple(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const title = (formData.get('title') as string) || null
  const rationale = (formData.get('rationale') as string) || null
  const implications = (formData.get('implications') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const [principle] = await db.insert(principles).values({
    name, description, title, rationale, implications, status, visibility,
    organizationId: orgId,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  }).returning()

  await insertJunctions(principle.id, adrIds, capabilityIds)

  await writeAuditLog({
    action: 'principle.create',
    entityType: 'principle',
    entityId: principle.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, status, visibility },
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
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const adrIds = formData.getAll('adrIds') as string[]
  const capabilityIds = formData.getAll('capabilityIds') as string[]

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.update(principles).set({
    name, description, title, rationale, implications, status, visibility,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).where(and(eq(principles.id, principleId), eq(principles.organizationId, orgId)))

  await db.delete(principleAdrs).where(eq(principleAdrs.principleId, principleId))
  await db.delete(principleCapabilities).where(eq(principleCapabilities.principleId, principleId))
  await insertJunctions(principleId, adrIds, capabilityIds)

  await writeAuditLog({
    action: 'principle.edit',
    entityType: 'principle',
    entityId: principleId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status },
    after: { name, status, visibility },
  })
}

export async function deletePrinciple(principleId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(before?.organizationId, orgId)

  await db.delete(principles).where(
    and(eq(principles.id, principleId), eq(principles.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'principle.delete',
    entityType: 'principle',
    entityId: principleId,
    userId: session.user.id,
    organizationId: orgId,
    before: { title: before?.title },
  })
}
