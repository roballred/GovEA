/**
 * Integration tests: strategies server actions (#825 / ADR-0005)
 *
 * Strategy is a course of action (proposed→active→achieved→abandoned), not a
 * container — no adopt, no single-adopted invariant. Covers:
 *  - CRUD role enforcement (contributor create/edit, admin delete, viewer forbidden)
 *  - create/edit/delete write rows + audit logs on the new lifecycle
 *  - delete cascades junction rows but leaves linked goals intact
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createStrategy, editStrategy, deleteStrategy } from '@/actions/strategies'
import { linkStrategyGoal } from '@/actions/links'
import { db } from '@/db/client'
import { strategies, goals } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, getStrategiesForOrg, getAuditLogsForEntity,
  insertGoal,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function stratForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Test Strategy')
  fd.set('status', overrides.status ?? 'proposed')
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

  describe('createStrategy', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(contributor))
    })

    it('contributor can create a strategy (default proposed)', async () => {
      const before = await getStrategiesForOrg(orgId)
      await createStrategy(stratForm({ name: 'Cloud-First Approach' }))
      const after = await getStrategiesForOrg(orgId)

      expect(after).toHaveLength(before.length + 1)
      const row = after.find(s => s.name === 'Cloud-First Approach')!
      expect(row.organizationId).toBe(orgId)
      expect(row.createdBy).toBe(contributor.id)
      expect(row.status).toBe('proposed')
    })

    it('persists active status, dates and horizon', async () => {
      await createStrategy(stratForm({
        name: 'Dated Strategy', status: 'active', planningHorizon: 'FY26–FY28',
        startDate: '2026-07-01', endDate: '2028-06-30',
      }))
      const row = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Dated Strategy')!
      expect(row.status).toBe('active')
      expect(row.planningHorizon).toBe('FY26–FY28')
      expect(row.startDate).toBe('2026-07-01')
      expect(row.endDate).toBe('2028-06-30')
    })

    it('viewer cannot create → Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(createStrategy(stratForm())).rejects.toThrow('Forbidden')
    })

    it('unauthenticated call redirects to /login', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(createStrategy(stratForm())).rejects.toThrow(/REDIRECT:\/login/)
    })

    it('writes audit log: action=strategy.create', async () => {
      await createStrategy(stratForm({ name: 'Audit Create Target' }))
      const row = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Audit Create Target')!
      const logs = await getAuditLogsForEntity(row.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('strategy.create')
      expect(logs[0].after).toMatchObject({ name: 'Audit Create Target', status: 'proposed' })
    })

    it('multiple strategies can be active at once (no single-adopted invariant)', async () => {
      await createStrategy(stratForm({ name: 'Active One', status: 'active' }))
      await createStrategy(stratForm({ name: 'Active Two', status: 'active' }))
      const active = (await getStrategiesForOrg(orgId)).filter(s => s.status === 'active')
      expect(active.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('editStrategy', () => {
    let strategyId: string

    beforeAll(async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Edit Me' }))
      strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Edit Me')!.id
    })

    it('contributor can edit and advance the lifecycle', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editStrategy(strategyId, stratForm({ name: 'Edited Name', status: 'achieved' }))
      const row = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
      expect(row?.name).toBe('Edited Name')
      expect(row?.status).toBe('achieved')
      expect(row?.updatedBy).toBe(contributor.id)
    })

    it('viewer cannot edit → Forbidden', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(editStrategy(strategyId, stratForm({ name: 'Hijack', status: 'active' })))
        .rejects.toThrow('Forbidden')
    })

    it('writes audit log with before/after snapshot', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await editStrategy(strategyId, stratForm({ name: 'Before State', status: 'proposed' }))
      await editStrategy(strategyId, stratForm({ name: 'After State', status: 'active' }))
      const logs = await getAuditLogsForEntity(strategyId)
      const entry = logs.find(
        l => l.action === 'strategy.edit' && (l.after as Record<string, unknown>)?.name === 'After State',
      )
      expect(entry).toBeDefined()
      expect(entry!.before).toMatchObject({ name: 'Before State', status: 'proposed' })
      expect(entry!.after).toMatchObject({ name: 'After State', status: 'active' })
    })
  })

  describe('deleteStrategy', () => {
    it('admin can delete a strategy', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Delete Me' }))
      const strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Delete Me')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(strategyId)
      const check = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
      expect(check).toBeUndefined()
    })

    it('contributor cannot delete → admin required', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Protected Strategy' }))
      const strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Protected Strategy')!.id
      await expect(deleteStrategy(strategyId)).rejects.toThrow('Forbidden')
    })

    it('deleting a strategy removes its goal links but keeps the goals', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Has Links' }))
      const strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Has Links')!.id
      const g = await insertGoal(orgId, { name: 'Pursued Goal' })
      await linkStrategyGoal(strategyId, g.id)

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(strategyId)

      const goalAfter = await db.query.goals.findFirst({ where: eq(goals.id, g.id) })
      expect(goalAfter).toBeDefined() // goal survives; junction row cascaded away
    })

    it('delete writes audit log with before snapshot', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await createStrategy(stratForm({ name: 'Audit Delete Target' }))
      const strategyId = (await getStrategiesForOrg(orgId)).find(s => s.name === 'Audit Delete Target')!.id

      mockAuth.mockResolvedValue(makeSession(admin))
      await deleteStrategy(strategyId)
      const logs = await getAuditLogsForEntity(strategyId)
      const deleteLog = logs.find(l => l.action === 'strategy.delete')!
      expect(deleteLog).toBeDefined()
      expect(deleteLog.before).toMatchObject({ name: 'Audit Delete Target' })
    })
  })
})
