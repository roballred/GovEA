/**
 * Integration tests: applyStarterPack server action (#587, #749)
 *
 * Covers the recipe-backed TOGAF 10 Starter pack:
 *  - Admin can apply the pack into a fresh org and gets expected per-entity
 *    created counts, including initiatives.
 *  - The pack installs the TOGAF recipe first (taxonomy types/terms/bindings,
 *    glossary, principles) and reports those counts.
 *  - Contributor + viewer are rejected (admin-only).
 *  - Re-applying is idempotent — existing items skip, create counts go to zero,
 *    and the recipe install reports zero new rows.
 *  - Junctions are created (capability ↔ persona, application ↔ capability,
 *    objective ↔ capability, ADR ↔ capability, initiative ↔ capability).
 *  - New capabilities/applications/initiatives are tagged to the TOGAF taxonomy,
 *    so the report presets (Application Landscape by domain, ADM coverage by
 *    phase) have data — i.e. nothing is "unmapped".
 *  - Items carry the STARTER_CONTENT_MARKER in their description.
 *  - ADR number collisions are resolved with a numeric suffix.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, strategicObjectives, adrs, initiatives,
  capabilityPersonas, applicationCapabilities, objectiveCapabilities, adrCapabilities, initiativeCapabilities,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { applyStarterPack } from '@/actions/starter-content'
import { STARTER_CONTENT_MARKER, TOGAF_STARTER } from '@/lib/starter-content/togaf-starter'
import { groupByTaxonomyType, type EntityRef } from '@/lib/reports/group-by-taxonomy'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('applyStarterPack — TOGAF 10 starter (#749)', () => {
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
    await expect(applyStarterPack('togaf-starter')).rejects.toThrow('Forbidden')

    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(applyStarterPack('togaf-starter')).rejects.toThrow('Forbidden')
  })

  it('throws on unknown pack name', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    await expect(applyStarterPack('not-a-real-pack')).rejects.toThrow('Unknown starter pack')
  })

  it('admin can apply the TOGAF starter into a fresh org', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const result = await applyStarterPack('togaf-starter')

    expect(result.packName).toBe('togaf-starter')
    expect(result.personasCreated).toBe(TOGAF_STARTER.personas.length)
    expect(result.capabilitiesCreated).toBe(TOGAF_STARTER.capabilities.length)
    expect(result.applicationsCreated).toBe(TOGAF_STARTER.applications.length)
    expect(result.objectivesCreated).toBe(TOGAF_STARTER.objectives.length)
    expect(result.adrsCreated).toBe(TOGAF_STARTER.adrs.length)
    expect(result.initiativesCreated).toBe(TOGAF_STARTER.initiatives.length)
    // Nothing skipped on a fresh org
    expect(result.personasSkipped).toBe(0)
    expect(result.capabilitiesSkipped).toBe(0)
    expect(result.applicationsSkipped).toBe(0)
    expect(result.objectivesSkipped).toBe(0)
    expect(result.adrsSkipped).toBe(0)
    expect(result.initiativesSkipped).toBe(0)
  })

  it('tags every item with STARTER_CONTENT_MARKER in description', async () => {
    const allPersonas = await db.select().from(personas).where(eq(personas.organizationId, orgId))
    const allCaps = await db.select().from(capabilities).where(eq(capabilities.organizationId, orgId))
    const allApps = await db.select().from(applications).where(eq(applications.organizationId, orgId))
    const allObjs = await db.select().from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    const allAdrs = await db.select().from(adrs).where(eq(adrs.organizationId, orgId))
    const allInits = await db.select().from(initiatives).where(eq(initiatives.organizationId, orgId))

    for (const p of allPersonas) expect(p.description).toContain(STARTER_CONTENT_MARKER)
    for (const c of allCaps) expect(c.description).toContain(STARTER_CONTENT_MARKER)
    for (const a of allApps) expect(a.description).toContain(STARTER_CONTENT_MARKER)
    for (const o of allObjs) expect(o.description).toContain(STARTER_CONTENT_MARKER)
    for (const adr of allAdrs) expect(adr.context).toContain(STARTER_CONTENT_MARKER)
    for (const i of allInits) expect(i.description).toContain(STARTER_CONTENT_MARKER)
  })

  it('creates capability ↔ persona junctions', async () => {
    const cap = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.name, 'Citizen Service Management')),
    })
    expect(cap).toBeDefined()
    const links = await db.select().from(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, cap!.id))
    // Citizen Service Management links to Resident + Department Director
    expect(links).toHaveLength(2)
  })

  it('creates application ↔ capability junctions', async () => {
    const app = await db.query.applications.findFirst({
      where: and(eq(applications.organizationId, orgId), eq(applications.name, 'Citizen Portal')),
    })
    expect(app).toBeDefined()
    const links = await db.select().from(applicationCapabilities).where(eq(applicationCapabilities.applicationId, app!.id))
    expect(links).toHaveLength(2) // Citizen Service Management + Permitting & Licensing
  })

  it('creates objective ↔ capability junctions', async () => {
    const obj = await db.query.strategicObjectives.findFirst({
      where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.name, 'Improve Digital Service Delivery')),
    })
    expect(obj).toBeDefined()
    const links = await db.select().from(objectiveCapabilities).where(eq(objectiveCapabilities.objectiveId, obj!.id))
    expect(links).toHaveLength(3)
  })

  it('creates ADR ↔ capability junctions', async () => {
    const adr = await db.query.adrs.findFirst({
      where: and(eq(adrs.organizationId, orgId), eq(adrs.title, 'Adopt a cloud-first hosting strategy')),
    })
    expect(adr).toBeDefined()
    const links = await db.select().from(adrCapabilities).where(eq(adrCapabilities.adrId, adr!.id))
    expect(links).toHaveLength(2) // Cloud Hosting Platform + Identity & Access Management
  })

  it('creates initiative ↔ capability junctions', async () => {
    const init = await db.query.initiatives.findFirst({
      where: and(eq(initiatives.organizationId, orgId), eq(initiatives.name, 'Citizen Portal Modernization')),
    })
    expect(init).toBeDefined()
    const links = await db.select().from(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, init!.id))
    expect(links).toHaveLength(2) // Citizen Service Management + Permitting & Licensing
  })

  it('tags capabilities to TOGAF domains and ADM phases (report-ready)', async () => {
    const caps = await db.select({ id: capabilities.id, name: capabilities.name })
      .from(capabilities).where(eq(capabilities.organizationId, orgId))
    const refs: EntityRef[] = caps

    const byDomain = await groupByTaxonomyType(orgId, 'capability', 'togaf-architecture-domain', refs)
    expect(byDomain).not.toBeNull()
    expect(byDomain!.total).toBe(TOGAF_STARTER.capabilities.length)
    expect(byDomain!.unmapped).toHaveLength(0) // every starter capability is tagged
    const bizGroup = byDomain!.groups.find(g => g.termSlug === 'business-architecture')
    expect(bizGroup?.members).toHaveLength(2) // Citizen Service Management + Permitting & Licensing

    const byPhase = await groupByTaxonomyType(orgId, 'capability', 'togaf-adm-phase', refs)
    expect(byPhase).not.toBeNull()
    expect(byPhase!.unmapped).toHaveLength(0)
    const phaseB = byPhase!.groups.find(g => g.termSlug === 'adm-b-business-architecture')
    expect(phaseB?.members).toHaveLength(2)
  })

  it('tags applications to TOGAF domains (Application Landscape report-ready)', async () => {
    const apps = await db.select({ id: applications.id, name: applications.name })
      .from(applications).where(eq(applications.organizationId, orgId))
    const byDomain = await groupByTaxonomyType(orgId, 'application', 'togaf-architecture-domain', apps)
    expect(byDomain).not.toBeNull()
    expect(byDomain!.total).toBe(TOGAF_STARTER.applications.length)
    expect(byDomain!.unmapped).toHaveLength(0)
  })

  it('tags initiatives to ADM phases (ADM coverage report-ready)', async () => {
    const inits = await db.select({ id: initiatives.id, name: initiatives.name })
      .from(initiatives).where(eq(initiatives.organizationId, orgId))
    const byPhase = await groupByTaxonomyType(orgId, 'initiative', 'togaf-adm-phase', inits)
    expect(byPhase).not.toBeNull()
    expect(byPhase!.total).toBe(TOGAF_STARTER.initiatives.length)
    expect(byPhase!.unmapped).toHaveLength(0)
  })

  it('is idempotent — re-applying skips existing items and recipe adds nothing', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const result = await applyStarterPack('togaf-starter')

    expect(result.personasCreated).toBe(0)
    expect(result.capabilitiesCreated).toBe(0)
    expect(result.applicationsCreated).toBe(0)
    expect(result.objectivesCreated).toBe(0)
    expect(result.adrsCreated).toBe(0)
    expect(result.initiativesCreated).toBe(0)

    expect(result.personasSkipped).toBe(TOGAF_STARTER.personas.length)
    expect(result.capabilitiesSkipped).toBe(TOGAF_STARTER.capabilities.length)
    expect(result.applicationsSkipped).toBe(TOGAF_STARTER.applications.length)
    expect(result.objectivesSkipped).toBe(TOGAF_STARTER.objectives.length)
    expect(result.adrsSkipped).toBe(TOGAF_STARTER.adrs.length)
    expect(result.initiativesSkipped).toBe(TOGAF_STARTER.initiatives.length)

    // Recipe re-install is idempotent — no new taxonomy/glossary/principle rows.
    expect(result.recipe).toMatchObject({
      taxonomyTypes: 0, taxonomyTerms: 0, bindings: 0, glossaryTerms: 0, principles: 0,
    })
  })

  it('reports recipe install counts on a fresh org', async () => {
    const isolatedOrg = await createTestOrg()
    const isolatedAdmin = await createTestUser(isolatedOrg.id, 'admin')
    mockAuth.mockResolvedValue(makeSession(isolatedAdmin))

    const result = await applyStarterPack('togaf-starter')
    expect(result.recipe).toMatchObject({
      taxonomyTypes: 2,   // Architecture Domain + ADM Phase
      taxonomyTerms: 14,  // 4 domains + 10 ADM phases
      bindings: 4,        // domain→cap, domain→app, adm→cap, adm→initiative
      glossaryTerms: 5,
      principles: 4,
    })

    await cleanupOrg(isolatedOrg.id)
  })

  it('avoids ADR number collisions by appending a numeric suffix', async () => {
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
    const result = await applyStarterPack('togaf-starter')
    expect(result.adrsCreated).toBe(TOGAF_STARTER.adrs.length)

    const allAdrs = await db.select({ number: adrs.number, title: adrs.title })
      .from(adrs).where(eq(adrs.organizationId, isolatedOrg.id))
    const adrNumbers = allAdrs.map(a => a.number).sort()
    expect(adrNumbers).toEqual(['ADR-001', 'ADR-001-1', 'ADR-002'])

    await cleanupOrg(isolatedOrg.id)
  })
})
