/**
 * Integration tests: upstream Strategy layer in capability traces (#842)
 *
 * A Capability trace must surface the Strategies that directly impact it (the
 * course-of-action link, ADR-0005 / #831) as an upstream layer — and an
 * unlinked Capability must report an empty Strategy set so the view can render
 * an empty-state gap. Strategy status/visibility rules match getStrategyTrace:
 * a proposed Strategy is not a viewer-visible root.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getCapabilityTrace } from '@/actions/traceability'
import { db } from '@/db/client'
import { capabilities, strategies, strategyCapabilities } from '@/db/schema'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('getCapabilityTrace — upstream Strategy layer (#842)', () => {
  let orgId: string
  let admin: TestUser
  let viewer: TestUser
  let linkedCapId: string
  let unlinkedCapId: string
  let activeStrategyId: string
  let proposedStrategyId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'viewer'),
    ])

    const [linked, unlinked] = await db.insert(capabilities).values([
      { organizationId: orgId, name: 'Linked Capability', status: 'published', visibility: 'org' },
      { organizationId: orgId, name: 'Unlinked Capability', status: 'published', visibility: 'org' },
    ]).returning()
    linkedCapId = linked.id
    unlinkedCapId = unlinked.id

    const [active, proposed] = await db.insert(strategies).values([
      { organizationId: orgId, name: 'Active Strategy', status: 'active', visibility: 'org' },
      { organizationId: orgId, name: 'Proposed Strategy', status: 'proposed', visibility: 'org' },
    ]).returning()
    activeStrategyId = active.id
    proposedStrategyId = proposed.id

    // Both strategies directly impact the linked capability.
    await db.insert(strategyCapabilities).values([
      { strategyId: activeStrategyId, capabilityId: linkedCapId },
      { strategyId: proposedStrategyId, capabilityId: linkedCapId },
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('an unlinked capability reports an empty Strategy set (renders an empty gap)', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const trace = await getCapabilityTrace(unlinkedCapId)
    expect(trace).not.toBeNull()
    expect(trace!.strategies).toEqual([])
  })

  it('lists directly-linked Strategies for an author/admin', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const trace = await getCapabilityTrace(linkedCapId)
    expect(trace).not.toBeNull()
    const ids = trace!.strategies.map(s => s.id)
    expect(ids).toContain(activeStrategyId)
    expect(ids).toContain(proposedStrategyId)
    // Status/context carried for the view.
    const active = trace!.strategies.find(s => s.id === activeStrategyId)!
    expect(active.name).toBe('Active Strategy')
    expect(active.status).toBe('active')
  })

  it('hides proposed Strategies from viewers but keeps visible ones', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const trace = await getCapabilityTrace(linkedCapId)
    expect(trace).not.toBeNull()
    const ids = trace!.strategies.map(s => s.id)
    expect(ids).toContain(activeStrategyId)
    expect(ids).not.toContain(proposedStrategyId)
  })
})
