'use server'

import { db } from '@/db/client'
import {
  initiatives, initiativeCapabilities, initiativeObjectives,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit, isAdmin } from '@/lib/rbac'

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

export async function getInitiatives(orgId: string) {
  const connectedOrgIds = await getConnectedOrgIds(orgId)

  return db.query.initiatives.findMany({
    where: (i, { eq, or, and, inArray }) => {
      const base = eq(i.organizationId, orgId)
      const instanceWide = eq(i.visibility, 'instance')
      if (connectedOrgIds.length === 0) return or(base, instanceWide)
      return or(
        base,
        instanceWide,
        and(
          inArray(i.organizationId, connectedOrgIds),
          inArray(i.visibility, ['connections', 'instance'])
        )
      )
    },
    with: {
      organization: true,
      initiativeCapabilities: { with: { capability: true } },
      initiativeObjectives: { with: { objective: true } },
    },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}

export async function getInitiative(id: string) {
  return db.query.initiatives.findFirst({
    where: eq(initiatives.id, id),
    with: {
      initiativeCapabilities: { with: { capability: true } },
      initiativeObjectives: { with: { objective: true } },
    },
  })
}

export async function createInitiative(formData: FormData) {
  const session = await requireContributor()

  const orgId = session.user.organizationId as string
  const userId = session.user.id

  const [row] = await db.insert(initiatives).values({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled') || 'proposed',
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
    visibility: (formData.get('visibility') as 'org' | 'connections' | 'instance') || 'org',
    organizationId: orgId,
    createdBy: userId,
    updatedBy: userId,
  }).returning()

  const capabilityEntries = buildCapabilityEntries(formData, row.id)
  if (capabilityEntries.length > 0) {
    await db.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
  }

  const objectiveIds = formData.getAll('objectiveIds') as string[]
  if (objectiveIds.length > 0) {
    await db.insert(initiativeObjectives)
      .values(objectiveIds.map(objectiveId => ({ initiativeId: row.id, objectiveId })))
      .onConflictDoNothing()
  }
}

export async function editInitiative(id: string, formData: FormData) {
  const session = await requireContributor()

  const userId = session.user.id

  await db.update(initiatives).set({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled') || 'proposed',
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
    visibility: (formData.get('visibility') as 'org' | 'connections' | 'instance') || 'org',
    updatedBy: userId,
    updatedAt: new Date(),
  }).where(eq(initiatives.id, id))

  // Replace capability junctions
  await db.delete(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, id))
  const capabilityEntries = buildCapabilityEntries(formData, id)
  if (capabilityEntries.length > 0) {
    await db.insert(initiativeCapabilities).values(capabilityEntries).onConflictDoNothing()
  }

  // Replace objective junctions
  await db.delete(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, id))
  const objectiveIds = formData.getAll('objectiveIds') as string[]
  if (objectiveIds.length > 0) {
    await db.insert(initiativeObjectives)
      .values(objectiveIds.map(objectiveId => ({ initiativeId: id, objectiveId })))
      .onConflictDoNothing()
  }
}

export async function deleteInitiative(id: string) {
  await requireAdmin()
  await db.delete(initiatives).where(eq(initiatives.id, id))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCapabilityEntries(formData: FormData, initiativeId: string) {
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  return capabilityIds.map(capabilityId => ({
    initiativeId,
    capabilityId,
    impact: (formData.get(`impact_${capabilityId}`) as string) || null,
  }))
}
