/**
 * Lock in the security fix from #415:
 * junction-table writes verify both source AND target entity ownership.
 *
 * Local junction tables (capabilityPersonas, applicationCapabilities, etc.)
 * must never reference a foreign org's row. Cross-org references are only
 * allowed through `crossOrgLinks` with the dedicated approval flow.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  linkCapabilityPersona, linkCapabilityApplication, linkCapabilityObjective,
  linkApplicationCapability, linkPersonaCapability,
  linkInitiativeCapability, linkObjectiveCapability,
  linkAdrCapability, linkPrincipleCapability, linkServiceCapability,
} from '@/actions/links'
import { createCapability, editCapability } from '@/actions/capabilities'
import { db } from '@/db/client'
import { capabilityPersonas } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession,
  insertCapability, insertPersona, insertApplication, insertObjective,
  insertInitiative, insertAdr, insertPrinciple, insertService,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('junction target ownership (#415)', () => {
  let orgA: TestOrg
  let orgB: TestOrg
  let contributorA: TestUser

  // Org A entities (caller's own)
  let capA: { id: string }
  let personaA: { id: string }
  let appA: { id: string }
  let objA: { id: string }
  let serviceA: { id: string }

  // Org B entities (foreign — caller must NOT be able to link to these)
  let capB: { id: string }
  let personaB: { id: string }
  let appB: { id: string }
  let objB: { id: string }
  let initB: { id: string }
  let adrB: { id: string }
  let principleB: { id: string }

  beforeAll(async () => {
    orgA = await createTestOrg()
    orgB = await createTestOrg()
    contributorA = await createTestUser(orgA.id, 'contributor')

    capA       = await insertCapability(orgA.id)
    personaA   = await insertPersona(orgA.id)
    appA       = await insertApplication(orgA.id)
    objA       = await insertObjective(orgA.id)
    serviceA   = await insertService(orgA.id)

    capB       = await insertCapability(orgB.id)
    personaB   = await insertPersona(orgB.id)
    appB       = await insertApplication(orgB.id)
    objB       = await insertObjective(orgB.id)
    initB      = await insertInitiative(orgB.id)
    adrB       = await insertAdr(orgB.id)
    principleB = await insertPrinciple(orgB.id)

    mockAuth.mockResolvedValue(makeSession(contributorA))
  })

  afterAll(async () => {
    await cleanupOrg(orgA.id)
    await cleanupOrg(orgB.id)
  })

  // ── Cross-tenant link rejection ─────────────────────────────────────────────

  describe('foreign target rejected by every link variant', () => {
    it('linkCapabilityPersona: own capability + foreign persona → Forbidden', async () => {
      await expect(linkCapabilityPersona(capA.id, personaB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkCapabilityApplication: own capability + foreign application → Forbidden', async () => {
      await expect(linkCapabilityApplication(capA.id, appB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkCapabilityObjective: own capability + foreign objective → Forbidden', async () => {
      await expect(linkCapabilityObjective(capA.id, objB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkApplicationCapability: own application + foreign capability → Forbidden', async () => {
      await expect(linkApplicationCapability(appA.id, capB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkPersonaCapability: own persona + foreign capability → Forbidden', async () => {
      await expect(linkPersonaCapability(personaA.id, capB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkInitiativeCapability: foreign initiative + own capability → Forbidden (source check)', async () => {
      // Source ownership check rejects this; included to confirm both ends are guarded.
      await expect(linkInitiativeCapability(initB.id, capA.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkObjectiveCapability: own objective + foreign capability → Forbidden', async () => {
      await expect(linkObjectiveCapability(objA.id, capB.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkAdrCapability: foreign adr + own capability → Forbidden (source check)', async () => {
      await expect(linkAdrCapability(adrB.id, capA.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkPrincipleCapability: foreign principle + own capability → Forbidden (source check)', async () => {
      await expect(linkPrincipleCapability(principleB.id, capA.id)).rejects.toThrow(/Forbidden/)
    })

    it('linkServiceCapability: own service + foreign capability → Forbidden', async () => {
      await expect(linkServiceCapability(serviceA.id, capB.id)).rejects.toThrow(/Forbidden/)
    })
  })

  // ── createCapability / editCapability junction validation ──────────────────

  describe('createCapability validates personaIds and parentId', () => {
    it('rejects createCapability with a foreign personaId', async () => {
      const fd = new FormData()
      fd.set('name', 'New Cap A')
      fd.set('status', 'draft')
      fd.set('visibility', 'org')
      fd.append('personaIds', personaB.id)
      await expect(createCapability(fd)).rejects.toThrow(/Forbidden/)
    })

    it('rejects createCapability with a foreign parentId', async () => {
      const fd = new FormData()
      fd.set('name', 'New Cap A2')
      fd.set('status', 'draft')
      fd.set('visibility', 'org')
      fd.set('parentId', capB.id)
      await expect(createCapability(fd)).rejects.toThrow(/Forbidden/)
    })

    it('rejects editCapability with a foreign personaId', async () => {
      const fd = new FormData()
      fd.set('name', 'Cap A renamed')
      fd.set('status', 'draft')
      fd.set('visibility', 'org')
      fd.append('personaIds', personaB.id)
      await expect(editCapability(capA.id, fd)).rejects.toThrow(/Forbidden/)
    })

    it('rejects editCapability with a foreign parentId', async () => {
      const fd = new FormData()
      fd.set('name', 'Cap A2 renamed')
      fd.set('status', 'draft')
      fd.set('visibility', 'org')
      fd.set('parentId', capB.id)
      await expect(editCapability(capA.id, fd)).rejects.toThrow(/Forbidden/)
    })
  })

  // ── Happy path regression: same-org junctions still work ───────────────────

  describe('same-org junctions still work', () => {
    it('linkCapabilityPersona with own-org rows succeeds and creates the row', async () => {
      await linkCapabilityPersona(capA.id, personaA.id)
      const row = await db.query.capabilityPersonas.findFirst({
        where: and(
          eq(capabilityPersonas.capabilityId, capA.id),
          eq(capabilityPersonas.personaId, personaA.id),
        ),
      })
      expect(row).toBeDefined()
    })
  })
})
