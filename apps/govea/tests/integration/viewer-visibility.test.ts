/**
 * Integration tests: viewer visibility for ADRs and initiatives (#208)
 *
 * The viewer status gate must be enforced in the action layer — not only in
 * page components — so every caller of getADR / getInitiative inherits the
 * rule automatically.
 *
 * Rules (Option B decision from #202):
 *  - ADRs:        viewer sees only `accepted`
 *  - Initiatives: viewer sees only `active` and `complete`
 *
 * Coverage matrix:
 *  - getADRs        (list)   × viewer / contributor / admin
 *  - getADR         (detail) × each ADR status × viewer / contributor
 *  - getInitiatives (list)   × viewer / contributor / admin
 *  - getInitiative  (detail) × each initiative status × viewer / contributor
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getADRs, getADR } from '@/actions/adrs'
import { getInitiatives, getInitiative } from '@/actions/initiatives'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertAdr, insertInitiative,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

// ── ADR visibility ─────────────────────────────────────────────────────────────

describe('viewer visibility — ADRs', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  let acceptedId: string
  let proposedId: string
  let deprecatedId: string
  let supersededId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    ;[acceptedId, proposedId, deprecatedId, supersededId] = await Promise.all([
      insertAdr(orgId, { number: 'ADR-V-001', status: 'accepted'   }).then(a => a.id),
      insertAdr(orgId, { number: 'ADR-V-002', status: 'proposed'   }).then(a => a.id),
      insertAdr(orgId, { number: 'ADR-V-003', status: 'deprecated' }).then(a => a.id),
      insertAdr(orgId, { number: 'ADR-V-004', status: 'superseded' }).then(a => a.id),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── getADRs list ─────────────────────────────────────────────────────────

  describe('getADRs — list', () => {
    it('viewer sees only accepted ADRs', async () => {
      const result = await getADRs(orgId, 'viewer')
      const ids = result.map(a => a.id)
      expect(ids).toContain(acceptedId)
      expect(ids).not.toContain(proposedId)
      expect(ids).not.toContain(deprecatedId)
      expect(ids).not.toContain(supersededId)
    })

    it('contributor sees all statuses', async () => {
      const result = await getADRs(orgId, 'contributor')
      const ids = result.map(a => a.id)
      expect(ids).toContain(acceptedId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(deprecatedId)
      expect(ids).toContain(supersededId)
    })

    it('admin sees all statuses', async () => {
      const result = await getADRs(orgId, 'admin')
      const ids = result.map(a => a.id)
      expect(ids).toContain(acceptedId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(deprecatedId)
      expect(ids).toContain(supersededId)
    })
  })

  // ── getADR detail ─────────────────────────────────────────────────────────

  describe('getADR — detail', () => {
    it('viewer can access an accepted ADR by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getADR(acceptedId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(acceptedId)
    })

    it('viewer cannot access a proposed ADR by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getADR(proposedId)).toBeNull()
    })

    it('viewer cannot access a deprecated ADR by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getADR(deprecatedId)).toBeNull()
    })

    it('viewer cannot access a superseded ADR by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getADR(supersededId)).toBeNull()
    })

    it('contributor can access any ADR status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const [a, b, c, d] = await Promise.all([
        getADR(acceptedId),
        getADR(proposedId),
        getADR(deprecatedId),
        getADR(supersededId),
      ])
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
      expect(d).not.toBeNull()
    })

    it('admin can access any ADR status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      expect(await getADR(proposedId)).not.toBeNull()
    })
  })
})

// ── Initiative visibility ──────────────────────────────────────────────────────

describe('viewer visibility — Initiatives', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  let activeId: string
  let completeId: string
  let proposedId: string
  let onHoldId: string
  let cancelledId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    ;[activeId, completeId, proposedId, onHoldId, cancelledId] = await Promise.all([
      insertInitiative(orgId, { status: 'active'    }).then(i => i.id),
      insertInitiative(orgId, { status: 'complete'  }).then(i => i.id),
      insertInitiative(orgId, { status: 'proposed'  }).then(i => i.id),
      insertInitiative(orgId, { status: 'on-hold'   }).then(i => i.id),
      insertInitiative(orgId, { status: 'cancelled' }).then(i => i.id),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── getInitiatives list ───────────────────────────────────────────────────

  describe('getInitiatives — list', () => {
    it('viewer sees only active and complete initiatives', async () => {
      const result = await getInitiatives(orgId, 'viewer')
      const ids = result.map(i => i.id)
      expect(ids).toContain(activeId)
      expect(ids).toContain(completeId)
      expect(ids).not.toContain(proposedId)
      expect(ids).not.toContain(onHoldId)
      expect(ids).not.toContain(cancelledId)
    })

    it('contributor sees all statuses', async () => {
      const result = await getInitiatives(orgId, 'contributor')
      const ids = result.map(i => i.id)
      expect(ids).toContain(activeId)
      expect(ids).toContain(completeId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(onHoldId)
      expect(ids).toContain(cancelledId)
    })

    it('admin sees all statuses', async () => {
      const result = await getInitiatives(orgId, 'admin')
      const ids = result.map(i => i.id)
      expect(ids).toContain(activeId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(cancelledId)
    })
  })

  // ── getInitiative detail ──────────────────────────────────────────────────

  describe('getInitiative — detail', () => {
    it('viewer can access an active initiative by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getInitiative(activeId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(activeId)
    })

    it('viewer can access a complete initiative by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getInitiative(completeId)).not.toBeNull()
    })

    it('viewer cannot access a proposed initiative by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getInitiative(proposedId)).toBeNull()
    })

    it('viewer cannot access an on-hold initiative by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getInitiative(onHoldId)).toBeNull()
    })

    it('viewer cannot access a cancelled initiative by ID → returns null', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getInitiative(cancelledId)).toBeNull()
    })

    it('contributor can access any initiative status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const [a, b, c, d, e] = await Promise.all([
        getInitiative(activeId),
        getInitiative(completeId),
        getInitiative(proposedId),
        getInitiative(onHoldId),
        getInitiative(cancelledId),
      ])
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
      expect(d).not.toBeNull()
      expect(e).not.toBeNull()
    })

    it('admin can access any initiative status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      expect(await getInitiative(proposedId)).not.toBeNull()
    })
  })
})
