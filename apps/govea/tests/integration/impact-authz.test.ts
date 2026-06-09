/**
 * Integration tests: access control for getApplicationImpact /
 * getCapabilityImpact (#738).
 *
 * These `'use server'` actions previously ran with no auth and no tenant
 * scoping, so a caller could read another org's dependency/impact data by
 * passing an arbitrary id (cross-tenant IDOR). These tests lock in the fix:
 *
 *   - No session → redirect('/login') (modelled here as a thrown sentinel).
 *   - An org-private entity in another org → empty result, never its data.
 *   - The owning org's caller → real data (guard doesn't over-block).
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  applications, capabilities, applicationCapabilities, capabilityPersonas, personas,
} from '@/db/schema'
import { randomUUID } from 'node:crypto'
import { getApplicationImpact, getCapabilityImpact } from '@/actions/impact'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

// redirect() throws in Next's real implementation; model that here so a
// guard that redirects is observable as a throw rather than a silent return.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) },
}))

let orgA: string
let orgB: string
let userA: TestUser
let appB: string
let capB: string

beforeAll(async () => {
  orgA = (await createTestOrg()).id
  orgB = (await createTestOrg()).id
  userA = await createTestUser(orgA, 'admin')

  // An org-private application + capability owned by org B, with a linked
  // persona so a successful read would return non-empty data.
  appB = randomUUID()
  capB = randomUUID()
  const personaB = randomUUID()
  await db.insert(applications).values({
    id: appB, organizationId: orgB, name: 'Org B App',
    lifecycleStatus: 'active', status: 'published', visibility: 'org',
  })
  await db.insert(capabilities).values({
    id: capB, organizationId: orgB, name: 'Org B Capability',
    status: 'published', visibility: 'org',
  })
  await db.insert(personas).values({
    id: personaB, organizationId: orgB, name: 'Org B Persona',
    status: 'published', visibility: 'org',
  })
  await db.insert(applicationCapabilities).values({ applicationId: appB, capabilityId: capB })
  await db.insert(capabilityPersonas).values({ capabilityId: capB, personaId: personaB })
})

afterAll(async () => {
  await cleanupOrg(orgA)
  await cleanupOrg(orgB)
})

describe('getApplicationImpact access control (#738)', () => {
  it('redirects to /login when there is no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    await expect(getApplicationImpact(appB)).rejects.toThrow('REDIRECT:/login')
  })

  it('does not leak another org\'s org-private application', async () => {
    mockAuth.mockResolvedValueOnce(makeSession(userA))
    const result = await getApplicationImpact(appB)
    expect(result).toEqual({
      orphanedCapabilities: [], affectedPersonas: [], activeInitiatives: [], riskLevel: 'none',
    })
  })

  it('returns real data for the owning org', async () => {
    const userB = await createTestUser(orgB, 'admin')
    mockAuth.mockResolvedValueOnce(makeSession(userB))
    const result = await getApplicationImpact(appB)
    // capB is sole-supported by appB and has a persona → orphan + high risk.
    expect(result.orphanedCapabilities.map(c => c.id)).toContain(capB)
    expect(result.affectedPersonas.length).toBeGreaterThan(0)
    expect(result.riskLevel).toBe('high')
  })
})

describe('getCapabilityImpact access control (#738)', () => {
  it('redirects to /login when there is no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    await expect(getCapabilityImpact(capB)).rejects.toThrow('REDIRECT:/login')
  })

  it('does not leak another org\'s org-private capability', async () => {
    mockAuth.mockResolvedValueOnce(makeSession(userA))
    const result = await getCapabilityImpact(capB)
    expect(result).toEqual({
      dependentPersonas: [], soleCoveragePersonaIds: [], activeInitiatives: [], riskLevel: 'none',
    })
  })

  it('returns real data for the owning org', async () => {
    const userB = await createTestUser(orgB, 'admin')
    mockAuth.mockResolvedValueOnce(makeSession(userB))
    const result = await getCapabilityImpact(capB)
    expect(result.dependentPersonas.length).toBeGreaterThan(0)
    expect(result.soleCoveragePersonaIds.length).toBeGreaterThan(0)
    expect(result.riskLevel).toBe('high')
  })
})
