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

// ── CSV import (#748) ───────────────────────────────────────────────────────
// Mirrors importCapabilities: `name` is the case-insensitive upsert key; rows
// are validated before the transaction; `objectives` is a semicolon list of
// strategic-objective names resolved within the caller's org (unknown names are
// row warnings, not failures); `dryRun` returns counts + errors without writing.

export type GoalImportResult = { created: number; updated: number; skipped: number; errors: string[] }

const VALID_GOAL_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_GOAL_VISIBILITY = new Set(['org', 'connections', 'instance'])

export async function importGoals(formData: FormData, dryRun = false): Promise<GoalImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }
  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgObjectives] = await Promise.all([
    db.query.goals.findMany({ where: eq(goals.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.strategicObjectives.findMany({ where: eq(strategicObjectives.organizationId, orgId), columns: { id: true, name: true } }),
  ])
  const existingByName = new Map(existing.map(g => [g.name.toLowerCase(), g.id]))
  const objectiveIdByName = new Map(orgObjectives.map(o => [o.name.toLowerCase(), o.id]))

  type ValidRow = {
    name: string
    description: string | null
    planningHorizon: string | null
    owner: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    objectiveIds: string[]
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
    if (!VALID_GOAL_STATUS.has(status)) { errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue }
    if (!VALID_GOAL_VISIBILITY.has(visibility)) { errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue }

    const objectiveIds: string[] = []
    for (const objName of splitSemicolonList(row['objectives'])) {
      const id = objectiveIdByName.get(objName.toLowerCase())
      if (id) objectiveIds.push(id)
      else errors.push(`Row ${rowNum}: objective "${objName}" not found in this org — skipped`)
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++
    validRows.push({
      name,
      description: row['description'] || null,
      planningHorizon: row['planning_horizon'] || null,
      owner: row['owner'] || null,
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      objectiveIds: [...new Set(objectiveIds)],
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let goalId = r.existingId
        if (goalId) {
          await tx.update(goals).set({
            description: r.description, planningHorizon: r.planningHorizon, owner: r.owner,
            status: r.status, visibility: r.visibility,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(goals.id, goalId), eq(goals.organizationId, orgId)))
          await tx.delete(goalObjectives).where(eq(goalObjectives.goalId, goalId))
        } else {
          const [inserted] = await tx.insert(goals).values({
            name: r.name, description: r.description, planningHorizon: r.planningHorizon, owner: r.owner,
            status: r.status, visibility: r.visibility,
            organizationId: orgId, createdBy: session.user.id, updatedBy: session.user.id,
          }).returning({ id: goals.id })
          goalId = inserted.id
        }
        if (r.objectiveIds.length > 0) {
          await tx.insert(goalObjectives).values(r.objectiveIds.map(objectiveId => ({ goalId: goalId!, objectiveId })))
        }
      }

      await writeAuditLog(tx, {
        action: 'goal.import', entityType: 'goal', entityId: orgId,
        userId: session.user.id, organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
