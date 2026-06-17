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
import { getStrategyTrace, getGoalTrace } from '@/actions/traceability'
import { db } from '@/db/client'
import {
  strategies, goals, strategicObjectives, capabilities, initiatives, valueStreams,
  goalObjectives, objectiveCapabilities, initiativeObjectives, strategyGoals,
  strategyCapabilities, strategyValueStreams, strategyInitiatives,
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
  // direct course-of-action links
  let directCapId: string
  let directVsId: string
  let directInitId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])

    const [s] = await db.insert(strategies).values({
      organizationId: orgId, name: 'FY26 Strategy', status: 'active', visibility: 'org',
    }).returning()
    strategyId = s.id

    // Two pursued goals: one published (viewer-visible), one draft (pruned for viewers).
    const [pg] = await db.insert(goals).values({
      organizationId: orgId, name: 'Published Member Goal', status: 'published', visibility: 'org',
    }).returning()
    publishedGoalId = pg.id
    const [dg] = await db.insert(goals).values({
      organizationId: orgId, name: 'Draft Member Goal', status: 'draft', visibility: 'org',
    }).returning()
    draftGoalId = dg.id
    await db.insert(strategyGoals).values([
      { strategyId, goalId: publishedGoalId },
      { strategyId, goalId: draftGoalId },
    ])

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

    // Direct course-of-action links (ADR-0005 R4): strategy → capability /
    // value stream / initiative, independent of the goal chain.
    const [dc] = await db.insert(capabilities).values({
      organizationId: orgId, name: 'Directly Impacted Capability', status: 'published', visibility: 'org',
    }).returning()
    directCapId = dc.id
    const [dv] = await db.insert(valueStreams).values({
      organizationId: orgId, name: 'Impacted Value Stream', status: 'published', visibility: 'org',
    }).returning()
    directVsId = dv.id
    const [di] = await db.insert(initiatives).values({
      organizationId: orgId, name: 'Directly Delivering Initiative', status: 'active', visibility: 'org',
    }).returning()
    directInitId = di.id
    await db.insert(strategyCapabilities).values({ strategyId, capabilityId: directCapId })
    await db.insert(strategyValueStreams).values({ strategyId, valueStreamId: directVsId })
    await db.insert(strategyInitiatives).values({ strategyId, initiativeId: directInitId })
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

  it('includes the direct course-of-action impact links (R4)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const trace = await getStrategyTrace(strategyId)

    expect(trace!.valueStreams.map(v => v.id)).toContain(directVsId)
    expect(trace!.directCapabilities.map(c => c.id)).toContain(directCapId)
    expect(trace!.directInitiatives.map(i => i.id)).toContain(directInitId)

    // Direct capability is distinct from the goal-chain capability.
    expect(trace!.directCapabilities.map(c => c.id)).not.toContain(capabilityId)
  })

  it('prunes draft member goals for viewers', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const trace = await getStrategyTrace(strategyId)

    expect(trace).not.toBeNull()
    const ids = trace!.goals.map(g => g.id)
    expect(ids).toContain(publishedGoalId)
    expect(ids).not.toContain(draftGoalId)
  })

  it('a proposed strategy is not a viewer-visible root → null', async () => {
    const [proposedStrategy] = await db.insert(strategies).values({
      organizationId: orgId, name: 'Proposed Strategy', status: 'proposed', visibility: 'org',
    }).returning()

    mockAuth.mockResolvedValue(makeSession(viewer))
    expect(await getStrategyTrace(proposedStrategy.id)).toBeNull()

    // …but a non-viewer can trace it.
    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(proposedStrategy.id)).not.toBeNull()
  })

  it('returns null for an unknown id', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(randomUUID())).toBeNull()
  })

  it('returns null for a strategy in another org', async () => {
    const otherOrg = await createTestOrg()
    const [foreign] = await db.insert(strategies).values({
      organizationId: otherOrg.id, name: 'Foreign Strategy', status: 'active', visibility: 'org',
    }).returning()

    mockAuth.mockResolvedValue(makeSession(contributor))
    expect(await getStrategyTrace(foreign.id)).toBeNull()
    await cleanupOrg(otherOrg.id)
  })
})

// ── Empty traceability roots (#838) ─────────────────────────────────────────────
//
// A traceability root with no downstream relationships must still resolve to a
// renderable trace (the page shows the anchor plus empty-state sections),
// consistent across metamodel entities. Regression guard for the empty-Strategy
// case plus an empty Goal as a second metamodel example.

describe('empty traceability roots (#838)', () => {
  let orgId: string
  let admin: TestUser
  let viewer: TestUser
  let emptyStrategyId: string
  let emptyGoalId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'viewer'),
    ])

    // Active (viewer-visible) strategy with zero links of any kind.
    const [s] = await db.insert(strategies).values({
      organizationId: orgId, name: 'Unlinked Strategy', status: 'active', visibility: 'org',
    }).returning()
    emptyStrategyId = s.id

    // Published goal with no objectives.
    const [g] = await db.insert(goals).values({
      organizationId: orgId, name: 'Unlinked Goal', status: 'published', visibility: 'org',
    }).returning()
    emptyGoalId = g.id
  })

  afterAll(() => cleanupOrg(orgId))

  it('an empty Strategy still resolves as a trace root with empty sections', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const trace = await getStrategyTrace(emptyStrategyId)

    expect(trace).not.toBeNull()
    expect(trace!.kind).toBe('strategy')
    expect(trace!.name).toBe('Unlinked Strategy')
    // Every downstream relationship area is empty — but present, so the view
    // renders the anchor plus empty-state sections rather than disappearing.
    expect(trace!.goals).toEqual([])
    expect(trace!.valueStreams).toEqual([])
    expect(trace!.directCapabilities).toEqual([])
    expect(trace!.directInitiatives).toEqual([])
  })

  it('an empty Strategy is visible to a viewer when active (not proposed)', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const trace = await getStrategyTrace(emptyStrategyId)
    expect(trace).not.toBeNull()
    expect(trace!.goals).toEqual([])
  })

  it('an empty Goal resolves as a trace root with empty sections (other metamodel case)', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const trace = await getGoalTrace(emptyGoalId)

    expect(trace).not.toBeNull()
    expect(trace!.kind).toBe('goal')
    expect(trace!.name).toBe('Unlinked Goal')
    expect(trace!.objectives).toEqual([])
  })
})
