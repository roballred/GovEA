/**
 * Integration tests: Strategy traceability root (#820 / #805 slice 4)
 *
 * Covers getStrategyTrace:
 *  - builds the chain Strategy → Goals → Objectives → Initiatives/Capabilities
 *  - viewer pruning (design Q5): a draft strategy is not a viewer-visible root
 *  - member goals prune to published for viewers
 *  - unknown / cross-org id → null
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getStrategyTrace } from '@/actions/traceability'
import { db } from '@/db/client'
import {
  strategies, goals, strategicObjectives, capabilities, initiatives,
  goalObjectives, objectiveCapabilities, initiativeObjectives,
} from '@/db/schema'
import { randomUUID } from 'node:crypto'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('getStrategyTrace', () => {
  let orgId: string
  let contributor: TestUser
  let viewer: TestUser
  let strategyId: string

  // ids for assertions
  let publishedGoalId: string
  let draftGoalId: string
  let objectiveId: string
  let capabilityId: string
  let initiativeId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])

    const [s] = await db.insert(strategies).values({
      organizationId: orgId, name: 'FY26 Strategy', status: 'adopted', visibility: 'org',
    }).returning()
    strategyId = s.id

    // Two member goals: one published (viewer-visible), one draft (pruned for viewers).
    const [pg] = await db.insert(goals).values({
      organizationId: orgId, name: 'Published Member Goal', status: 'published', visibility: 'org', strategyId,
    }).returning()
    publishedGoalId = pg.id
    const [dg] = await db.insert(goals).values({
      organizationId: orgId, name: 'Draft Member Goal', status: 'draft', visibility: 'org', strategyId,
    }).returning()
    draftGoalId = dg.id

    const [o] = await db.insert(strategicObjectives).values({
      organizationId: orgId, name: 'Measurable Objective', status: 'published', visibility: 'org',
    }).returning()
    objectiveId = o.id
    const [c] = await db.insert(capabilities).values({
      organizationId: orgId, name: 'Foundation Capability', status: 'published', visibility: 'org',
    }).returning()
    capabilityId = c.id
    const [i] = await db.insert(initiatives).values({
      organizationId: orgId, name: 'Delivery Initiative', status: 'active', visibility: 'org',
    }).returning()
    initiativeId = i.id

    // Wire the chain: publishedGoal → objective → capability; initiative → objective.
    await db.insert(goalObjectives).values({ goalId: publishedGoalId, objectiveId })
    await db.insert(objectiveCapabilities).values({ objectiveId, capabilityId })
    await db.insert(initiativeObjectives).values({ initiativeId, objectiveId })
  })

  afterAll(() => cleanupOrg(orgId))

  it('builds the full chain for a non-viewer', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const trace = await getStrategyTrace(strategyId)

    expect(trace).not.toBeNull()
    expect(trace!.kind).toBe('strategy')
    expect(trace!.name).toBe('FY26 Strategy')

    // Both goals visible to a contributor.
    expect(trace!.goals.map(g => g.id).sort()).toEqual([publishedGoalId, draftGoalId].sort())

    const published = trace!.goals.find(g => g.id === publishedGoalId)!
    expect(published.objectives.map(o => o.id)).toContain(objectiveId)
    const obj = published.objectives.find(o => o.id === objectiveId)!
    expect(obj.capabilities.map(c => c.id)).toContain(capabilityId)
    expect(obj.initiatives.map(i => i.id)).toContain(initiativeId)
  })

  it('prunes draft member goals for viewers', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const trace = await getStrategyTrace(strategyId)

    expect(trace).not.toBeNull()
    const ids = trace!.goals.map(g => g.id)
    expect(ids).toContain(publishedGoalId)
    expect(ids).not.toContain(draftGoalId)
  })

  it('a draft strategy is not a viewer-visible root → null', async () => {
    const [draftStrategy] = await db.insert(strategies).values({
      organizationId: orgId, name: 'Draft Strategy', status: 'draft', visibility: 'org',
    }).returning()

    mockAuth.mockResolvedValue(makeSession(viewer))
    expect(await getStrategyTrace(draftStrategy.id)).toBeNull()

    // …but a non-viewer can trace it.
    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(draftStrategy.id)).not.toBeNull()
  })

  it('returns null for an unknown id', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(randomUUID())).toBeNull()
  })

  it('returns null for a strategy in another org', async () => {
    const otherOrg = await createTestOrg()
    const [foreign] = await db.insert(strategies).values({
      organizationId: otherOrg.id, name: 'Foreign Strategy', status: 'adopted', visibility: 'org',
    }).returning()

    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(foreign.id)).toBeNull()
    await cleanupOrg(otherOrg.id)
  })
})
