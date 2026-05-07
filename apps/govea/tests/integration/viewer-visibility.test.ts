/**
 * Integration tests: viewer visibility for ADRs, initiatives, capabilities,
 * personas, and glossary terms.
 *
 * The viewer status gate must be enforced in the action layer — not only in
 * page components — so every caller of getXxx inherits the rule automatically.
 *
 * Rules:
 *  - ADRs:          viewer sees only `accepted`
 *  - Initiatives:   viewer sees only `active` and `complete`
 *  - Capabilities:  viewer sees only `published`
 *  - Personas:      viewer sees only `published`
 *  - Glossary:      viewer sees only `published` (#270)
 *
 * Coverage matrix:
 *  - getGlossaryTerms (list)   × viewer / contributor / admin
 *  - getGlossaryTerm  (detail) × each status × viewer / contributor
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getADRs, getADR } from '@/actions/adrs'
import { getInitiatives, getInitiative } from '@/actions/initiatives'
import { getCapabilities, getCapability } from '@/actions/capabilities'
import { getPersonas, getPersona } from '@/actions/personas'
import { getGlossaryTerms, getGlossaryTerm } from '@/actions/glossary'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertAdr, insertInitiative, insertCapability, insertPersona,
  insertGlossaryTerm,
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
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getADRs()
      const ids = result.map(a => a.id)
      expect(ids).toContain(acceptedId)
      expect(ids).not.toContain(proposedId)
      expect(ids).not.toContain(deprecatedId)
      expect(ids).not.toContain(supersededId)
    })

    it('contributor sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const result = await getADRs()
      const ids = result.map(a => a.id)
      expect(ids).toContain(acceptedId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(deprecatedId)
      expect(ids).toContain(supersededId)
    })

    it('admin sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await getADRs()
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
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getInitiatives()
      const ids = result.map(i => i.id)
      expect(ids).toContain(activeId)
      expect(ids).toContain(completeId)
      expect(ids).not.toContain(proposedId)
      expect(ids).not.toContain(onHoldId)
      expect(ids).not.toContain(cancelledId)
    })

    it('contributor sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const result = await getInitiatives()
      const ids = result.map(i => i.id)
      expect(ids).toContain(activeId)
      expect(ids).toContain(completeId)
      expect(ids).toContain(proposedId)
      expect(ids).toContain(onHoldId)
      expect(ids).toContain(cancelledId)
    })

    it('admin sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await getInitiatives()
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

// ── Capability visibility ──────────────────────────────────────────────────────

describe('viewer visibility — Capabilities', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  let publishedId: string
  let draftId: string
  let archivedId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    ;[publishedId, draftId, archivedId] = await Promise.all([
      insertCapability(orgId, { status: 'published' }).then(c => c.id),
      insertCapability(orgId, { status: 'draft'     }).then(c => c.id),
      insertCapability(orgId, { status: 'archived'  }).then(c => c.id),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  describe('getCapabilities — list', () => {
    it('viewer sees only published capabilities', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getCapabilities()
      const ids = result.map(c => c.id)
      expect(ids).toContain(publishedId)
      expect(ids).not.toContain(draftId)
      expect(ids).not.toContain(archivedId)
    })

    it('contributor sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const result = await getCapabilities()
      const ids = result.map(c => c.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })

    it('admin sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await getCapabilities()
      const ids = result.map(c => c.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })
  })

  describe('getCapability — detail', () => {
    it('viewer can access a published capability by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getCapability(publishedId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(publishedId)
    })

    it('viewer gets null for a draft capability', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getCapability(draftId)).toBeNull()
    })

    it('viewer gets null for an archived capability', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getCapability(archivedId)).toBeNull()
    })

    it('contributor can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const [a, b, c] = await Promise.all([
        getCapability(publishedId),
        getCapability(draftId),
        getCapability(archivedId),
      ])
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
    })

    it('admin can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      expect(await getCapability(draftId)).not.toBeNull()
    })
  })
})

// ── Persona visibility ─────────────────────────────────────────────────────────

describe('viewer visibility — Personas', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  let publishedId: string
  let draftId: string
  let archivedId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    ;[publishedId, draftId, archivedId] = await Promise.all([
      insertPersona(orgId, { status: 'published' }).then(p => p.id),
      insertPersona(orgId, { status: 'draft'     }).then(p => p.id),
      insertPersona(orgId, { status: 'archived'  }).then(p => p.id),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  describe('getPersonas — list', () => {
    it('viewer sees only published personas', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getPersonas()
      const ids = result.map(p => p.id)
      expect(ids).toContain(publishedId)
      expect(ids).not.toContain(draftId)
      expect(ids).not.toContain(archivedId)
    })

    it('contributor sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const result = await getPersonas()
      const ids = result.map(p => p.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })

    it('admin sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await getPersonas()
      const ids = result.map(p => p.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })
  })

  describe('getPersona — detail', () => {
    it('viewer can access a published persona by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getPersona(publishedId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(publishedId)
    })

    it('viewer gets null for a draft persona', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getPersona(draftId)).toBeNull()
    })

    it('viewer gets null for an archived persona', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getPersona(archivedId)).toBeNull()
    })

    it('contributor can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const [a, b, c] = await Promise.all([
        getPersona(publishedId),
        getPersona(draftId),
        getPersona(archivedId),
      ])
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
    })

    it('admin can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      expect(await getPersona(draftId)).not.toBeNull()
    })
  })
})

// ── Glossary visibility ────────────────────────────────────────────────────────

describe('viewer visibility — Glossary', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  let publishedId: string
  let draftId: string
  let archivedId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
    ;[publishedId, draftId, archivedId] = await Promise.all([
      insertGlossaryTerm(orgId, { status: 'published' }).then(t => t.id),
      insertGlossaryTerm(orgId, { status: 'draft'     }).then(t => t.id),
      insertGlossaryTerm(orgId, { status: 'archived'  }).then(t => t.id),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  describe('getGlossaryTerms — list', () => {
    it('viewer sees only published terms', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getGlossaryTerms()
      const ids = result.map(t => t.id)
      expect(ids).toContain(publishedId)
      expect(ids).not.toContain(draftId)
      expect(ids).not.toContain(archivedId)
    })

    it('contributor sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const result = await getGlossaryTerms()
      const ids = result.map(t => t.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })

    it('admin sees all statuses', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await getGlossaryTerms()
      const ids = result.map(t => t.id)
      expect(ids).toContain(publishedId)
      expect(ids).toContain(draftId)
      expect(ids).toContain(archivedId)
    })
  })

  describe('getGlossaryTerm — detail', () => {
    it('viewer can access a published term by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      const result = await getGlossaryTerm(publishedId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(publishedId)
    })

    it('viewer gets null for a draft term', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getGlossaryTerm(draftId)).toBeNull()
    })

    it('viewer gets null for an archived term', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      expect(await getGlossaryTerm(archivedId)).toBeNull()
    })

    it('contributor can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const [a, b, c] = await Promise.all([
        getGlossaryTerm(publishedId),
        getGlossaryTerm(draftId),
        getGlossaryTerm(archivedId),
      ])
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
    })

    it('admin can access any status by ID', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      expect(await getGlossaryTerm(draftId)).not.toBeNull()
    })
  })
})
