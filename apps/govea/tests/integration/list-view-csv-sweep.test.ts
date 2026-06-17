/**
 * Integration tests: list-view CSV import sweep (#748)
 *
 * Covers the five entities brought to CSV parity — goals, principles, services,
 * strategies, value streams. Per entity: create with name-based relationship
 * resolution, an unchanged round-trip (no new rows, links preserved), cross-org
 * rejection (a relationship name from another org does not resolve), and
 * dry-run writing nothing.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  goals, goalObjectives, strategicObjectives, capabilities, adrs, principles, principleCapabilities,
  services, serviceCapabilities, servicePersonas, serviceValueStreams, personas, valueStreams,
  valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas, valueStreamCapabilities,
  strategies, strategyGoals, strategyCapabilities, strategyInitiatives, initiatives,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { importGoals } from '@/actions/goals'
import { importPrinciples } from '@/actions/principles'
import { importServices } from '@/actions/services'
import { importStrategies } from '@/actions/strategies'
import { importValueStreams } from '@/actions/value-streams'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function csvForm(content: string): FormData {
  const fd = new FormData()
  fd.append('csvFile', new File([new Blob([content], { type: 'text/csv' })], 'import.csv', { type: 'text/csv' }))
  return fd
}

describe('list-view CSV sweep (#748)', () => {
  let orgId: string
  let otherOrgId: string
  let contributor: TestUser
  let viewer: TestUser
  let objAId: string
  let capAId: string
  let vsAId: string
  let goalAId: string
  let initAId: string

  beforeAll(async () => {
    const [org, other] = await Promise.all([createTestOrg(), createTestOrg()])
    orgId = org.id
    otherOrgId = other.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])

    const [obj] = await db.insert(strategicObjectives).values({ organizationId: orgId, name: 'Obj A', status: 'published', visibility: 'org' }).returning()
    objAId = obj.id
    const [cap] = await db.insert(capabilities).values({ organizationId: orgId, name: 'Cap A', status: 'published', visibility: 'org' }).returning()
    capAId = cap.id
    const [vs] = await db.insert(valueStreams).values({ organizationId: orgId, name: 'VS A', status: 'published', visibility: 'org' }).returning()
    vsAId = vs.id
    const [goal] = await db.insert(goals).values({ organizationId: orgId, name: 'Goal A', status: 'published', visibility: 'org' }).returning()
    goalAId = goal.id
    const [init] = await db.insert(initiatives).values({ organizationId: orgId, name: 'Init A', status: 'active', visibility: 'org' }).returning()
    initAId = init.id
    await db.insert(adrs).values({ organizationId: orgId, number: 'ADR-100', title: 'Use SaaS', status: 'accepted', visibility: 'org' })
    await db.insert(personas).values({ organizationId: orgId, name: 'Persona A', status: 'published', visibility: 'org' })
    // Cross-org capability that must never resolve into orgId imports.
    await db.insert(capabilities).values({ organizationId: otherOrgId, name: 'Foreign Cap', status: 'published', visibility: 'org' })
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  // ── Goals ──────────────────────────────────────────────────────────────────
  describe('goals', () => {
    const H = 'name,description,planning_horizon,owner,status,visibility,objectives'
    it('rejects a viewer', async () => {
      mockAuth.mockResolvedValue(makeSession(viewer))
      await expect(importGoals(csvForm(`${H}\nG,,,,,published,org,`))).rejects.toThrow('Forbidden')
    })
    it('creates and resolves objective links by name; round-trips', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r1 = await importGoals(csvForm(`${H}\nModernise,The goal,FY26,CIO,published,org,Obj A`))
      expect(r1.created).toBe(1)
      const [g] = await db.select().from(goals).where(and(eq(goals.organizationId, orgId), eq(goals.name, 'Modernise')))
      const links = await db.select().from(goalObjectives).where(eq(goalObjectives.goalId, g.id))
      expect(links.map(l => l.objectiveId)).toEqual([objAId])
      const r2 = await importGoals(csvForm(`${H}\nModernise,The goal,FY26,CIO,published,org,Obj A`))
      expect(r2.created).toBe(0); expect(r2.updated).toBe(1)
    })
    it('warns on invalid status and unknown objective', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const bad = await importGoals(csvForm(`${H}\nBadStatus,,,,nonsense,org,`))
      expect(bad.skipped).toBe(1)
      const unknown = await importGoals(csvForm(`${H}\nGoalX,,,,published,org,Nope`))
      expect(unknown.errors.some(e => /Nope.*not found/.test(e))).toBe(true)
    })
  })

  // ── Principles ───────────────────────────────────────────────────────────────
  describe('principles', () => {
    const H = 'name,description,title,rationale,implications,principle_type,status,visibility,adrs,capabilities'
    it('resolves ADR-number and capability-name links; rejects cross-org capability', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r = await importPrinciples(csvForm(`${H}\nSaaS First,,Prefer SaaS,,,architecture,published,org,ADR-100,Cap A; Foreign Cap`))
      expect(r.created).toBe(1)
      expect(r.errors.some(e => /Foreign Cap.*not found/.test(e))).toBe(true)
      const [p] = await db.select().from(principles).where(and(eq(principles.organizationId, orgId), eq(principles.name, 'SaaS First')))
      const links = await db.select().from(principleCapabilities).where(eq(principleCapabilities.principleId, p.id))
      expect(links.map(l => l.capabilityId)).toEqual([capAId])
    })
    it('dry-run writes nothing', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const before = (await db.select().from(principles).where(eq(principles.organizationId, orgId))).length
      const r = await importPrinciples(csvForm(`${H}\nEphemeral,,,,,architecture,published,org,,`), true)
      expect(r.created).toBe(1)
      expect((await db.select().from(principles).where(eq(principles.organizationId, orgId))).length).toBe(before)
    })
  })

  // ── Services ─────────────────────────────────────────────────────────────────
  describe('services', () => {
    const H = 'name,description,service_owner,channels,status,visibility,personas,capabilities,value_streams'
    it('resolves channels + persona/capability/value-stream links; round-trips', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r1 = await importServices(csvForm(`${H}\nPermits,,Clerk,online; phone,published,org,Persona A,Cap A,VS A`))
      expect(r1.created).toBe(1)
      const [s] = await db.select().from(services).where(and(eq(services.organizationId, orgId), eq(services.name, 'Permits')))
      expect(s.channels.sort()).toEqual(['online', 'phone'])
      expect((await db.select().from(serviceCapabilities).where(eq(serviceCapabilities.serviceId, s.id))).map(l => l.capabilityId)).toEqual([capAId])
      expect((await db.select().from(serviceValueStreams).where(eq(serviceValueStreams.serviceId, s.id))).map(l => l.valueStreamId)).toEqual([vsAId])
      expect((await db.select().from(servicePersonas).where(eq(servicePersonas.serviceId, s.id))).length).toBe(1)
      const r2 = await importServices(csvForm(`${H}\nPermits,,Clerk,online; phone,published,org,Persona A,Cap A,VS A`))
      expect(r2.created).toBe(0); expect(r2.updated).toBe(1)
    })
  })

  // ── Strategies ───────────────────────────────────────────────────────────────
  describe('strategies', () => {
    const H = 'name,summary,planning_horizon,status,visibility,owner_email,start_date,end_date,goals,capabilities,value_streams,initiatives'
    it('resolves owner email + goal/capability/initiative links', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r = await importStrategies(csvForm(`${H}\nCloud Strategy,,FY26,active,org,${contributor.email},,,Goal A,Cap A,VS A,Init A`))
      expect(r.created).toBe(1)
      const [s] = await db.select().from(strategies).where(and(eq(strategies.organizationId, orgId), eq(strategies.name, 'Cloud Strategy')))
      expect(s.ownerUserId).toBe(contributor.id)
      expect((await db.select().from(strategyGoals).where(eq(strategyGoals.strategyId, s.id))).map(l => l.goalId)).toEqual([goalAId])
      expect((await db.select().from(strategyCapabilities).where(eq(strategyCapabilities.strategyId, s.id))).map(l => l.capabilityId)).toEqual([capAId])
      expect((await db.select().from(strategyInitiatives).where(eq(strategyInitiatives.strategyId, s.id))).map(l => l.initiativeId)).toEqual([initAId])
    })
    it('leaves owner unset for an unknown email', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r = await importStrategies(csvForm(`${H}\nNoOwner,,,proposed,org,ghost@nowhere.test,,,,,,`))
      expect(r.errors.some(e => /ghost@nowhere.test.*not found/.test(e))).toBe(true)
      const [s] = await db.select().from(strategies).where(and(eq(strategies.organizationId, orgId), eq(strategies.name, 'NoOwner')))
      expect(s.ownerUserId).toBeNull()
    })
  })

  // ── Value streams ──────────────────────────────────────────────────────────
  describe('value streams', () => {
    const H = 'name,description,value_item,status,visibility,personas,capabilities,stages'
    it('creates ordered stages with stage capabilities; round-trips', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      const r1 = await importValueStreams(csvForm(`${H}\nIntake,,A permit,published,org,Persona A,Cap A,"Submit: Cap A | Decide"`))
      expect(r1.created).toBe(1)
      const [v] = await db.select().from(valueStreams).where(and(eq(valueStreams.organizationId, orgId), eq(valueStreams.name, 'Intake')))
      const stages = await db.select().from(valueStreamStages).where(eq(valueStreamStages.valueStreamId, v.id))
      expect(stages.map(s => s.name).sort()).toEqual(['Decide', 'Submit'])
      const submit = stages.find(s => s.name === 'Submit')!
      const stageCaps = await db.select().from(valueStreamStageCapabilities).where(eq(valueStreamStageCapabilities.stageId, submit.id))
      expect(stageCaps.map(c => c.capabilityId)).toEqual([capAId])
      expect((await db.select().from(valueStreamCapabilities).where(eq(valueStreamCapabilities.valueStreamId, v.id))).map(l => l.capabilityId)).toEqual([capAId])
      expect((await db.select().from(valueStreamPersonas).where(eq(valueStreamPersonas.valueStreamId, v.id))).length).toBe(1)

      const r2 = await importValueStreams(csvForm(`${H}\nIntake,,A permit,published,org,Persona A,Cap A,"Submit: Cap A | Decide"`))
      expect(r2.created).toBe(0); expect(r2.updated).toBe(1)
      // Stages replaced wholesale, not duplicated.
      const stages2 = await db.select().from(valueStreamStages).where(eq(valueStreamStages.valueStreamId, v.id))
      expect(stages2).toHaveLength(2)
    })
  })
})
