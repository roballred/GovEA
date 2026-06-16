/**
 * Integration tests: Strategy ↔ Capability / Value Stream / Initiative linking
 * (#827 / ADR-0005 R2)
 *
 * Each is a many-to-many junction. Covers link inserts (idempotent), targeted
 * unlink, role enforcement, and cross-org rejection.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  linkStrategyCapability, unlinkStrategyCapability,
  linkStrategyValueStream, unlinkStrategyValueStream,
  linkStrategyInitiative, unlinkStrategyInitiative,
} from '@/actions/links'
import { db } from '@/db/client'
import { strategyCapabilities, strategyValueStreams, strategyInitiatives } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  insertStrategy, insertCapability, insertValueStream, insertInitiative,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('strategy ↔ operating-model / delivery linking', () => {
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

  describe('capability', () => {
    it('links and unlinks a capability', async () => {
      const s = await insertStrategy(orgId, { name: 'Cap Strategy' })
      const c = await insertCapability(orgId, { name: 'Cap A' })
      await linkStrategyCapability(s.id, c.id)
      let rows = await db.select().from(strategyCapabilities)
        .where(and(eq(strategyCapabilities.strategyId, s.id), eq(strategyCapabilities.capabilityId, c.id)))
      expect(rows).toHaveLength(1)

      await linkStrategyCapability(s.id, c.id) // idempotent
      rows = await db.select().from(strategyCapabilities)
        .where(and(eq(strategyCapabilities.strategyId, s.id), eq(strategyCapabilities.capabilityId, c.id)))
      expect(rows).toHaveLength(1)

      await unlinkStrategyCapability(s.id, c.id)
      rows = await db.select().from(strategyCapabilities)
        .where(and(eq(strategyCapabilities.strategyId, s.id), eq(strategyCapabilities.capabilityId, c.id)))
      expect(rows).toHaveLength(0)
    })

    it('viewer cannot link → Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'Cap Block' })
      const c = await insertCapability(orgId, { name: 'Cap B' })
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(linkStrategyCapability(s.id, c.id)).rejects.toThrow('Forbidden')
    })

    it('rejects a cross-org capability', async () => {
      const otherOrg = await createTestOrg()
      const foreign = await insertCapability(otherOrg.id, { name: 'Foreign Cap' })
      const s = await insertStrategy(orgId, { name: 'Mine Cap' })
      await expect(linkStrategyCapability(s.id, foreign.id)).rejects.toThrow()
      await cleanupOrg(otherOrg.id)
    })
  })

  describe('value stream', () => {
    it('links and unlinks a value stream', async () => {
      const s = await insertStrategy(orgId, { name: 'VS Strategy' })
      const v = await insertValueStream(orgId, { name: 'VS A' })
      await linkStrategyValueStream(s.id, v.id)
      let rows = await db.select().from(strategyValueStreams)
        .where(and(eq(strategyValueStreams.strategyId, s.id), eq(strategyValueStreams.valueStreamId, v.id)))
      expect(rows).toHaveLength(1)

      await unlinkStrategyValueStream(s.id, v.id)
      rows = await db.select().from(strategyValueStreams)
        .where(and(eq(strategyValueStreams.strategyId, s.id), eq(strategyValueStreams.valueStreamId, v.id)))
      expect(rows).toHaveLength(0)
    })

    it('viewer cannot link → Forbidden', async () => {
      const s = await insertStrategy(orgId, { name: 'VS Block' })
      const v = await insertValueStream(orgId, { name: 'VS B' })
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(linkStrategyValueStream(s.id, v.id)).rejects.toThrow('Forbidden')
    })
  })

  describe('initiative', () => {
    it('links and unlinks an initiative', async () => {
      const s = await insertStrategy(orgId, { name: 'Init Strategy' })
      const i = await insertInitiative(orgId, { name: 'Init A' })
      await linkStrategyInitiative(s.id, i.id)
      let rows = await db.select().from(strategyInitiatives)
        .where(and(eq(strategyInitiatives.strategyId, s.id), eq(strategyInitiatives.initiativeId, i.id)))
      expect(rows).toHaveLength(1)

      await unlinkStrategyInitiative(s.id, i.id)
      rows = await db.select().from(strategyInitiatives)
        .where(and(eq(strategyInitiatives.strategyId, s.id), eq(strategyInitiatives.initiativeId, i.id)))
      expect(rows).toHaveLength(0)
    })

    it('rejects a cross-org initiative', async () => {
      const otherOrg = await createTestOrg()
      const foreign = await insertInitiative(otherOrg.id, { name: 'Foreign Init' })
      const s = await insertStrategy(orgId, { name: 'Mine Init' })
      await expect(linkStrategyInitiative(s.id, foreign.id)).rejects.toThrow()
      await cleanupOrg(otherOrg.id)
    })
  })
})
