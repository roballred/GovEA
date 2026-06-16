/**
 * Integration tests: Strategy ↔ Goal linking (#825 / ADR-0005)
 *
 * Strategy↔Goal is now the strategy_goals junction (many-to-many: a strategy
 * pursues goals; a goal can be pursued by several strategies). Covers:
 *  - linkStrategyGoal inserts a junction row; idempotent
 *  - a goal can be pursued by two strategies (no "move")
 *  - unlinkStrategyGoal removes only that pair
 *  - role enforcement + cross-org rejection
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { linkStrategyGoal, unlinkStrategyGoal } from '@/actions/links'
import { db } from '@/db/client'
import { strategyGoals } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertStrategy, insertGoal,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function strategiesForGoal(goalId: string) {
  const rows = await db.select().from(strategyGoals).where(eq(strategyGoals.goalId, goalId))
  return rows.map(r => r.strategyId)
}
async function isLinked(strategyId: string, goalId: string) {
  const rows = await db.select().from(strategyGoals)
    .where(and(eq(strategyGoals.strategyId, strategyId), eq(strategyGoals.goalId, goalId)))
  return rows.length > 0
}

describe('strategy ↔ goal linking (junction)', () => {
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

  describe('linkStrategyGoal', () => {
    it('inserts a strategy_goals row', async () => {
      const s = await insertStrategy(orgId, { name: 'Link Target' })
      const g = await insertGoal(orgId, { name: 'Goal A' })
      await linkStrategyGoal(s.id, g.id)
      expect(await isLinked(s.id, g.id)).toBe(true)
    })

    it('is idempotent (no duplicate rows)', async () => {
      const s = await insertStrategy(orgId, { name: 'Idempotent' })
      const g = await insertGoal(orgId, { name: 'Goal B' })
      await linkStrategyGoal(s.id, g.id)
      await linkStrategyGoal(s.id, g.id)
      const rows = await db.select().from(strategyGoals)
        .where(and(eq(strategyGoals.strategyId, s.id), eq(strategyGoals.goalId, g.id)))
      expect(rows).toHaveLength(1)
    })

    it('a goal can be pursued by two strategies (no move)', async () => {
      const s1 = await insertStrategy(orgId, { name: 'Strategy One' })
      const s2 = await insertStrategy(orgId, { name: 'Strategy Two' })
      const g = await insertGoal(orgId, { name: 'Shared Goal' })
      await linkStrategyGoal(s1.id, g.id)
      await linkStrategyGoal(s2.id, g.id)
      expect((await strategiesForGoal(g.id)).sort()).toEqual([s1.id, s2.id].sort())
    })

    it('viewer cannot link → Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'Viewer Link Block' })
      const g = await insertGoal(orgId, { name: 'Goal VLB' })
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(linkStrategyGoal(s.id, g.id)).rejects.toThrow('Forbidden')
    })

    it('rejects a goal from another org', async () => {
      const otherOrg = await createTestOrg()
      const foreignGoal = await insertGoal(otherOrg.id, { name: 'Foreign Goal' })
      const s = await insertStrategy(orgId, { name: 'Mine' })
      await expect(linkStrategyGoal(s.id, foreignGoal.id)).rejects.toThrow()
      await cleanupOrg(otherOrg.id)
    })
  })

  describe('unlinkStrategyGoal', () => {
    it('removes only the targeted pair', async () => {
      const s1 = await insertStrategy(orgId, { name: 'Keeps Link' })
      const s2 = await insertStrategy(orgId, { name: 'Loses Link' })
      const g = await insertGoal(orgId, { name: 'Goal C' })
      await linkStrategyGoal(s1.id, g.id)
      await linkStrategyGoal(s2.id, g.id)

      await unlinkStrategyGoal(s2.id, g.id)
      expect(await isLinked(s2.id, g.id)).toBe(false)
      expect(await isLinked(s1.id, g.id)).toBe(true)
    })

    it('viewer cannot unlink → Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'Viewer Unlink Block' })
      const g = await insertGoal(orgId, { name: 'Goal VUB' })
      await linkStrategyGoal(s.id, g.id)
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(unlinkStrategyGoal(s.id, g.id)).rejects.toThrow('Forbidden')
    })
  })
})
