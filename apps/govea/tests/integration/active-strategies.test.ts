/**
 * Integration tests: getActiveStrategies (#833 / ADR-0005 R5)
 *
 * Backs the executive / roadmap / dashboard "active strategies" surfaces:
 * returns only status='active' strategies for the org, with pursued goals and
 * the impact/delivery junctions loaded.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getActiveStrategies } from '@/actions/strategies'
import { db } from '@/db/client'
import { strategyGoals, strategyCapabilities } from '@/db/schema'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertStrategy, insertGoal, insertCapability,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('getActiveStrategies', () => {
  let orgId: string
  let activeId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    const user = await createTestUser(orgId, 'contributor')
    mockAuth.mockResolvedValue(makeSession(user))

    const active = await insertStrategy(orgId, { name: 'Active Strategy', status: 'active' })
    activeId = active.id
    await insertStrategy(orgId, { name: 'Proposed Strategy', status: 'proposed' })
    await insertStrategy(orgId, { name: 'Achieved Strategy', status: 'achieved' })

    const goal = await insertGoal(orgId, { name: 'Pursued Goal', status: 'published' })
    const cap = await insertCapability(orgId, { name: 'Impacted Cap' })
    await db.insert(strategyGoals).values({ strategyId: activeId, goalId: goal.id })
    await db.insert(strategyCapabilities).values({ strategyId: activeId, capabilityId: cap.id })
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns only active strategies, with goals and impact links loaded', async () => {
    const rows = await getActiveStrategies(orgId)
    expect(rows.map(r => r.id)).toEqual([activeId])

    const s = rows[0]
    expect(s.strategyGoals).toHaveLength(1)
    expect(s.strategyGoals[0].goal.name).toBe('Pursued Goal')
    expect(s.strategyCapabilities).toHaveLength(1)
  })

  it('excludes another org\'s active strategy', async () => {
    const otherOrg = await createTestOrg()
    await insertStrategy(otherOrg.id, { name: 'Foreign Active', status: 'active' })
    const rows = await getActiveStrategies(orgId)
    expect(rows.map(r => r.id)).toEqual([activeId])
    await cleanupOrg(otherOrg.id)
  })
})
