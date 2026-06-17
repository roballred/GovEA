'use server'

import { db } from '@/db/client'
import { goals, goalObjectives, strategicObjectives, objectiveCapabilities, initiativeObjectives } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

export async function getGoals(organizationId: string, role?: string, scope: ListScope = 'org') {
  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []
  const isViewer = role === 'viewer'

  return db.query.goals.findMany({
    where: () => {
      const vis = listScopeFilter(goals, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(goals.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    orderBy: (g, { asc }) => [asc(g.name)],
    with: {
      organization: true,
      goalObjectives: { with: { objective: true } },
    },
  })
}

export async function getGoal(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const goal = await db.query.goals.findFirst({
    where: (g, { eq }) => eq(g.id, id),
    with: {
      strategyGoals: { with: { strategy: true } },
      goalObjectives: {
        with: {
          objective: {
            with: {
              objectiveCapabilities: { with: { capability: true } },
              initiativeObjectives: { with: { initiative: true } },
            },
          },
        },
      },
    },
  })

  if (!goal) return null
  const visible = await canReadFederatedEntity(goal.organizationId, goal.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && goal.status !== 'published') return null
  return goal
}

export async function createGoal(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const planningHorizon = (formData.get('planningHorizon') as string) || null
  const owner = (formData.get('owner') as string) || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const objectiveIds = formData.getAll('objectiveIds') as string[]

  await db.transaction(async (tx) => {
    const [goal] = await tx.insert(goals).values({
      name, description, planningHorizon, owner, status, visibility,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    if (objectiveIds.length > 0) {
      await tx.insert(goalObjectives).values(
        objectiveIds.map(oId => ({ goalId: goal.id, objectiveId: oId }))
      )
    }

    await writeAuditLog(tx, {
      action: 'goal.create', entityType: 'goal', entityId: goal.id,
      userId: session.user.id, organizationId: orgId, after: { name, status },
    })
  })

  revalidatePath('/goals')
}

export async function editGoal(goalId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const planningHorizon = (formData.get('planningHorizon') as string) || null
  const owner = (formData.get('owner') as string) || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const objectiveIds = formData.getAll('objectiveIds') as string[]

  const before = await db.query.goals.findFirst({ where: eq(goals.id, goalId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.update(goals).set({
      name, description, planningHorizon, owner, status, visibility,
      updatedBy: session.user.id, updatedAt: new Date(),
    }).where(and(eq(goals.id, goalId), eq(goals.organizationId, orgId)))

    await tx.delete(goalObjectives).where(eq(goalObjectives.goalId, goalId))
    if (objectiveIds.length > 0) {
      await tx.insert(goalObjectives).values(
        objectiveIds.map(oId => ({ goalId, objectiveId: oId }))
      )
    }

    await writeAuditLog(tx, {
      action: 'goal.edit', entityType: 'goal', entityId: goalId,
      userId: session.user.id, organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status },
    })
  })

  revalidatePath('/goals')
  revalidatePath(`/goals/${goalId}`)
}

export async function deleteGoal(goalId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.goals.findFirst({ where: eq(goals.id, goalId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(goals).where(
      and(eq(goals.id, goalId), eq(goals.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'goal.delete', entityType: 'goal', entityId: goalId,
      userId: session.user.id, organizationId: orgId, before: { name: before?.name },
    })
  })

  revalidatePath('/goals')
}
