'use server'

import { db } from '@/db/client'
import { strategies } from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type StrategyStatus = 'draft' | 'adopted' | 'superseded' | 'retired'
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
      // A draft strategy is not a viewer-visible root (design §4 / Q5).
      const statusFilter = isViewer ? ne(s.status, 'draft') : undefined
      const orgFilter = connectedOrgIds.length === 0
        ? or(base, instanceWide)
        : or(base, instanceWide, and(inArray(s.organizationId, connectedOrgIds), inArray(s.visibility, ['connections', 'instance'])))
      return statusFilter ? and(orgFilter, statusFilter) : orgFilter
    },
    orderBy: (s, { asc }) => [asc(s.name)],
    with: {
      organization: true,
      owner: true,
      goals: true,
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
      goals: { with: { goalObjectives: { with: { objective: true } } } },
    },
  })

  if (!strategy) return null
  const visible = await canReadFederatedEntity(strategy.organizationId, strategy.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && strategy.status === 'draft') return null
  return strategy
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
  const status = ((formData.get('status') as StrategyStatus) ?? 'draft')
  const visibility = ((formData.get('visibility') as Visibility) ?? 'org')
  const startDate = parseDate(formData.get('startDate'))
  const endDate = parseDate(formData.get('endDate'))

  // Adoption is a governance act — it routes through adoptStrategy so the prior
  // adopted strategy is superseded in the same tx. A bare create may not adopt.
  if (status === 'adopted') {
    throw new Error('Use adoptStrategy to adopt a strategy')
  }

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

  // Editing never adopts — that path supersedes the prior adopted strategy and
  // belongs to adoptStrategy. Keeps the single adoption code path.
  if (status === 'adopted') {
    throw new Error('Use adoptStrategy to adopt a strategy')
  }

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

/**
 * Adopt a strategy as the org's current strategy. Supersedes whatever was
 * adopted before, in the same transaction, so the single-adopted invariant
 * (ADR-0004 / partial unique index) holds without the user ever hitting a
 * constraint error. Idempotent: adopting the already-adopted strategy is a
 * no-op that still records an audit entry.
 */
export async function adoptStrategy(strategyId: string) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const target = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(target?.organizationId, orgId)
  if (!target) throw new Error('Strategy not found')

  await db.transaction(async (tx) => {
    // Supersede the currently-adopted strategy (if any, and not this one) FIRST,
    // so the partial unique index is never momentarily violated.
    const superseded = await tx.update(strategies)
      .set({ status: 'superseded', updatedBy: session.user.id, updatedAt: new Date() })
      .where(and(
        eq(strategies.organizationId, orgId),
        eq(strategies.status, 'adopted'),
        ne(strategies.id, strategyId),
      ))
      .returning({ id: strategies.id, name: strategies.name })

    await tx.update(strategies)
      .set({ status: 'adopted', updatedBy: session.user.id, updatedAt: new Date() })
      .where(and(eq(strategies.id, strategyId), eq(strategies.organizationId, orgId)))

    for (const prior of superseded) {
      await writeAuditLog(tx, {
        action: 'strategy.supersede', entityType: 'strategy', entityId: prior.id,
        userId: session.user.id, organizationId: orgId,
        before: { status: 'adopted' }, after: { status: 'superseded', supersededBy: strategyId },
      })
    }

    await writeAuditLog(tx, {
      action: 'strategy.adopt', entityType: 'strategy', entityId: strategyId,
      userId: session.user.id, organizationId: orgId,
      before: { status: target.status }, after: { status: 'adopted' },
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
    // goals.strategy_id is ON DELETE SET NULL — member goals are orphaned, not deleted.
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
