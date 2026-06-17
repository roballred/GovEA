'use server'

import { db } from '@/db/client'
import {
  strategies, strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives,
  goals, capabilities, valueStreams, initiatives, users,
} from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type StrategyStatus = 'proposed' | 'active' | 'achieved' | 'abandoned'
type Visibility = 'org' | 'connections' | 'instance'

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

export async function getStrategies(organizationId: string, role?: string, scope: ListScope = 'org') {
  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []
  const isViewer = role === 'viewer'

  return db.query.strategies.findMany({
    where: () => {
      const vis = listScopeFilter(strategies, { orgId: organizationId, scope, connectedOrgIds })
      // A proposed strategy is not a viewer-visible root (design §4 / ADR-0005).
      const statusFilter = isViewer ? ne(strategies.status, 'proposed') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    orderBy: (s, { asc }) => [asc(s.name)],
    with: {
      organization: true,
      owner: true,
      strategyGoals: true,
    },
  })
}

export async function getStrategy(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const strategy = await db.query.strategies.findFirst({
    where: (s, { eq }) => eq(s.id, id),
    with: {
      owner: true,
      strategyGoals: { with: { goal: true } },
      strategyCapabilities: { with: { capability: true } },
      strategyValueStreams: { with: { valueStream: true } },
      strategyInitiatives: { with: { initiative: true } },
    },
  })

  if (!strategy) return null
  const visible = await canReadFederatedEntity(strategy.organizationId, strategy.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && strategy.status === 'proposed') return null
  return strategy
}

/**
 * Active (status='active') strategies for an org, with the goals they pursue and
 * their impact/delivery links. Backs the executive / roadmap / dashboard
 * "active strategies" surfaces (ADR-0005 R5). Org-scoped; multiple strategies can
 * be active at once (the course-of-action model has no single "current" one).
 */
export async function getActiveStrategies(organizationId: string) {
  return db.query.strategies.findMany({
    where: (s, { eq, and }) => and(eq(s.organizationId, organizationId), eq(s.status, 'active')),
    orderBy: (s, { asc }) => [asc(s.name)],
    with: {
      strategyGoals: { with: { goal: true } },
      strategyCapabilities: true,
      strategyValueStreams: true,
      strategyInitiatives: true,
    },
  })
}

function parseDate(value: FormDataEntryValue | null): string | null {
  const v = (value as string)?.trim()
  return v ? v : null
}

export async function createStrategy(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const summary = (formData.get('summary') as string) || null
  const planningHorizon = (formData.get('planningHorizon') as string) || null
  const ownerUserId = (formData.get('ownerUserId') as string) || null
  const status = ((formData.get('status') as StrategyStatus) ?? 'proposed')
  const visibility = ((formData.get('visibility') as Visibility) ?? 'org')
  const startDate = parseDate(formData.get('startDate'))
  const endDate = parseDate(formData.get('endDate'))

  await db.transaction(async (tx) => {
    const [strategy] = await tx.insert(strategies).values({
      name, summary, planningHorizon, ownerUserId, status, visibility, startDate, endDate,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    await writeAuditLog(tx, {
      action: 'strategy.create', entityType: 'strategy', entityId: strategy.id,
      userId: session.user.id, organizationId: orgId, after: { name, status },
    })
  })

  revalidatePath('/strategies')
}

export async function editStrategy(strategyId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const summary = (formData.get('summary') as string) || null
  const planningHorizon = (formData.get('planningHorizon') as string) || null
  const ownerUserId = (formData.get('ownerUserId') as string) || null
  const status = formData.get('status') as StrategyStatus
  const visibility = formData.get('visibility') as Visibility
  const startDate = parseDate(formData.get('startDate'))
  const endDate = parseDate(formData.get('endDate'))

  const before = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.update(strategies).set({
      name, summary, planningHorizon, ownerUserId, status, visibility, startDate, endDate,
      updatedBy: session.user.id, updatedAt: new Date(),
    }).where(and(eq(strategies.id, strategyId), eq(strategies.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'strategy.edit', entityType: 'strategy', entityId: strategyId,
      userId: session.user.id, organizationId: orgId,
      before: { name: before?.name, status: before?.status },
      after: { name, status },
    })
  })

  revalidatePath('/strategies')
  revalidatePath(`/strategies/${strategyId}`)
}

export async function deleteStrategy(strategyId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    // Junction rows (strategy_goals/_capabilities/_value_streams/_initiatives)
    // cascade on delete; the linked goals/capabilities/etc. are untouched.
    await tx.delete(strategies).where(
      and(eq(strategies.id, strategyId), eq(strategies.organizationId, orgId)),
    )

    await writeAuditLog(tx, {
      action: 'strategy.delete', entityType: 'strategy', entityId: strategyId,
      userId: session.user.id, organizationId: orgId, before: { name: before?.name },
    })
  })

  revalidatePath('/strategies')
}

// ── CSV import (#748) ───────────────────────────────────────────────────────
// `name` is the case-insensitive upsert key. `owner_email` resolves to an org
// user; `goals`, `capabilities`, `value_streams`, `initiatives` resolve names
// within the caller's org (unknown keys are row warnings). `dryRun` writes nothing.

export type StrategyImportResult = { created: number; updated: number; skipped: number; errors: string[] }

