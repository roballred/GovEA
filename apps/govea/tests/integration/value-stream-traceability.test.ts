/**
 * Integration tests: value streams as first-class trace participants (#809)
 *
 * Covers:
 *  - getValueStreamTrace builds the value-stream root: stakeholders, upstream
 *    objectives/services, ordered stages with stage-level capabilities (stage
 *    context preserved, not flattened), and applications reached through those
 *    capabilities.
 *  - Viewer traversal respects status: a non-published value stream is not a
 *    viewer-visible root; draft capabilities are pruned from stages for viewers.
 *  - Objective / capability / service traces surface the related value streams.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getValueStreamTrace, getObjectiveTrace, getCapabilityTrace, getServiceTrace } from '@/actions/traceability'
import { db } from '@/db/client'
import {
  valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamCapabilities,
  valueStreamPersonas, objectiveValueStreams, serviceValueStreams,
  capabilities, applications, applicationCapabilities, personas, strategicObjectives, services,
} from '@/db/schema'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('value stream traceability (#809)', () => {
  let orgId: string
  let admin: TestUser
  let viewer: TestUser
  let vsId: string
  let draftVsId: string
  let stage1Id: string
  let stage2Id: string
  let capAId: string
  let capBId: string
  let capDraftId: string
  let appId: string
  let personaId: string
  let objectiveId: string
  let serviceId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'viewer'),
    ])

    const [vs] = await db.insert(valueStreams).values({
      organizationId: orgId, name: 'Permit Issuance', valueItem: 'An issued permit', status: 'published', visibility: 'org',
    }).returning()
    vsId = vs.id
    const [draftVs] = await db.insert(valueStreams).values({
      organizationId: orgId, name: 'Draft Stream', status: 'draft', visibility: 'org',
    }).returning()
    draftVsId = draftVs.id

    const [capA, capB, capDraft] = await db.insert(capabilities).values([
      { organizationId: orgId, name: 'Intake Capability', status: 'published', visibility: 'org' },
      { organizationId: orgId, name: 'Review Capability', status: 'published', visibility: 'org' },
      { organizationId: orgId, name: 'Draft Capability', status: 'draft', visibility: 'org' },
    ]).returning()
    capAId = capA.id; capBId = capB.id; capDraftId = capDraft.id

    const [app] = await db.insert(applications).values({
      organizationId: orgId, name: 'Permit Portal', status: 'published', visibility: 'org', lifecycleStatus: 'active',
    }).returning()
    appId = app.id
    await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capAId })

    // Two ordered stages: stage 1 → {Intake, Draft}, stage 2 → {Review}.
    const [s1, s2] = await db.insert(valueStreamStages).values([
      { valueStreamId: vsId, name: 'Submit', order: 0 },
      { valueStreamId: vsId, name: 'Decide', order: 1 },
    ]).returning()
    stage1Id = s1.id; stage2Id = s2.id
    await db.insert(valueStreamStageCapabilities).values([
      { stageId: stage1Id, capabilityId: capAId },
      { stageId: stage1Id, capabilityId: capDraftId },
      { stageId: stage2Id, capabilityId: capBId },
    ])
    // Stream-level direct capability link too.
    await db.insert(valueStreamCapabilities).values({ valueStreamId: vsId, capabilityId: capAId })

    const [persona] = await db.insert(personas).values({
      organizationId: orgId, name: 'Permit Applicant', status: 'published', visibility: 'org',
    }).returning()
    personaId = persona.id
    await db.insert(valueStreamPersonas).values({ valueStreamId: vsId, personaId })

    const [objective] = await db.insert(strategicObjectives).values({
      organizationId: orgId, name: 'Faster Permitting', status: 'published', visibility: 'org',
    }).returning()
    objectiveId = objective.id
    await db.insert(objectiveValueStreams).values({ objectiveId, valueStreamId: vsId })

    const [service] = await db.insert(services).values({
      organizationId: orgId, name: 'Online Permit Service', status: 'published', visibility: 'org',
    }).returning()
    serviceId = service.id
    await db.insert(serviceValueStreams).values({ serviceId, valueStreamId: vsId })
  })

  afterAll(() => cleanupOrg(orgId))

  it('builds the value-stream root with ordered stages and stage-level capabilities', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const trace = await getValueStreamTrace(vsId)

    expect(trace).not.toBeNull()
    expect(trace!.kind).toBe('value-stream')
    expect(trace!.name).toBe('Permit Issuance')

    // Stage order preserved, not flattened.
    expect(trace!.stages.map(s => s.id)).toEqual([stage1Id, stage2Id])
    expect(trace!.stages[0].capabilities.map(c => c.id).sort()).toEqual([capAId, capDraftId].sort())
    expect(trace!.stages[1].capabilities.map(c => c.id)).toEqual([capBId])

    // Apps reached through stage capabilities.
    expect(trace!.applications.map(a => a.id)).toContain(appId)

    // Upstream/lateral context.
    expect(trace!.personas.map(p => p.id)).toContain(personaId)
    expect(trace!.objectives.map(o => o.id)).toContain(objectiveId)
    expect(trace!.services.map(s => s.id)).toContain(serviceId)
  })

  it('prunes draft stage capabilities for viewers but keeps published ones', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const trace = await getValueStreamTrace(vsId)
    expect(trace).not.toBeNull()
    const stage1 = trace!.stages.find(s => s.id === stage1Id)!
    expect(stage1.capabilities.map(c => c.id)).toContain(capAId)
    expect(stage1.capabilities.map(c => c.id)).not.toContain(capDraftId)
  })

  it('a non-published value stream is not a viewer-visible root', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    expect(await getValueStreamTrace(draftVsId)).toBeNull()
    mockAuth.mockResolvedValue(makeSession(admin))
    expect(await getValueStreamTrace(draftVsId)).not.toBeNull()
  })

  it('surfaces the value stream in objective, capability, and service traces', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const [objTrace, capTrace, svcTrace] = await Promise.all([
      getObjectiveTrace(objectiveId),
      getCapabilityTrace(capAId),
      getServiceTrace(serviceId),
    ])
    expect(objTrace!.valueStreams.map(v => v.id)).toContain(vsId)
    expect(capTrace!.valueStreams.map(v => v.id)).toContain(vsId)
    expect(svcTrace!.valueStreams.map(v => v.id)).toContain(vsId)
  })
})
