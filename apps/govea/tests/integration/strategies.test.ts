/**
 * Integration tests: strategies server actions + schema invariants (#812 / #805)
 *
 * Covers:
 *  - CRUD role enforcement (contributor create/edit, admin delete, viewer forbidden)
 *  - createStrategy / editStrategy / deleteStrategy write rows + audit logs
 *  - adoptStrategy supersedes the prior adopted strategy in one tx
 *  - Single-adopted invariant at the action layer AND the DB layer (partial unique index)
 *  - goals.strategy_id is nullable and ON DELETE SET NULL (member goals orphan, not delete)
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  createStrategy, editStrategy, deleteStrategy, adoptStrategy,
} from '@/actions/strategies'
import { db } from '@/db/client'
import { strategies, goals } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, getStrategiesForOrg, getAuditLogsForEntity,
  insertStrategy, insertGoal,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function stratForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Test Strategy')
  fd.set('status', overrides.status ?? 'draft')
  fd.set('visibility', overrides.visibility ?? 'org')
  if (overrides.summary) fd.set('summary', overrides.summary)
  if (overrides.planningHorizon) fd.set('planningHorizon', overrides.planningHorizon)
  if (overrides.startDate) fd.set('startDate', overrides.startDate)
  if (overrides.endDate) fd.set('endDate', overrides.endDate)
  return fd
}

describe('strategies actions', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── createStrategy ───────────────────────────────────────────────────────────

  describe('createStrategy', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(contributor))
    })

    it('contributor can create a strategy', async () => {
      const before = await getStrategiesForOrg(orgId)
      await createStrategy(stratForm({ name: 'FY26 Strategy' }))
      const after = await getStrategiesForOrg(orgId)

      expect(after).toHaveLength(before.length + 1)
      const row = after.find(s => s.name === 'FY26 Strategy')!
      expect(row.organizationId).toBe(orgId)
      expect(row.createdBy).toBe(contributor.id)
      expect(row.status).toBe('draft')
    })

    it('persists proper date columns and horizon', async () => {
      await createStrategy(stratForm({
        name: 'Dated Strategy', planningHorizon: 'FY26–FY28',
        startDate: '2026-07-01', endDate: '2028-06-30',
      }))
      const row = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Dated Strategy')!
      expect(row.planningHorizon).toBe('FY26–FY28')
      expect(row.startDate).toBe('2026-07-01')
      expect(row.endDate).toBe('2028-06-30')
    })

    it('viewer cannot create → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(createStrategy(stratForm())).rejects.toThrow('Forbidden')
    })

    it('unauthenticated call redirects to /login', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(createStrategy(stratForm())).rejects.toThrow(/REDIRECT:\/login/)
    })

    it('cannot create directly as adopted → must use adoptStrategy', async () => {
      await expect(createStrategy(stratForm({ name: 'Sneaky Adopt', status: 'adopted' })))
        .rejects.toThrow(/adoptStrategy/)
    })

    it('writes audit log: action=strategy.create', async () => {
      await createStrategy(stratForm({ name: 'Audit Create Target' }))
      const row = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Audit Create Target')!
      const logs = await getAuditLogsForEntity(row.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('strategy.create')
      expect(logs[0].before).toBeNull()
      expect(logs[0].after).toMatchObject({ name: 'Audit Create Target' })
    })
  })

  // ── editStrategy ─────────────────────────────────────────────────────────────

  describe('editStrategy', () => {
    let strategyId: string

    beforeAll(async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Edit Me' }))
      strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Edit Me')!.id
    })

    it('contributor can edit an owned strategy', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editStrategy(strategyId, stratForm({ name: 'Edited Name', status: 'retired' }))
      const row = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
      expect(row?.name).toBe('Edited Name')
      expect(row?.status).toBe('retired')
      expect(row?.updatedBy).toBe(contributor.id)
    })

    it('editing to adopted is rejected → must use adoptStrategy', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(editStrategy(strategyId, stratForm({ name: 'Edited Name', status: 'adopted' })))
        .rejects.toThrow(/adoptStrategy/)
    })

    it('viewer cannot edit → throws Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(editStrategy(strategyId, stratForm({ name: 'Hijack', status: 'draft' })))
        .rejects.toThrow('Forbidden')
    })

    it('writes audit log with before/after snapshot', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editStrategy(strategyId, stratForm({ name: 'Before State', status: 'draft' }))
      await editStrategy(strategyId, stratForm({ name: 'After State', status: 'retired' }))
      const logs = await getAuditLogsForEntity(strategyId)
      const entry = logs.find(
        l => l.action === 'strategy.edit' && (l.after as Record<string, unknown>)?.name === 'After State',
      )
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ name: 'Before State', status: 'draft' })
      expect(entry!.after).toMatchObject({ name: 'After State', status: 'retired' })
    })
  })

  // ── adoptStrategy + single-adopted invariant ─────────────────────────────────

  describe('adoptStrategy', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(contributor))
    })

    it('adopting a draft strategy makes it the current (adopted) one', async () => {
      const s = await insertStrategy(orgId, { name: 'To Adopt', status: 'draft' })
      await adoptStrategy(s.id)
      const row = await db.query.strategies.findFirst({ where: eq(strategies.id, s.id) })
      expect(row?.status).toBe('adopted')
    })

    it('adopting a second strategy supersedes the first in one tx (single-adopted invariant)', async () => {
      const first = await insertStrategy(orgId, { name: 'First Adopted' })
      const second = await insertStrategy(orgId, { name: 'Second Adopted' })

      await adoptStrategy(first.id)
      await adoptStrategy(second.id)

      const rows = await getStrategiesForOrg(orgId)
      const adopted = rows.filter(s => s.status === 'adopted')
      expect(adopted).toHaveLength(1)
      expect(adopted[0].id).toBe(second.id)
      expect(rows.find(s => s.id === first.id)?.status).toBe('superseded')
    })

    it('writes adopt + supersede audit logs', async () => {
      const first = await insertStrategy(orgId, { name: 'Audit First' })
      const second = await insertStrategy(orgId, { name: 'Audit Second' })
      await adoptStrategy(first.id)
      await adoptStrategy(second.id)

      const adoptLogs = await getAuditLogsForEntity(second.id)
      expect(adoptLogs.some(l => l.action === 'strategy.adopt')).toBe(true)
      const supersedeLogs = await getAuditLogsForEntity(first.id)
      expect(supersedeLogs.some(l => l.action === 'strategy.supersede')).toBe(true)
    })

    it('viewer cannot adopt → throws Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'Viewer Adopt Block' })
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(adoptStrategy(s.id)).rejects.toThrow('Forbidden')
    })
  })

  // ── DB-level guard: partial unique index ─────────────────────────────────────

  describe('single-adopted partial unique index', () => {
    it('a direct second adopted insert violates the unique index', async () => {
      const guardOrg = await createTestOrg()
      await db.insert(strategies).values({
        organizationId: guardOrg.id, name: 'DB Adopted One', status: 'adopted', visibility: 'org',
      })
      await expect(
        db.insert(strategies).values({
          organizationId: guardOrg.id, name: 'DB Adopted Two', status: 'adopted', visibility: 'org',
        }),
      ).rejects.toThrow()
      await cleanupOrg(guardOrg.id)
    })

    it('two orgs can each have one adopted strategy', async () => {
      const orgA = await createTestOrg()
      const orgB = await createTestOrg()
      await expect(Promise.all([
        db.insert(strategies).values({ organizationId: orgA.id, name: 'A Adopted', status: 'adopted', visibility: 'org' }),
        db.insert(strategies).values({ organizationId: orgB.id, name: 'B Adopted', status: 'adopted', visibility: 'org' }),
      ])).resolves.not.toThrow()
      await Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)])
    })
  })

  // ── goals.strategy_id FK behavior ────────────────────────────────────────────

  describe('goals.strategy_id', () => {
    it('a goal with strategy_id = null is valid (back-compat)', async () => {
      const g = await insertGoal(orgId, { name: 'Uncontainered Goal' })
      expect(g.strategyId).toBeNull()
    })

    it('deleting a strategy sets member goals strategy_id to null (orphans, not deletes)', async () => {
      const s = await insertStrategy(orgId, { name: 'Has Goals' })
      const g = await insertGoal(orgId, { name: 'Member Goal', strategyId: s.id })
      expect(g.strategyId).toBe(s.id)

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(s.id)

      const goalAfter = await db.query.goals.findFirst({ where: eq(goals.id, g.id) })
      expect(goalAfter).toBeDefined()
      expect(goalAfter?.strategyId).toBeNull()
    })
  })

  // ── deleteStrategy role enforcement ──────────────────────────────────────────

  describe('deleteStrategy', () => {
    it('admin can delete a strategy', async () => {
      const s = await insertStrategy(orgId, { name: 'Delete Me' })
      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(s.id)
      const check = await db.query.strategies.findFirst({ where: eq(strategies.id, s.id) })
      expect(check).toBeUndefined()
    })

    it('contributor cannot delete → admin required', async () => {
      const s = await insertStrategy(orgId, { name: 'Protected Strategy' })
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(deleteStrategy(s.id)).rejects.toThrow('Forbidden')
      const check = await db.query.strategies.findFirst({
        where: and(eq(strategies.id, s.id), eq(strategies.organizationId, orgId)),
      })
      expect(check).toBeDefined()
    })

    it('delete writes audit log with before snapshot', async () => {
      const s = await insertStrategy(orgId, { name: 'Audit Delete Target' })
      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(s.id)
      const logs = await getAuditLogsForEntity(s.id)
      const deleteLog = logs.find(l => l.action === 'strategy.delete')!
      expect(deleteLog).toBeDefined()
      expect(deleteLog.before).toMatchObject({ name: 'Audit Delete Target' })
    })
  })
})