const VALID_STRATEGY_STATUS = new Set(['proposed', 'active', 'achieved', 'abandoned'])
const VALID_STRATEGY_VISIBILITY = new Set(['org', 'connections', 'instance'])

export async function importStrategies(formData: FormData, dryRun = false): Promise<StrategyImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }
  const rows = parseCsv(await file.text())
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const [existing, orgGoals, orgCaps, orgVs, orgInits, orgUsers] = await Promise.all([
    db.query.strategies.findMany({ where: eq(strategies.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.goals.findMany({ where: eq(goals.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.capabilities.findMany({ where: eq(capabilities.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.valueStreams.findMany({ where: eq(valueStreams.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.initiatives.findMany({ where: eq(initiatives.organizationId, orgId), columns: { id: true, name: true } }),
    db.query.users.findMany({ where: eq(users.organizationId, orgId), columns: { id: true, email: true } }),
  ])
  const existingByName = new Map(existing.map(s => [s.name.toLowerCase(), s.id]))
  const goalIdByName = new Map(orgGoals.map(g => [g.name.toLowerCase(), g.id]))
  const capIdByName = new Map(orgCaps.map(c => [c.name.toLowerCase(), c.id]))
  const vsIdByName = new Map(orgVs.map(v => [v.name.toLowerCase(), v.id]))
  const initIdByName = new Map(orgInits.map(i => [i.name.toLowerCase(), i.id]))
  const userIdByEmail = new Map(orgUsers.filter(u => u.email).map(u => [u.email!.toLowerCase(), u.id]))

  type ValidRow = {
    name: string
    summary: string | null
    planningHorizon: string | null
    status: 'proposed' | 'active' | 'achieved' | 'abandoned'
    visibility: 'org' | 'connections' | 'instance'
    ownerUserId: string | null
    startDate: string | null
    endDate: string | null
    goalIds: string[]
    capabilityIds: string[]
    valueStreamIds: string[]
    initiativeIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const status = (row['status'] || 'proposed').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()
    if (!VALID_STRATEGY_STATUS.has(status)) { errors.push(`Row ${rowNum}: invalid status "${status}"`); skipped++; continue }
    if (!VALID_STRATEGY_VISIBILITY.has(visibility)) { errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`); skipped++; continue }

    let ownerUserId: string | null = null
    const ownerEmail = row['owner_email']?.trim()
    if (ownerEmail) {
      const id = userIdByEmail.get(ownerEmail.toLowerCase())
      if (id) ownerUserId = id
      else errors.push(`Row ${rowNum}: owner "${ownerEmail}" not found in this org — left unset`)
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
      summary: row['summary'] || null,
      planningHorizon: row['planning_horizon'] || null,
      status: status as ValidRow['status'],
      visibility: visibility as ValidRow['visibility'],
      ownerUserId,
      startDate: row['start_date'] || null,
      endDate: row['end_date'] || null,
      goalIds: resolve('goals', goalIdByName, 'goal'),
      capabilityIds: resolve('capabilities', capIdByName, 'capability'),
      valueStreamIds: resolve('value_streams', vsIdByName, 'value stream'),
      initiativeIds: resolve('initiatives', initIdByName, 'initiative'),
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let strategyId = r.existingId
        if (strategyId) {
          await tx.update(strategies).set({
            summary: r.summary, planningHorizon: r.planningHorizon, ownerUserId: r.ownerUserId,
            status: r.status, visibility: r.visibility, startDate: r.startDate, endDate: r.endDate,
            updatedBy: session.user.id, updatedAt: new Date(),
          }).where(and(eq(strategies.id, strategyId), eq(strategies.organizationId, orgId)))
          await tx.delete(strategyGoals).where(eq(strategyGoals.strategyId, strategyId))
          await tx.delete(strategyCapabilities).where(eq(strategyCapabilities.strategyId, strategyId))
          await tx.delete(strategyValueStreams).where(eq(strategyValueStreams.strategyId, strategyId))
          await tx.delete(strategyInitiatives).where(eq(strategyInitiatives.strategyId, strategyId))
        } else {
          const [inserted] = await tx.insert(strategies).values({
            name: r.name, summary: r.summary, planningHorizon: r.planningHorizon, ownerUserId: r.ownerUserId,
            status: r.status, visibility: r.visibility, startDate: r.startDate, endDate: r.endDate,
            organizationId: orgId, createdBy: session.user.id, updatedBy: session.user.id,
          }).returning({ id: strategies.id })
          strategyId = inserted.id
        }
        if (r.goalIds.length > 0) {
          await tx.insert(strategyGoals).values(r.goalIds.map(goalId => ({ strategyId: strategyId!, goalId })))
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(strategyCapabilities).values(r.capabilityIds.map(capabilityId => ({ strategyId: strategyId!, capabilityId })))
        }
        if (r.valueStreamIds.length > 0) {
          await tx.insert(strategyValueStreams).values(r.valueStreamIds.map(valueStreamId => ({ strategyId: strategyId!, valueStreamId })))
        }
        if (r.initiativeIds.length > 0) {
          await tx.insert(strategyInitiatives).values(r.initiativeIds.map(initiativeId => ({ strategyId: strategyId!, initiativeId })))
        }
      }

      await writeAuditLog(tx, {
        action: 'strategy.import', entityType: 'strategy', entityId: orgId,
        userId: session.user.id, organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
