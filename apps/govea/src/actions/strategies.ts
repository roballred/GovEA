'use server'

import { db } from '@/db/client'
import { strategies } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
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

export async function getStrategies(organizationId: string, role?: string) {
  const connectedOrgIds = await getConnectedOrgIds(organizationId)
  const isViewer = role === 'viewer'

  return db.query.strategies.findMany({
    where: (s, { eq, or, and, inArray, ne }) => {
      const base = eq(s.organizationId, organizationId)
      const instanceWide = eq(s.visibility, 'instance')
      // A proposed strategy is not a viewer-visible root (design §4 / ADR-0005).
      const statusFilter = isViewer ? ne(s.status, 'proposed') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(s.organizationId, connectedOrgIds), inArray(s.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
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
