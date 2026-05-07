/**
 * Lock in the security fix from #413 / #414:
 * read server actions read organizationId and role from the session,
 * never from caller-supplied parameters.
 *
 * The signatures are typed with no parameters, so a caller cannot pass
 * a foreign organizationId at all — the typecheck catches it. These
 * tests cover the runtime side: no session → redirect, and a session
 * for org A can never see org B data because the server reads orgId
 * from the session.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getCapabilities } from '@/actions/capabilities'
import { getApplications } from '@/actions/applications'
import { getObjectives } from '@/actions/objectives'
import { getInitiatives } from '@/actions/initiatives'
import { getPrinciples } from '@/actions/principles'
import { getValueStreams } from '@/actions/value-streams'
import { getServices } from '@/actions/services'
import { getGlossaryTerms } from '@/actions/glossary'
import { getADRs } from '@/actions/adrs'
import { getPersonas } from '@/actions/personas'
import { getConnections, getOtherOrganizations } from '@/actions/connections'
import {
  getTaxonomyTerms, getTaxonomyDomains, getTaxonomyTermsWithChildren,
  getPrincipleTypeValueUsage, getPrincipleTypes,
  getPersonaTypesFromTaxonomy, getPersonaTagsFromTaxonomy,
} from '@/actions/taxonomy'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, insertCapability, insertApplication,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('read action auth (#413 / #414)', () => {
  let orgA: TestOrg
  let orgB: TestOrg
  let adminA: TestUser
  let adminB: TestUser
  let capAId: string
  let capBId: string
  let appAId: string
  let appBId: string

  beforeAll(async () => {
    orgA = await createTestOrg()
    orgB = await createTestOrg()
    adminA = await createTestUser(orgA.id, 'admin')
    adminB = await createTestUser(orgB.id, 'admin')
    const capA = await insertCapability(orgA.id, { name: 'OrgA Cap', status: 'published' })
    const capB = await insertCapability(orgB.id, { name: 'OrgB Cap', status: 'published' })
    const appA = await insertApplication(orgA.id, { name: 'OrgA App', status: 'published' })
    const appB = await insertApplication(orgB.id, { name: 'OrgB App', status: 'published' })
    capAId = capA.id
    capBId = capB.id
    appAId = appA.id
    appBId = appB.id
  })

  afterAll(async () => {
    await cleanupOrg(orgA.id)
    await cleanupOrg(orgB.id)
  })

  beforeEach(() => {
    mockAuth.mockReset()
  })

  // ── No-session redirect (proves middleware-equivalent guard at action layer) ──

  describe('no session → redirect to /login', () => {
    it.each([
      ['getCapabilities', getCapabilities],
      ['getApplications', getApplications],
      ['getObjectives', getObjectives],
      ['getInitiatives', getInitiatives],
      ['getPrinciples', getPrinciples],
      ['getValueStreams', getValueStreams],
      ['getServices', getServices],
      ['getGlossaryTerms', getGlossaryTerms],
      ['getADRs', getADRs],
      ['getPersonas', getPersonas],
      ['getConnections', getConnections],
      ['getTaxonomyTerms', getTaxonomyTerms],
      ['getTaxonomyDomains', getTaxonomyDomains],
      ['getTaxonomyTermsWithChildren', getTaxonomyTermsWithChildren],
      ['getPrincipleTypeValueUsage', getPrincipleTypeValueUsage],
      ['getPrincipleTypes', getPrincipleTypes],
      ['getPersonaTypesFromTaxonomy', getPersonaTypesFromTaxonomy],
      ['getPersonaTagsFromTaxonomy', getPersonaTagsFromTaxonomy],
    ] as const)('%s redirects when no session', async (_name, fn) => {
      mockAuth.mockResolvedValue(null)
      await expect(fn()).rejects.toThrow('REDIRECT:/login')
    })

    it('getOtherOrganizations rejects when no session (admin-only)', async () => {
      mockAuth.mockResolvedValue(null)
      await expect(getOtherOrganizations()).rejects.toThrow('REDIRECT:/login')
    })
  })

  // ── Cross-tenant isolation: session orgId is authoritative ──

  describe('cross-tenant isolation', () => {
    it('admin in org A only sees org A capabilities', async () => {
      mockAuth.mockResolvedValue(makeSession(adminA))
      const list = await getCapabilities()
      const ids = list.map(c => c.id)
      expect(ids).toContain(capAId)
      expect(ids).not.toContain(capBId)
    })

    it('admin in org B only sees org B capabilities', async () => {
      mockAuth.mockResolvedValue(makeSession(adminB))
      const list = await getCapabilities()
      const ids = list.map(c => c.id)
      expect(ids).toContain(capBId)
      expect(ids).not.toContain(capAId)
    })

    it('admin in org A only sees org A applications', async () => {
      mockAuth.mockResolvedValue(makeSession(adminA))
      const list = await getApplications()
      const ids = list.map(a => a.id)
      expect(ids).toContain(appAId)
      expect(ids).not.toContain(appBId)
    })

    it('getOtherOrganizations excludes caller org', async () => {
      mockAuth.mockResolvedValue(makeSession(adminA))
      const list = await getOtherOrganizations()
      const ids = list.map(o => o.id)
      expect(ids).not.toContain(orgA.id)
    })
  })

  // ── Type-level guarantee: no caller can pass a foreign orgId ──

  describe('signatures (compile-time guarantee)', () => {
    it('functions take no parameters — TypeScript prevents passing a foreign orgId', () => {
      // If a future change re-adds a parameter, this typecheck fails.
      // The runtime check below is redundant with the typecheck but locks in the intent.
      expect(getCapabilities.length).toBe(0)
      expect(getApplications.length).toBe(0)
      expect(getObjectives.length).toBe(0)
      expect(getInitiatives.length).toBe(0)
      expect(getPrinciples.length).toBe(0)
      expect(getValueStreams.length).toBe(0)
      expect(getServices.length).toBe(0)
      expect(getGlossaryTerms.length).toBe(0)
      expect(getADRs.length).toBe(0)
      expect(getPersonas.length).toBe(0)
      expect(getConnections.length).toBe(0)
      expect(getOtherOrganizations.length).toBe(0)
      expect(getTaxonomyTerms.length).toBe(0)
      expect(getTaxonomyDomains.length).toBe(0)
      expect(getTaxonomyTermsWithChildren.length).toBe(0)
      expect(getPrincipleTypeValueUsage.length).toBe(0)
      expect(getPrincipleTypes.length).toBe(0)
      expect(getPersonaTypesFromTaxonomy.length).toBe(0)
      expect(getPersonaTagsFromTaxonomy.length).toBe(0)
    })
  })
})
