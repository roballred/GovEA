'use server'

import { db } from '@/db/client'
import { capabilities, capabilityPersonas } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getConnectedOrgIds } from '@/lib/federation'
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

export async function getCapabilities(organizationId: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)

  return db.query.capabilities.findMany({
    where: (c, { eq, or, and, inArray }) => {
      const base = eq(c.organizationId, organizationId)
      const instanceWide = eq(c.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(c.organizationId, connectedOrgIds),
          inArray(c.visibility, ['connections', 'instance'])
        )
      )
    },
    with: {
      organization: true,
      capabilityPersonas: { with: { persona: true } },
    },
    orderBy: (c, { asc }) => [asc(c.name)],
  })
}

export async function createCapability(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const personaIds = formData.getAll('personaIds') as string[]

  const [capability] = await db.insert(capabilities).values({
    name,
    description,
    domain,
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

  await writeAuditLog({
    action: 'capability.create',
    entityType: 'capability',
    entityId: capability.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, description, domain, status, visibility, personaIds },
  })
}

export async function editCapability(capabilityId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const personaIds = formData.getAll('personaIds') as string[]

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })

  await db.update(capabilities).set({
    name,
    description,
    domain,
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

  await writeAuditLog({
    action: 'capability.edit',
    entityType: 'capability',
    entityId: capabilityId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: before?.name, status: before?.status, visibility: before?.visibility },
    after: { name, description, domain, status, visibility, personaIds },
  })
}

export async function deleteCapability(capabilityId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })

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
