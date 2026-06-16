/**
 * Integration tests: Strategy ↔ Goal linking (#816 / #805 slice 3)
 *
 * The link is the single FK goals.strategy_id (not a junction). Covers:
 *  - linkStrategyGoal sets the FK; unlinkStrategyGoal clears it
 *  - single-strategy-per-goal: linking a goal already in another strategy moves it
 *  - unlink is a no-op unless the goal is currently in that strategy
 *  - role enforcement (contributor links, viewer forbidden) + cross-org rejection
 *  - editGoal sets/clears strategy_id from the goal edit flow, validating org
 *  - audit logs for link/unlink
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { linkStrategyGoal, unlinkStrategyGoal } from '@/actions/links'
import { editGoal } from '@/actions/goals'
import { db } from '@/db/client'
import { goals } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertStrategy, insertGoal, getAuditLogsForEntity,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function strategyIdOf(goalId: string) {
  const g = await db.query.goals.findFirst({ where: eq(goals.id, goalId), columns: { strategyId: true } })
  return g?.strategyId ?? null
}

function goalForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Edited Goal')
  fd.set('status', overrides.status ?? 'draft')
  fd.set('visibility', overrides.visibility ?? 'org')
  if (overrides.strategyId !== undefined) fd.set('strategyId', overrides.strategyId)
  return fd
}

describe('strategy ↔ goal linking', () => {
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
    it('sets goals.strategy_id', async () => {
      const s = await insertStrategy(orgId, { name: 'Link Target' })
      const g = await insertGoal(orgId, { name: 'Free Goal' })
      await linkStrategyGoal(s.id, g.id)
      expect(await strategyIdOf(g.id)).toBe(s.id)
    })

    it('moves a goal already in another strategy (single-strategy-per-goal)', async () => {
      const first = await insertStrategy(orgId, { name: 'First Container' })
      const second = await insertStrategy(orgId, { name: 'Second Container' })
      const g = await insertGoal(orgId, { name: 'Movable Goal', strategyId: first.id })

      await linkStrategyGoal(second.id, g.id)
      expect(await strategyIdOf(g.id)).toBe(second.id)
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

    it('writes a strategy.link_goal audit log with before/after', async () => {
      const s = await insertStrategy(orgId, { name: 'Audit Link' })
      const g = await insertGoal(orgId, { name: 'Audit Link Goal' })
      await linkStrategyGoal(s.id, g.id)
      const logs = await getAuditLogsForEntity(g.id)
      const entry = logs.find(l => l.action === 'strategy.link_goal')
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ strategyId: null })
      expect(entry!.after).toMatchObject({ strategyId: s.id })
    })
  })

  describe('unlinkStrategyGoal', () => {
    it('clears strategy_id when the goal is in that strategy', async () => {
      const s = await insertStrategy(orgId, { name: 'Unlink Target' })
      const g = await insertGoal(orgId, { name: 'Linked Goal', strategyId: s.id })
      await unlinkStrategyGoal(s.id, g.id)
      expect(await strategyIdOf(g.id)).toBeNull()
    })

    it('is a no-op when the goal is in a different strategy', async () => {
      const owner = await insertStrategy(orgId, { name: 'Real Owner' })
      const other = await insertStrategy(orgId, { name: 'Other Strategy' })
      const g = await insertGoal(orgId, { name: 'Stays Put', strategyId: owner.id })

      await unlinkStrategyGoal(other.id, g.id)
      expect(await strategyIdOf(g.id)).toBe(owner.id)
    })

    it('viewer cannot unlink → Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'Viewer Unlink Block' })
      const g = await insertGoal(orgId, { name: 'Goal VUB', strategyId: s.id })
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(unlinkStrategyGoal(s.id, g.id)).rejects.toThrow('Forbidden')
    })
  })

  describe('editGoal strategy_id', () => {
    it('sets strategy_id from the goal edit flow', async () => {
      const s = await insertStrategy(orgId, { name: 'Edit-flow Strategy' })
      const g = await insertGoal(orgId, { name: 'Edit Me' })
      await editGoal(g.id, goalForm({ name: 'Edit Me', strategyId: s.id }))
      expect(await strategyIdOf(g.id)).toBe(s.id)
    })

    it('clears strategy_id when the picker is set to none', async () => {
      const s = await insertStrategy(orgId, { name: 'Soon Cleared' })
      const g = await insertGoal(orgId, { name: 'Clear Me', strategyId: s.id })
      await editGoal(g.id, goalForm({ name: 'Clear Me', strategyId: '' }))
      expect(await strategyIdOf(g.id)).toBeNull()
    })

    it('rejects a strategy from another org', async () => {
      const otherOrg = await createTestOrg()
      const foreignStrategy = await insertStrategy(otherOrg.id, { name: 'Foreign Strategy' })
      const g = await insertGoal(orgId, { name: 'Goal needing valid strategy' })
      await expect(editGoal(g.id, goalForm({ name: 'Goal needing valid strategy', strategyId: foreignStrategy.id })))
        .rejects.toThrow()
      await cleanupOrg(otherOrg.id)
    })
  })
})
