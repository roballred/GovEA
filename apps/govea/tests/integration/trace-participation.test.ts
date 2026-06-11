/**
 * Integration tests for trace participation (#695).
 *
 * getTraceParticipation powers /traceability?from=<participant>&id=<id> for
 * entities that appear in trace chains without being trace roots. Pins:
 *  - one-hop root connections per participant kind
 *  - record-level federation gate (org-private subjects in other orgs → null)
 *  - viewer rules: connected roots are published-only for viewers
 *  - empty participation (record exists, no connections) still resolves
 */

import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  applications, capabilities, services, personas, strategicObjectives, initiatives,
  applicationCapabilities, capabilityPersonas, servicePersonas, initiativeObjectives,
} from '@/db/schema'
import { randomUUID } from 'node:crypto'
import { createTestOrg, createTestUser, cleanupOrg, makeSession } from './helpers/db'
import type { TestUser } from './helpers/db'
import { getTraceParticipation } from '@/actions/traceability'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('getTraceParticipation (#695)', () => {
  let orgId: string
  let otherOrgId: string
  let admin: TestUser
  let viewer: TestUser

  const appId = randomUUID()
  const capPublishedId = randomUUID()
  const capDraftId = randomUUID()
  const personaId = randomUUID()
  const serviceId = randomUUID()
  const initiativeId = randomUUID()
  const objectiveId = randomUUID()
  const lonelyAppId = randomUUID()
  const foreignAppId = randomUUID()

  beforeAll(async () => {
    const [org, other] = await Promise.all([createTestOrg(), createTestOrg()])
    orgId = org.id
    otherOrgId = other.id
    admin = await createTestUser(orgId, 'admin')
    viewer = await createTestUser(orgId, 'viewer')

    await db.insert(capabilities).values([
      { id: capPublishedId, organizationId: orgId, name: 'Permitting', status: 'published', visibility: 'org' },
      { id: capDraftId, organizationId: orgId, name: 'Draft Capability', status: 'draft', visibility: 'org' },
    ])
    await db.insert(applications).values([
      { id: appId, organizationId: orgId, name: 'Permit Portal', status: 'published', visibility: 'org' },
      { id: lonelyAppId, organizationId: orgId, name: 'Unlinked App', status: 'published', visibility: 'org' },
      // org-private subject in a different org
      { id: foreignAppId, organizationId: otherOrgId, name: 'Foreign App', status: 'published', visibility: 'org' },
    ])
    await db.insert(services).values({
      id: serviceId, organizationId: orgId, name: 'Apply for a Permit', status: 'published', visibility: 'org',
    })
    await db.insert(personas).values({
      id: personaId, organizationId: orgId, name: 'Permit Applicant', status: 'published', visibility: 'org',
    })
    await db.insert(strategicObjectives).values({
      id: objectiveId, organizationId: orgId, name: 'Digital Permitting', status: 'published', visibility: 'org',
    })
    await db.insert(initiatives).values({
      id: initiativeId, organizationId: orgId, name: 'Permit Modernization', status: 'proposed', visibility: 'org',
    })

    await db.insert(applicationCapabilities).values([
      { applicationId: appId, capabilityId: capPublishedId },
      { applicationId: appId, capabilityId: capDraftId },
    ])
    await db.insert(capabilityPersonas).values({ capabilityId: capPublishedId, personaId })
    await db.insert(servicePersonas).values({ serviceId, personaId })
    await db.insert(initiativeObjectives).values({ initiativeId, objectiveId })
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  it('application: returns its connected capabilities for an admin (drafts included)', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const p = await getTraceParticipation('application', appId)
    expect(p).not.toBeNull()
    expect(p!.name).toBe('Permit Portal')
    expect(p!.connections.capabilities.map(c => c.id).sort())
      .toEqual([capPublishedId, capDraftId].sort())
    expect(p!.connections.objectives).toEqual([])
    expect(p!.connections.services).toEqual([])
  })

  it('viewer sees published connected roots only', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const p = await getTraceParticipation('application', appId)
    expect(p).not.toBeNull()
    expect(p!.connections.capabilities.map(c => c.id)).toEqual([capPublishedId])
  })

  it('persona: connects to capabilities and services', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const p = await getTraceParticipation('persona', personaId)
    expect(p!.connections.capabilities.map(c => c.id)).toEqual([capPublishedId])
    expect(p!.connections.services.map(s => s.id)).toEqual([serviceId])
  })

  it('initiative: connects to objectives', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const p = await getTraceParticipation('initiative', initiativeId)
    expect(p!.connections.objectives.map(o => o.id)).toEqual([objectiveId])
  })

  it('a record with no connections still resolves (empty-state participation)', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const p = await getTraceParticipation('application', lonelyAppId)
    expect(p).not.toBeNull()
    expect(p!.connections.capabilities).toEqual([])
    expect(p!.connections.objectives).toEqual([])
    expect(p!.connections.services).toEqual([])
  })

  it('org-private subjects in other orgs are not resolvable (federation gate)', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    expect(await getTraceParticipation('application', foreignAppId)).toBeNull()
  })

  it('unknown ids resolve to null', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    expect(await getTraceParticipation('application', randomUUID())).toBeNull()
  })
})
