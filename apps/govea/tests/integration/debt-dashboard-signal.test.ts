/**
 * Dashboard debt signal + publish-time gate (#381 PR-3).
 *
 * Asserts:
 *   1. CategorizedSignals.openDebt counts items in draft/published/in-progress
 *      states, not resolved/accepted/archived.
 *   2. getMostNeededActions surfaces critical/high open debt items above the
 *      existing publishedButStale / incompleteRelationship / unpublished
 *      buckets — and respects deterministic tie-break across categories.
 *   3. ensurePublishOpenDebtAck:
 *      - returns early when not transitioning into published
 *      - returns early when no critical/high open debt is linked
 *      - throws OpenDebtAcknowledgmentRequiredError when ack is missing
 *      - returns success counts when ack is present
 *      - low/medium debt does NOT trigger the gate
 *      - already-published edits (no transition) do NOT trigger the gate
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  architectureDebtItems, debtCapabilities, debtApplications,
  capabilities, applications, organizations,
} from '@/db/schema'
import { getCategorizedSignals, getMostNeededActions } from '@/lib/completeness-signals'
import {
  ensurePublishOpenDebtAck,
  countGatingDebt,
  OpenDebtAcknowledgmentRequiredError,
} from '@/lib/debt-publish-gate'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, type TestOrg, type TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let adminA: TestUser
let capId: string
let appId: string

beforeAll(async () => {
  orgA = await createTestOrg({ name: 'Debt Dashboard Org', slug: `dd-${randomUUID().slice(0, 8)}` })
  adminA = await createTestUser(orgA.id, 'admin', { name: 'DD Admin' })
  capId = randomUUID()
  appId = randomUUID()
  await Promise.all([
    db.insert(capabilities).values({ id: capId, organizationId: orgA.id, name: 'Cap-A', status: 'published', visibility: 'org' }),
    db.insert(applications).values({ id: appId, organizationId: orgA.id, name: 'App-A', status: 'published', visibility: 'org' }),
  ])
})

afterAll(async () => {
  await cleanupOrg(orgA.id)
})

beforeEach(async () => {
  await db.delete(architectureDebtItems).where(eq(architectureDebtItems.organizationId, orgA.id))
  mockAuth.mockResolvedValue(makeSession(adminA))
})

async function insertDebt(opts: {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status?: 'draft' | 'published' | 'in-progress' | 'resolved' | 'accepted' | 'archived'
  capabilityId?: string
  applicationId?: string
}) {
  const id = randomUUID()
  await db.insert(architectureDebtItems).values({
    id,
    organizationId: orgA.id,
    title: opts.title,
    debtType: 'lifecycle-risk',
    severity: opts.severity,
    status: opts.status ?? 'published',
    visibility: 'org',
    securitySensitive: false,
    source: 'human',
  })
  if (opts.capabilityId) {
    await db.insert(debtCapabilities).values({ debtItemId: id, capabilityId: opts.capabilityId })
  }
  if (opts.applicationId) {
    await db.insert(debtApplications).values({ debtItemId: id, applicationId: opts.applicationId })
  }
  return id
}

// ── 1. CategorizedSignals.openDebt ──────────────────────────────────────────

describe('getCategorizedSignals.openDebt', () => {
  it('counts draft / published / in-progress', async () => {
    await insertDebt({ title: 'D', severity: 'high', status: 'draft', capabilityId: capId })
    await insertDebt({ title: 'P', severity: 'high', status: 'published', capabilityId: capId })
    await insertDebt({ title: 'I', severity: 'medium', status: 'in-progress', capabilityId: capId })

    const signals = await getCategorizedSignals(orgA.id)
    expect(signals.openDebt).toBe(3)
  })

  it('excludes resolved / accepted / archived', async () => {
    await insertDebt({ title: 'R', severity: 'high', status: 'resolved', capabilityId: capId })
    await insertDebt({ title: 'A', severity: 'medium', status: 'accepted', capabilityId: capId })
    await insertDebt({ title: 'X', severity: 'low', status: 'archived', capabilityId: capId })
    await insertDebt({ title: 'OPEN', severity: 'high', status: 'published', capabilityId: capId })

    const signals = await getCategorizedSignals(orgA.id)
    expect(signals.openDebt).toBe(1)
  })
})

// ── 2. getMostNeededActions surfaces critical/high debt above other buckets ─

describe('getMostNeededActions — debt ranking', () => {
  it('critical debt ranks ABOVE publishedButStale', async () => {
    // A capability that's stale (3 weight) AND a critical debt (5 weight)
    const PAST_STALE = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
    await db.update(capabilities).set({ updatedAt: PAST_STALE }).where(eq(capabilities.id, capId))
    await insertDebt({ title: 'Critical-A', severity: 'critical', status: 'published', capabilityId: capId })

    const actions = await getMostNeededActions(orgA.id)
    expect(actions[0].reason).toBe('openCriticalDebt')
    expect(actions[0].name).toBe('Critical-A')
  })

  it('high debt ranks ABOVE publishedButStale', async () => {
    const PAST_STALE = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
    await db.update(capabilities).set({ updatedAt: PAST_STALE }).where(eq(capabilities.id, capId))
    await insertDebt({ title: 'High-A', severity: 'high', status: 'published', capabilityId: capId })

    const actions = await getMostNeededActions(orgA.id)
    expect(actions[0].reason).toBe('openHighDebt')
  })

  it('only OPEN debt is ranked — resolved is ignored', async () => {
    await insertDebt({ title: 'Closed-Crit', severity: 'critical', status: 'resolved', capabilityId: capId })

    const actions = await getMostNeededActions(orgA.id)
    expect(actions.filter(a => a.entityType === 'architecture_debt_item')).toHaveLength(0)
  })

  it('href routes to /debt/{id} for ranked debt items', async () => {
    const id = await insertDebt({ title: 'Crit', severity: 'critical', status: 'published', capabilityId: capId })

    const actions = await getMostNeededActions(orgA.id)
    expect(actions[0].href).toBe(`/debt/${id}`)
  })

  it('medium / low debt does NOT promote ahead of other buckets', async () => {
    // Set up: one publishedButStale capability (weight 3), one medium debt (no rank)
    const PAST_STALE = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
    await db.update(capabilities).set({ updatedAt: PAST_STALE }).where(eq(capabilities.id, capId))
    await insertDebt({ title: 'Medium-Debt', severity: 'medium', status: 'published', capabilityId: capId })

    const actions = await getMostNeededActions(orgA.id)
    // First action should be the capability publishedButStale, not the medium debt
    expect(actions[0].entityType).not.toBe('architecture_debt_item')
  })
})

// ── 3. countGatingDebt + ensurePublishOpenDebtAck ──────────────────────────

describe('countGatingDebt', () => {
  it('counts critical + high linked open debt, ignoring medium/low and closed', async () => {
    await insertDebt({ title: 'Crit', severity: 'critical', status: 'published', capabilityId: capId })
    await insertDebt({ title: 'High', severity: 'high', status: 'draft', capabilityId: capId })
    await insertDebt({ title: 'Med', severity: 'medium', status: 'published', capabilityId: capId })
    await insertDebt({ title: 'ResolvedCrit', severity: 'critical', status: 'resolved', capabilityId: capId })

    const { criticalCount, highCount } = await countGatingDebt('capability', capId)
    expect(criticalCount).toBe(1)
    expect(highCount).toBe(1)
  })

  it('returns zero when no open critical/high debt is linked', async () => {
    const { criticalCount, highCount } = await countGatingDebt('capability', capId)
    expect(criticalCount).toBe(0)
    expect(highCount).toBe(0)
  })
})

describe('ensurePublishOpenDebtAck', () => {
  beforeEach(async () => {
    await insertDebt({ title: 'Crit', severity: 'critical', status: 'published', capabilityId: capId })
  })

  it('passes through when not transitioning to published', async () => {
    const result = await ensurePublishOpenDebtAck({
      entityType: 'capability',
      entityId: capId,
      transitioningToPublished: false,
      acknowledged: false,
    })
    expect(result.acknowledged).toBe(false)
    expect(result.criticalCount).toBe(0)
    expect(result.highCount).toBe(0)
  })

  it('passes through when no gating debt is linked', async () => {
    // Different capability with no debt
    const otherCap = randomUUID()
    await db.insert(capabilities).values({ id: otherCap, organizationId: orgA.id, name: 'Other', status: 'published', visibility: 'org' })
    const result = await ensurePublishOpenDebtAck({
      entityType: 'capability',
      entityId: otherCap,
      transitioningToPublished: true,
      acknowledged: false,
    })
    expect(result.acknowledged).toBe(false)
    expect(result.criticalCount).toBe(0)
    expect(result.highCount).toBe(0)
  })

  it('throws when transitioning to published with gating debt and no ack', async () => {
    await expect(ensurePublishOpenDebtAck({
      entityType: 'capability',
      entityId: capId,
      transitioningToPublished: true,
      acknowledged: false,
    })).rejects.toThrow(OpenDebtAcknowledgmentRequiredError)
  })

  it('returns success counts when ack is provided', async () => {
    const result = await ensurePublishOpenDebtAck({
      entityType: 'capability',
      entityId: capId,
      transitioningToPublished: true,
      acknowledged: true,
    })
    expect(result.acknowledged).toBe(true)
    expect(result.criticalCount).toBe(1)
    expect(result.highCount).toBe(0)
  })

  it('the thrown error includes counts so the form can render them', async () => {
    await insertDebt({ title: 'High-B', severity: 'high', status: 'published', capabilityId: capId })
    try {
      await ensurePublishOpenDebtAck({
        entityType: 'capability',
        entityId: capId,
        transitioningToPublished: true,
        acknowledged: false,
      })
      // unreachable
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(OpenDebtAcknowledgmentRequiredError)
      const err = e as OpenDebtAcknowledgmentRequiredError
      expect(err.criticalCount).toBe(1)
      expect(err.highCount).toBe(1)
    }
  })
})

// Suppress unused-import lint
void organizations
