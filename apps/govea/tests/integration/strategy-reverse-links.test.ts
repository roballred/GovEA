/**
 * Integration tests: reverse Strategy affordances (#829 / ADR-0005 R3)
 *
 * The reverse actions drive the same junctions from the other entity's page.
 * They delegate to the strategy-first actions, so these tests confirm the
 * reverse direction links/unlinks the right row and keeps role + org guards.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  linkGoalStrategy, unlinkGoalStrategy,
  linkCapabilityStrategy, unlinkCapabilityStrategy,
  linkValueStreamStrategy,
  linkInitiativeStrategy, unlinkInitiativeStrategy,
} from '@/actions/links'
import { db } from '@/db/client'
import { strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertStrategy, insertGoal, insertCapability, insertValueStream, insertInitiative,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('reverse strategy affordances', () => {
  let orgId: string
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeSession(contributor))
  })

  it('linkGoalStrategy / unlinkGoalStrategy drives the strategy_goals junction', async () => {
    const s = await insertStrategy(orgId, { name: 'Rev Goal Strat' })
    const g = await insertGoal(orgId, { name: 'Rev Goal' })
    await linkGoalStrategy(g.id, s.id)
    let rows = await db.select().from(strategyGoals)
      .where(and(eq(strategyGoals.strategyId, s.id), eq(strategyGoals.goalId, g.id)))
    expect(rows).toHaveLength(1)
    await unlinkGoalStrategy(g.id, s.id)
    rows = await db.select().from(strategyGoals)
      .where(and(eq(strategyGoals.strategyId, s.id), eq(strategyGoals.goalId, g.id)))
    expect(rows).toHaveLength(0)
  })

  it('linkCapabilityStrategy / unlink drives the strategy_capabilities junction', async () => {
    const s = await insertStrategy(orgId, { name: 'Rev Cap Strat' })
    const c = await insertCapability(orgId, { name: 'Rev Cap' })
    await linkCapabilityStrategy(c.id, s.id)
    let rows = await db.select().from(strategyCapabilities)
      .where(and(eq(strategyCapabilities.strategyId, s.id), eq(strategyCapabilities.capabilityId, c.id)))
    expect(rows).toHaveLength(1)
    await unlinkCapabilityStrategy(c.id, s.id)
    rows = await db.select().from(strategyCapabilities)
      .where(and(eq(strategyCapabilities.strategyId, s.id), eq(strategyCapabilities.capabilityId, c.id)))
    expect(rows).toHaveLength(0)
  })

  it('linkValueStreamStrategy drives the strategy_value_streams junction', async () => {
    const s = await insertStrategy(orgId, { name: 'Rev VS Strat' })
    const v = await insertValueStream(orgId, { name: 'Rev VS' })
    await linkValueStreamStrategy(v.id, s.id)
    const rows = await db.select().from(strategyValueStreams)
      .where(and(eq(strategyValueStreams.strategyId, s.id), eq(strategyValueStreams.valueStreamId, v.id)))
    expect(rows).toHaveLength(1)
  })

  it('linkInitiativeStrategy / unlink drives the strategy_initiatives junction', async () => {
    const s = await insertStrategy(orgId, { name: 'Rev Init Strat' })
    const i = await insertInitiative(orgId, { name: 'Rev Init' })
    await linkInitiativeStrategy(i.id, s.id)
    let rows = await db.select().from(strategyInitiatives)
      .where(and(eq(strategyInitiatives.strategyId, s.id), eq(strategyInitiatives.initiativeId, i.id)))
    expect(rows).toHaveLength(1)
    await unlinkInitiativeStrategy(i.id, s.id)
    rows = await db.select().from(strategyInitiatives)
      .where(and(eq(strategyInitiatives.strategyId, s.id), eq(strategyInitiatives.initiativeId, i.id)))
    expect(rows).toHaveLength(0)
  })

  it('viewer cannot link from the reverse side → Forbidden', async () => {
    const s = await insertStrategy(orgId, { name: 'Rev Block Strat' })
    const c = await insertCapability(orgId, { name: 'Rev Block Cap' })
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(linkCapabilityStrategy(c.id, s.id)).rejects.toThrow('Forbidden')
  })

  it('rejects a cross-org strategy from the reverse side', async () => {
    const otherOrg = await createTestOrg()
    const foreignStrategy = await insertStrategy(otherOrg.id, { name: 'Foreign Rev Strat' })
    const g = await insertGoal(orgId, { name: 'Rev Goal X' })
    await expect(linkGoalStrategy(g.id, foreignStrategy.id)).rejects.toThrow()
    await cleanupOrg(otherOrg.id)
  })
})
