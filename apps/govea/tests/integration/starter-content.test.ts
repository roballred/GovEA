/**
 * Integration tests: applyStarterPack server action (#587)
 *
 * Covers:
 *  - Admin can apply the EasyEA starter pack into a fresh org and gets
 *    expected per-entity created counts.
 *  - Contributor + viewer are rejected (admin-only).
 *  - Re-applying the same pack is idempotent — existing items skip,
 *    create counts go to zero.
 *  - Junctions are created (capability ↔ persona, application ↔ capability,
 *    objective ↔ capability, ADR ↔ capability).
 *  - Items carry the STARTER_CONTENT_MARKER in their description so the
 *    admin can find them later.
 *  - ADR number collisions are resolved with a numeric suffix rather than
 *    failing the row.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, strategicObjectives, adrs,
  capabilityPersonas, applicationCapabilities, objectiveCapabilities, adrCapabilities,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { applyStarterPack } from '@/actions/starter-content'
import { STARTER_CONTENT_MARKER, EASYEA_STARTER } from '@/lib/starter-content/easyea-starter'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('applyStarterPack — EasyEA starter (#587)', () => {
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

  it('rejects contributor and viewer (admin-only)', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await expect(applyStarterPack('easyea-starter')).rejects.toThrow('Forbidden')

    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(applyStarterPack('easyea-starter')).rejects.toThrow('Forbidden')
  })

  it('throws on unknown pack name', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    await expect(applyStarterPack('not-a-real-pack')).rejects.toThrow('Unknown starter pack')
  })

  it('admin can apply EasyEA starter into a fresh org', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const result = await applyStarterPack('easyea-starter')

    expect(result.packName).toBe('easyea-starter')
    expect(result.personasCreated).toBe(EASYEA_STARTER.personas.length)
    expect(result.capabilitiesCreated).toBe(EASYEA_STARTER.capabilities.length)
    expect(result.applicationsCreated).toBe(EASYEA_STARTER.applications.length)
    expect(result.objectivesCreated).toBe(EASYEA_STARTER.objectives.length)
    expect(result.adrsCreated).toBe(EASYEA_STARTER.adrs.length)
    // Nothing skipped on a fresh org
    expect(result.personasSkipped).toBe(0)
    expect(result.capabilitiesSkipped).toBe(0)
    expect(result.applicationsSkipped).toBe(0)
    expect(result.objectivesSkipped).toBe(0)
    expect(result.adrsSkipped).toBe(0)
  })

  it('tags every item with STARTER_CONTENT_MARKER in description', async () => {
    const allPersonas = await db.select().from(personas).where(eq(personas.organizationId, orgId))
    const allCaps = await db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
    const allApps = await db.select().from(applications).where(eq(applications.organizationId, orgId))
    const allObjs = await db.select().from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    const allAdrs = await db.select().from(adrs).where(eq(adrs.organizationId, orgId))

    for (const p of allPersonas) expect(p.description).toContain(STARTER_CONTENT_MARKER)
    for (const c of allCaps) expect(c.description).toContain(STARTER_CONTENT_MARKER)
    for (const a of allApps) expect(a.description).toContain(STARTER_CONTENT_MARKER)
    for (const o of allObjs) expect(o.description).toContain(STARTER_CONTENT_MARKER)
    for (const adr of allAdrs) expect(adr.context).toContain(STARTER_CONTENT_MARKER)
  })

  it('creates capability ↔ persona junctions', async () => {
    const onlinePermitting = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Online Permitting')),
    })
    expect(onlinePermitting).toBeDefined()
    const links = await db.select().from(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, onlinePermitting!.id))
    // Pack says Online Permitting links to Resident + Small Business Owner
    expect(links).toHaveLength(2)
  })

  it('creates application ↔ capability junctions', async () => {
    const permittingApp = await db.query.applications.findFirst({
      where: and(eq(applications.organizationId, orgId), eq(applications.name, 'Example Permitting Platform')),
    })
    expect(permittingApp).toBeDefined()
    const links = await db.select().from(applicationCapabilities).where(eq(applicationCapabilities.applicationId, permittingApp!.id))
    expect(links).toHaveLength(2) // Online Permitting + Business License Management
  })

  it('creates objective ↔ capability junctions', async () => {
    const obj = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Improve Digital Service Delivery')),
    })
    expect(obj).toBeDefined()
    const links = await db.select().from(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, obj!.id))
    expect(links).toHaveLength(3) // Online Permitting, Service Request Management, Digital Identity & Authentication
  })

  it('creates ADR ↔ capability junctions', async () => {
    const adr = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.title, 'Adopt SaaS-first hosting for new application acquisitions')),
    })
    expect(adr).toBeDefined()
    const links = await db.select().from(adrCapabilities).where(eq(adrCapabilities.adrId, adr!.id))
    expect(links).toHaveLength(2) // Digital Identity & Authentication, Online Permitting
  })

  it('is idempotent — re-applying skips existing items', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const result = await applyStarterPack('easyea-starter')

    expect(result.personasCreated).toBe(0)
    expect(result.capabilitiesCreated).toBe(0)
    expect(result.applicationsCreated).toBe(0)
    expect(result.objectivesCreated).toBe(0)
    expect(result.adrsCreated).toBe(0)

    expect(result.personasSkipped).toBe(EASYEA_STARTER.personas.length)
    expect(result.capabilitiesSkipped).toBe(EASYEA_STARTER.capabilities.length)
    expect(result.applicationsSkipped).toBe(EASYEA_STARTER.applications.length)
    expect(result.objectivesSkipped).toBe(EASYEA_STARTER.objectives.length)
    expect(result.adrsSkipped).toBe(EASYEA_STARTER.adrs.length)
  })

  it('avoids ADR number collisions by appending a numeric suffix', async () => {
    // Seed a separate org with a pre-existing ADR-001 with a different title,
    // then apply the starter and confirm the inserted ADR-001 from the pack
    // becomes ADR-001-1 (collision-avoidance, not overwrite).
    const isolatedOrg = await createTestOrg()
    const isolatedAdmin = await createTestUser(isolatedOrg.id, 'admin')

    await db.insert(adrs).values({
      id: randomUUID(),
      organizationId: isolatedOrg.id,
      number: 'ADR-001',
      title: 'Existing decision unrelated to the starter',
      status: 'accepted',
      visibility: 'org',
    })

    mockAuth.mockResolvedValue(makeSession(isolatedAdmin))
    const result = await applyStarterPack('easyea-starter')
    expect(result.adrsCreated).toBe(EASYEA_STARTER.adrs.length)

    const allAdrs = await db.select({ number: adrs.number, title: adrs.title })
      .from(adrs).where(eq(adrs.organizationId, isolatedOrg.id))
    // We now have: existing ADR-001 + starter's ADR-001 (which became ADR-001-1) + ADR-002.
    const adrNumbers = allAdrs.map(a => a.number).sort()
    expect(adrNumbers).toEqual(['ADR-001', 'ADR-001-1', 'ADR-002'])

    await cleanupOrg(isolatedOrg.id)
  })
})
