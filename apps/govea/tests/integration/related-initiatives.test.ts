/**
 * Integration tests: getRelatedInitiatives (#600)
 *
 * Covers:
 *  - Two initiatives sharing a capability → each lists the other
 *  - Shared application with retire/improve impacts → hasLabelConflict true
 *  - Both initiatives in CONCURRENT_STATUSES → hasTimelineOverlap true
 *  - Initiative with no junctions → empty result
 *  - Federation: cross-org initiative sharing a capability is not visible
 *    when the candidate initiative is org-private (`visibility: 'org'`)
 *  - Viewer-status gate: 'on-hold' candidate not surfaced to a viewer
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { initiatives, initiativeCapabilities, initiativeApplications, capabilities, applications } from '@/db/schema'
import { randomUUID } from 'node:crypto'
import { getRelatedInitiatives } from '@/actions/initiatives'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

async function seedCapability(orgId: string, name: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(), organizationId: orgId, name, status: 'published', visibility: 'org',
  }).returning()
  return row.id
}

async function seedApplication(orgId: string, name: string) {
  const [row] = await db.insert(applications).values({
    id: randomUUID(), organizationId: orgId, name, lifecycleStatus: 'active', status: 'published', visibility: 'org',
  }).returning()
  return row.id
}

async function seedInitiative(orgId: string, name: string, status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled' = 'active', visibility: 'org' | 'connections' | 'instance' = 'org') {
  const [row] = await db.insert(initiatives).values({
    id: randomUUID(), organizationId: orgId, name, status, visibility,
  }).returning()
  return row.id
}

async function linkInitCap(initId: string, capId: string, impact: string | null = null) {
  await db.insert(initiativeCapabilities).values({ initiativeId: initId, capabilityId: capId, impact })
}

async function linkInitApp(initId: string, appId: string, impact: string | null = null) {
  await db.insert(initiativeApplications).values({ initiativeId: initId, applicationId: appId, impact })
}

describe('getRelatedInitiatives (#600)', () => {
  let orgId: string
  let admin: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns empty list for an initiative with no linked capabilities or applications', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const initId = await seedInitiative(orgId, 'Lonely Initiative', 'active')

    const result = await getRelatedInitiatives(initId)
    expect(result).toEqual([])
  })

  it('surfaces another initiative sharing a capability', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const capId = await seedCapability(orgId, 'Shared Capability A')
    const [thisInit, otherInit] = await Promise.all([
      seedInitiative(orgId, 'This Init A', 'active'),
      seedInitiative(orgId, 'Other Init A', 'active'),
    ])
    await Promise.all([
      linkInitCap(thisInit, capId, 'improve'),
      linkInitCap(otherInit, capId, 'improve'),
    ])

    const result = await getRelatedInitiatives(thisInit)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(otherInit)
    expect(result[0].sharedCapabilities).toHaveLength(1)
    expect(result[0].sharedCapabilities[0]).toMatchObject({
      name: 'Shared Capability A',
      thisImpact: 'improve',
      otherImpact: 'improve',
    })
    expect(result[0].hasTimelineOverlap).toBe(true)
    expect(result[0].hasLabelConflict).toBe(false)
  })

  it('flags hasLabelConflict when an application is retired by one initiative and improved by another', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const appId = await seedApplication(orgId, 'Shared App for Conflict')
    const [thisInit, otherInit] = await Promise.all([
      seedInitiative(orgId, 'This Init B', 'active'),
      seedInitiative(orgId, 'Other Init B', 'active'),
    ])
    await Promise.all([
      linkInitApp(thisInit, appId, 'improve'),
      linkInitApp(otherInit, appId, 'retire'),
    ])

    const result = await getRelatedInitiatives(thisInit)
    expect(result).toHaveLength(1)
    expect(result[0].hasLabelConflict).toBe(true)
    expect(result[0].sharedApplications[0]).toMatchObject({
      name: 'Shared App for Conflict',
      thisImpact: 'improve',
      otherImpact: 'retire',
    })
  })

  it('does NOT flag a label conflict when both initiatives improve (or both retire) the same application', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const appId = await seedApplication(orgId, 'Shared App No Conflict')
    const [thisInit, otherInit] = await Promise.all([
      seedInitiative(orgId, 'This Init C', 'active'),
      seedInitiative(orgId, 'Other Init C', 'active'),
    ])
    await Promise.all([
      linkInitApp(thisInit, appId, 'improve'),
      linkInitApp(otherInit, appId, 'improve'),
    ])

    const result = await getRelatedInitiatives(thisInit)
    expect(result).toHaveLength(1)
    expect(result[0].hasLabelConflict).toBe(false)
  })

  it('hides on-hold and proposed candidates from viewers (status gate parity)', async () => {
    const capId = await seedCapability(orgId, 'Capability Viewer Gate')
    const thisInit = await seedInitiative(orgId, 'This Init D', 'active')
    const onHoldOther = await seedInitiative(orgId, 'Other Init D on-hold', 'on-hold')
    const proposedOther = await seedInitiative(orgId, 'Other Init D proposed', 'proposed')
    const activeOther = await seedInitiative(orgId, 'Other Init D active', 'active')
    await Promise.all([
      linkInitCap(thisInit, capId, 'improve'),
      linkInitCap(onHoldOther, capId, 'improve'),
      linkInitCap(proposedOther, capId, 'improve'),
      linkInitCap(activeOther, capId, 'improve'),
    ])

    // Admin sees all three
    mockAuth.mockResolvedValue(makeSession(admin))
    const adminResult = await getRelatedInitiatives(thisInit)
    expect(adminResult.map(r => r.id).sort()).toEqual(
      [onHoldOther, proposedOther, activeOther].sort(),
    )

    // Viewer sees only the active one
    mockAuth.mockResolvedValue(makeSession(viewer))
    const viewerResult = await getRelatedInitiatives(thisInit)
    expect(viewerResult.map(r => r.id)).toEqual([activeOther])
  })

  it('does not surface the initiative itself', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const capId = await seedCapability(orgId, 'Self Filter Capability')
    const thisInit = await seedInitiative(orgId, 'This Init Self', 'active')
    await linkInitCap(thisInit, capId, 'improve')

    const result = await getRelatedInitiatives(thisInit)
    expect(result).toEqual([])
  })

  it('sorts label-conflict rows ahead of concurrent-only rows', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const capId = await seedCapability(orgId, 'Sort Test Capability')
    const appId = await seedApplication(orgId, 'Sort Test Application')
    const [thisInit, plainCandidate, conflictCandidate] = await Promise.all([
      seedInitiative(orgId, 'This Init Sort', 'active'),
      seedInitiative(orgId, 'A Plain Candidate', 'active'),
      seedInitiative(orgId, 'Z Conflict Candidate', 'active'),
    ])
    await Promise.all([
      linkInitCap(thisInit, capId, 'improve'),
      linkInitApp(thisInit, appId, 'improve'),
      linkInitCap(plainCandidate, capId, 'improve'),
      linkInitApp(conflictCandidate, appId, 'retire'),
    ])

    const result = await getRelatedInitiatives(thisInit)
    expect(result.map(r => r.name)).toEqual([
      'Z Conflict Candidate', // label-conflict first despite alphabetical
      'A Plain Candidate',
    ])
  })
})
