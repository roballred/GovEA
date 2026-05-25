/**
 * Integration tests: getCapabilityAdoption (#537) +
 *                    findDuplicateCapabilityCandidates (#538)
 *
 * Both run against the real DB so federation visibility behaviour is
 * exercised (instance-wide vs connections-only vs org-only, plus the
 * cross-org connection requirement).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  capabilities, crossOrgLinks, orgConnections,
} from '@/db/schema'
import { randomUUID } from 'node:crypto'
import {
  getCapabilityAdoption,
  findDuplicateCapabilityCandidates,
} from '@/lib/enterprise-view'
import { createTestOrg, cleanupOrg } from './helpers/db'

// All tests in this file share a Postgres instance with other integration
// suites. `instance`-visibility capabilities are globally visible by
// federation rule, so any seeded name could collide with another suite's
// data and produce flaky pair matches. Prefix every seeded name with a
// per-run high-entropy token so cross-suite tokens never overlap.
const RUN_PREFIX = `t${randomUUID().slice(0, 8)}`
const n = (s: string) => `${RUN_PREFIX} ${s}`

let stateOrgId: string
let cityAOrgId: string
let cityBOrgId: string

beforeAll(async () => {
  ;[stateOrgId, cityAOrgId, cityBOrgId] = await Promise.all([
    createTestOrg().then(o => o.id),
    createTestOrg().then(o => o.id),
    createTestOrg().then(o => o.id),
  ])
  // State <-> CityA and State <-> CityB connections, both active. CityA <-> CityB intentionally absent.
  await db.insert(orgConnections).values([
    { fromOrgId: stateOrgId, toOrgId: cityAOrgId, status: 'active' },
    { fromOrgId: cityAOrgId, toOrgId: stateOrgId, status: 'active' },
    { fromOrgId: stateOrgId, toOrgId: cityBOrgId, status: 'active' },
    { fromOrgId: cityBOrgId, toOrgId: stateOrgId, status: 'active' },
  ])
})

afterAll(async () => {
  await Promise.all([
    cleanupOrg(stateOrgId),
    cleanupOrg(cityAOrgId),
    cleanupOrg(cityBOrgId),
  ])
})

async function seedCap(orgId: string, name: string, visibility: 'org' | 'connections' | 'instance' = 'instance', domain?: string) {
  const [row] = await db.insert(capabilities).values({
    id: randomUUID(),
    organizationId: orgId,
    name,
    visibility,
    domain: domain ?? null,
  }).returning()
  return row
}

async function seedLink(sourceOrgId: string, sourceCapId: string, targetOrgId: string, targetCapId: string, linkType: 'implements' | 'extends' | 'maps_to', status: 'pending' | 'active' | 'rejected' = 'pending') {
  const [row] = await db.insert(crossOrgLinks).values({
    sourceOrgId,
    sourceEntityType: 'capability',
    sourceEntityId: sourceCapId,
    targetOrgId,
    targetEntityType: 'capability',
    targetEntityId: targetCapId,
    linkType,
    status,
  }).returning()
  return row
}

describe('getCapabilityAdoption (#537)', () => {
  it('returns zero totals when the org publishes no instance-visibility capabilities', async () => {
    const isolated = await createTestOrg()
    const report = await getCapabilityAdoption(isolated.id)
    expect(report.publishedCount).toBe(0)
    expect(report.adoptedCount).toBe(0)
    expect(report.pendingApprovalCount).toBe(0)
    expect(report.agencyCount).toBe(0)
    expect(report.capabilities).toEqual([])
    await cleanupOrg(isolated.id)
  })

  it('counts only instance-visibility capabilities as published', async () => {
    const orgId = (await createTestOrg()).id
    await seedCap(orgId, n('Instance Cap'), 'instance')
    await seedCap(orgId, n('Connections Cap'), 'connections')
    await seedCap(orgId, n('Org Only Cap'), 'org')

    const report = await getCapabilityAdoption(orgId)
    expect(report.publishedCount).toBe(1)
    expect(report.capabilities.map(c => c.name)).toEqual([n('Instance Cap')])
    await cleanupOrg(orgId)
  })

  it('aggregates inbound links across multiple agencies and statuses', async () => {
    const stateCap1 = await seedCap(stateOrgId, n('Statewide Identity'))
    const stateCap2 = await seedCap(stateOrgId, n('Open Data Feed'))
    const stateCap3 = await seedCap(stateOrgId, n('Lonely Cap'))  // no inbound

    const cityACap1 = await seedCap(cityAOrgId, n('City A Auth'), 'connections')
    const cityACap2 = await seedCap(cityAOrgId, n('City A Data'), 'connections')
    const cityBCap1 = await seedCap(cityBOrgId, n('City B Auth'), 'connections')

    // City A links into both state caps; City B links into one
    await seedLink(cityAOrgId, cityACap1.id, stateOrgId, stateCap1.id, 'implements', 'active')
    await seedLink(cityAOrgId, cityACap2.id, stateOrgId, stateCap2.id, 'extends', 'pending')
    await seedLink(cityBOrgId, cityBCap1.id, stateOrgId, stateCap1.id, 'implements', 'pending')

    const report = await getCapabilityAdoption(stateOrgId)
    expect(report.publishedCount).toBe(3)
    expect(report.adoptedCount).toBe(2)        // cap1 + cap2; cap3 has none
    expect(report.pendingApprovalCount).toBe(2) // one cap1 + one cap2
    expect(report.agencyCount).toBe(2)          // CityA + CityB

    const cap1Row = report.capabilities.find(c => c.id === stateCap1.id)!
    expect(cap1Row.links).toHaveLength(2)

    const cap3Row = report.capabilities.find(c => c.id === stateCap3.id)!
    expect(cap3Row.links).toEqual([])
  })

  it('excludes outbound links (where this org is the SOURCE, not target)', async () => {
    const stateOnlyOrg = (await createTestOrg()).id
    const peerOrg = (await createTestOrg()).id
    await db.insert(orgConnections).values([
      { fromOrgId: stateOnlyOrg, toOrgId: peerOrg, status: 'active' },
      { fromOrgId: peerOrg, toOrgId: stateOnlyOrg, status: 'active' },
    ])

    const myCap = await seedCap(stateOnlyOrg, n('My Cap'), 'instance')
    const peerCap = await seedCap(peerOrg, n('Peer Cap'), 'instance')

    // I link OUT to peer. This should NOT count as adoption of my capability.
    await seedLink(stateOnlyOrg, myCap.id, peerOrg, peerCap.id, 'implements', 'active')

    const report = await getCapabilityAdoption(stateOnlyOrg)
    expect(report.publishedCount).toBe(1)
    expect(report.adoptedCount).toBe(0)
    expect(report.capabilities[0].links).toEqual([])

    await cleanupOrg(stateOnlyOrg)
    await cleanupOrg(peerOrg)
  })
})

// Filter candidates to those that involve a name we control via RUN_PREFIX,
// so cross-suite `instance`-vis caps in the shared DB can't make assertions
// flaky. Pure tests for the heuristic itself live in
// tests/unit/enterprise-view-heuristic.test.ts.
const myPair = (c: { a: { name: string }, b: { name: string } }) =>
  c.a.name.startsWith(RUN_PREFIX) && c.b.name.startsWith(RUN_PREFIX)

describe('findDuplicateCapabilityCandidates (#538)', () => {
  it('produces no candidates for an isolated org with no peers and zero caps', async () => {
    const isolated = (await createTestOrg()).id
    const candidates = await findDuplicateCapabilityCandidates(isolated)
    expect(candidates.filter(myPair)).toEqual([])
    await cleanupOrg(isolated)
  })

  it('flags name-overlap pairs within the same domain across orgs', async () => {
    const orgA = (await createTestOrg()).id
    const orgB = (await createTestOrg()).id
    await db.insert(orgConnections).values([
      { fromOrgId: orgA, toOrgId: orgB, status: 'active' },
      { fromOrgId: orgB, toOrgId: orgA, status: 'active' },
    ])
    await seedCap(orgA, n('Online Permitting'),  'instance', n('Permitting & Licensing'))
    await seedCap(orgB, n('Permitting & Licensing System'),  'instance', n('Permitting & Licensing'))

    const candidates = await findDuplicateCapabilityCandidates(orgA)
    const minePairs = candidates.filter(myPair)
    expect(minePairs.length).toBeGreaterThanOrEqual(1)
    const pair = minePairs.find(c =>
      (c.a.name === n('Online Permitting') || c.b.name === n('Online Permitting')) &&
      (c.a.name === n('Permitting & Licensing System') || c.b.name === n('Permitting & Licensing System'))
    )
    expect(pair).toBeDefined()
    expect(pair!.similarity).toBeGreaterThan(0)

    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('does NOT flag pairs in different domains', async () => {
    const orgA = (await createTestOrg()).id
    const orgB = (await createTestOrg()).id
    await db.insert(orgConnections).values([
      { fromOrgId: orgA, toOrgId: orgB, status: 'active' },
      { fromOrgId: orgB, toOrgId: orgA, status: 'active' },
    ])
    await seedCap(orgA, n('Identity Verification A'), 'instance', n('Information Technology'))
    await seedCap(orgB, n('Identity Verification B'), 'instance', n('Public Safety'))

    const candidates = await findDuplicateCapabilityCandidates(orgA)
    const minePairs = candidates.filter(myPair)
    const found = minePairs.find(c =>
      c.a.name.includes('Identity Verification') && c.b.name.includes('Identity Verification')
    )
    expect(found).toBeUndefined()

    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('does NOT flag intra-org pairs (same org should never appear)', async () => {
    const orgA = (await createTestOrg()).id
    await seedCap(orgA, n('Permitting Online'),  'instance', n('Permitting'))
    await seedCap(orgA, n('Online Permitting'),  'instance', n('Permitting'))

    const candidates = await findDuplicateCapabilityCandidates(orgA)
    for (const c of candidates.filter(myPair)) {
      expect(c.a.orgId).not.toBe(c.b.orgId)
    }
    await cleanupOrg(orgA)
  })

  it('respects federation visibility — never surfaces capabilities the caller cannot read', async () => {
    const orgA = (await createTestOrg()).id
    const orgB = (await createTestOrg()).id
    // NO connection between orgA and orgB. orgB has an `org`-only capability.
    await seedCap(orgA, n('Permit Issuance'), 'instance', n('Permitting'))
    await seedCap(orgB, n('Permit Management'), 'org',    n('Permitting'))

    const candidates = await findDuplicateCapabilityCandidates(orgA)
    // orgB's org-visibility capability is not readable from orgA — should not appear.
    const found = candidates.find(c =>
      c.a.name === n('Permit Management') || c.b.name === n('Permit Management')
    )
    expect(found).toBeUndefined()

    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('returns candidates sorted by similarity descending', async () => {
    const orgA = (await createTestOrg()).id
    const orgB = (await createTestOrg()).id
    await db.insert(orgConnections).values([
      { fromOrgId: orgA, toOrgId: orgB, status: 'active' },
      { fromOrgId: orgB, toOrgId: orgA, status: 'active' },
    ])

    // High-similarity pair (2/3 shared)
    await seedCap(orgA, n('Permit Issuance'), 'instance', n('Permitting & Licensing'))
    await seedCap(orgB, n('Permit Issuance Hub'), 'instance', n('Permitting & Licensing'))

    // Lower-similarity pair (1/3 shared)
    await seedCap(orgA, n('Building Inspection'), 'instance', n('Permitting & Licensing'))
    await seedCap(orgB, n('Building Permits Online'), 'instance', n('Permitting & Licensing'))

    const candidates = await findDuplicateCapabilityCandidates(orgA)
    const sorted = candidates.filter(myPair)
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].similarity).toBeGreaterThanOrEqual(sorted[i + 1].similarity)
    }
    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })
})
