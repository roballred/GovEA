/**
 * Data Architecture graph fetcher (#363 PR-3).
 *
 * Asserts the contract for getDataArchitectureGraph:
 *   1. Returns all four object types + the four edge kinds.
 *   2. Viewer role sees only published nodes.
 *   3. Org-scoped — does not leak across orgs.
 *   4. Filters reduce visible nodes; orphan edges are dropped.
 *   5. Symmetric edges (is-related, shares) are returned once per pair.
 *   6. Instantiates edge is derived from the structural FK, not a junction.
 *
 * Capability: da-chen-visualization
 * Persona: Enterprise Data Architect, Data Modeler
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  dataEntities, dataAttributes, dataBusinessKeys,
  dataEntityAttributeLinks, dataEntityRelations, dataAttributeShares,
  dataEntityOwners, dataAttributeOwners,
  personas,
} from '@/db/schema'
import { getDataArchitectureGraph } from '@/lib/data-architecture-graph'
import {
  createTestOrg, createTestUser, cleanupOrg,
  type TestOrg,
} from './helpers/db'

// auth is unused in this test (the fetcher takes orgId + role directly) but
// vitest sometimes complains about the action module's auth import in CI;
// mock it defensively.
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let personaA1: string
let personaA2: string

// Helpers — inserts directly via the db client so we don't pull the auth-gated
// server actions into the test. The graph fetcher just reads what's there.
async function insertEntity(orgId: string, name: string, status: 'draft' | 'published' = 'published', ownerIds: string[] = []) {
  const [row] = await db.insert(dataEntities).values({
    id: randomUUID(), organizationId: orgId, name, status, visibility: 'org',
  }).returning()
  for (const personaId of ownerIds) {
    await db.insert(dataEntityOwners).values({ dataEntityId: row.id, personaId })
  }
  return row.id
}

async function insertAttribute(orgId: string, name: string, status: 'draft' | 'published' = 'published', ownerIds: string[] = [], physicalAttributeType: 'effectivity' | 'multi-active' | 'record-tracking' | 'status-tracking' | null = null) {
  const [row] = await db.insert(dataAttributes).values({
    id: randomUUID(), organizationId: orgId, name, status, visibility: 'org', physicalAttributeType,
  }).returning()
  for (const personaId of ownerIds) {
    await db.insert(dataAttributeOwners).values({ dataAttributeId: row.id, personaId })
  }
  return row.id
}

async function insertBK(orgId: string, name: string, owningEntityId: string, status: 'draft' | 'published' = 'published') {
  const [row] = await db.insert(dataBusinessKeys).values({
    id: randomUUID(), organizationId: orgId, name, status, visibility: 'org', owningDataEntityId: owningEntityId,
  }).returning()
  return row.id
}

async function relateEntities(orgId: string, a: string, b: string) {
  const [left, right] = a < b ? [a, b] : [b, a]
  await db.insert(dataEntityRelations).values({
    organizationId: orgId, leftDataEntityId: left, rightDataEntityId: right,
  })
}

async function characterize(orgId: string, entityId: string, attributeId: string) {
  await db.insert(dataEntityAttributeLinks).values({
    organizationId: orgId, dataEntityId: entityId, dataAttributeId: attributeId,
  })
}

async function shareAttributes(orgId: string, a: string, b: string) {
  const [left, right] = a < b ? [a, b] : [b, a]
  await db.insert(dataAttributeShares).values({
    organizationId: orgId, leftDataAttributeId: left, rightDataAttributeId: right,
  })
}

beforeAll(async () => {
  orgA = await createTestOrg({ name: 'Graph Org A', slug: `graph-a-${randomUUID().slice(0, 8)}` })
  orgB = await createTestOrg({ name: 'Graph Org B', slug: `graph-b-${randomUUID().slice(0, 8)}` })
  await createTestUser(orgA.id, 'admin', { name: 'Graph Admin A' })

  const [pA1, pA2] = await Promise.all([
    db.insert(personas).values({
      id: randomUUID(), organizationId: orgA.id, name: 'Graph Architect',
      status: 'published', visibility: 'org',
    }).returning(),
    db.insert(personas).values({
      id: randomUUID(), organizationId: orgA.id, name: 'Graph Modeler',
      status: 'published', visibility: 'org',
    }).returning(),
  ])
  personaA1 = pA1[0].id
  personaA2 = pA2[0].id
})

afterAll(async () => {
  await Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)])
})

beforeEach(async () => {
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgA.id))
  await db.delete(dataAttributes).where(eq(dataAttributes.organizationId, orgA.id))
  await db.delete(dataBusinessKeys).where(eq(dataBusinessKeys.organizationId, orgA.id))
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgB.id))
})

// ── 1. Basic shape ──────────────────────────────────────────────────────────

describe('getDataArchitectureGraph', () => {
  it('returns empty graph when org has nothing', async () => {
    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(g.entities).toEqual([])
    expect(g.attributes).toEqual([])
    expect(g.businessKeys).toEqual([])
    expect(g.edges).toEqual([])
  })

  it('returns all four node types and the structural instantiates edge', async () => {
    const e1 = await insertEntity(orgA.id, 'Customer')
    const a1 = await insertAttribute(orgA.id, 'Address')
    await characterize(orgA.id, e1, a1)
    const bk = await insertBK(orgA.id, 'CustomerNumber', e1)

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(g.entities.map(e => e.name)).toEqual(['Customer'])
    expect(g.attributes.map(a => a.name)).toEqual(['Address'])
    expect(g.businessKeys.map(b => b.name)).toEqual(['CustomerNumber'])

    const edgeKinds = g.edges.map(e => e.kind).sort()
    expect(edgeKinds).toEqual(['characterized-by', 'instantiates'])

    const instEdge = g.edges.find(e => e.kind === 'instantiates')
    expect(instEdge?.sourceId).toBe(e1)
    expect(instEdge?.targetId).toBe(bk)
  })

  it('returns is-related edges between entity pairs', async () => {
    const e1 = await insertEntity(orgA.id, 'Customer')
    const e2 = await insertEntity(orgA.id, 'Order')
    await relateEntities(orgA.id, e1, e2)

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    const rel = g.edges.filter(e => e.kind === 'is-related')
    expect(rel).toHaveLength(1)
    // Symmetric: stored in canonical order. Just confirm both endpoints are present.
    expect([rel[0].sourceId, rel[0].targetId].sort()).toEqual([e1, e2].sort())
  })

  it('returns shares edges between attribute pairs', async () => {
    const a1 = await insertAttribute(orgA.id, 'AddressLine1')
    const a2 = await insertAttribute(orgA.id, 'PrimaryAddress')
    await shareAttributes(orgA.id, a1, a2)

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    const shares = g.edges.filter(e => e.kind === 'shares')
    expect(shares).toHaveLength(1)
    expect([shares[0].sourceId, shares[0].targetId].sort()).toEqual([a1, a2].sort())
  })
})

// ── 2. Role gating ──────────────────────────────────────────────────────────

describe('role gating', () => {
  it('viewer sees only published entities, attributes, and business keys', async () => {
    const ePub = await insertEntity(orgA.id, 'PublishedHub', 'published')
    await insertEntity(orgA.id, 'DraftHub', 'draft')
    const aPub = await insertAttribute(orgA.id, 'PublishedSat', 'published')
    await insertAttribute(orgA.id, 'DraftSat', 'draft')
    await insertBK(orgA.id, 'PublishedBK', ePub, 'published')
    await insertBK(orgA.id, 'DraftBK', ePub, 'draft')

    const viewerG = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'viewer' })
    expect(viewerG.entities.map(e => e.name).sort()).toEqual(['PublishedHub'])
    expect(viewerG.attributes.map(a => a.name).sort()).toEqual(['PublishedSat'])
    expect(viewerG.businessKeys.map(b => b.name).sort()).toEqual(['PublishedBK'])

    const adminG = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(adminG.entities).toHaveLength(2)
    expect(adminG.attributes).toHaveLength(2)
    expect(adminG.businessKeys).toHaveLength(2)
  })

  it('drops edges that reference a hidden node', async () => {
    const ePub = await insertEntity(orgA.id, 'PublishedHub', 'published')
    const aDraft = await insertAttribute(orgA.id, 'DraftSat', 'draft')
    await characterize(orgA.id, ePub, aDraft)

    const viewerG = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'viewer' })
    expect(viewerG.edges.filter(e => e.kind === 'characterized-by')).toHaveLength(0)
  })
})

// ── 3. Org scoping ──────────────────────────────────────────────────────────

describe('org scoping', () => {
  it('does not return another org\'s nodes', async () => {
    const aEntity = await insertEntity(orgA.id, 'A-Hub')
    await insertEntity(orgB.id, 'B-Hub')

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(g.entities.map(e => e.id)).toEqual([aEntity])
  })
})

// ── 4. Filters ──────────────────────────────────────────────────────────────

describe('filters', () => {
  it('owner filter restricts to nodes owned by one of the listed personas', async () => {
    await insertEntity(orgA.id, 'OwnedByArchitect', 'published', [personaA1])
    await insertEntity(orgA.id, 'OwnedByModeler', 'published', [personaA2])
    await insertEntity(orgA.id, 'Unowned', 'published')

    const g = await getDataArchitectureGraph({
      organizationId: orgA.id, role: 'admin',
      filters: { ownerPersonaIds: [personaA1] },
    })
    expect(g.entities.map(e => e.name)).toEqual(['OwnedByArchitect'])
  })

  it('nameSearch filter is case-insensitive contains-match', async () => {
    await insertEntity(orgA.id, 'CustomerAccount')
    await insertEntity(orgA.id, 'Vendor')

    const g = await getDataArchitectureGraph({
      organizationId: orgA.id, role: 'admin',
      filters: { nameSearch: 'cust' },
    })
    expect(g.entities.map(e => e.name)).toEqual(['CustomerAccount'])
  })

  it('physicalAttributeType filter restricts attributes to one type', async () => {
    await insertAttribute(orgA.id, 'EffectivityAttr', 'published', [], 'effectivity')
    await insertAttribute(orgA.id, 'StatusAttr', 'published', [], 'status-tracking')

    const g = await getDataArchitectureGraph({
      organizationId: orgA.id, role: 'admin',
      filters: { physicalAttributeType: 'effectivity' },
    })
    expect(g.attributes.map(a => a.name)).toEqual(['EffectivityAttr'])
  })

  it('drops cross-edges when one endpoint is filtered out', async () => {
    const e1 = await insertEntity(orgA.id, 'KeepEntity', 'published', [personaA1])
    const e2 = await insertEntity(orgA.id, 'DropEntity', 'published', [personaA2])
    await relateEntities(orgA.id, e1, e2)

    const g = await getDataArchitectureGraph({
      organizationId: orgA.id, role: 'admin',
      filters: { ownerPersonaIds: [personaA1] },
    })
    expect(g.entities.map(e => e.name)).toEqual(['KeepEntity'])
    expect(g.edges.filter(e => e.kind === 'is-related')).toHaveLength(0)
  })
})

// ── 5. Edge deduplication ───────────────────────────────────────────────────

describe('symmetric edges', () => {
  it('emits one row per is-related pair', async () => {
    const e1 = await insertEntity(orgA.id, 'A')
    const e2 = await insertEntity(orgA.id, 'B')
    await relateEntities(orgA.id, e1, e2)

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(g.edges.filter(e => e.kind === 'is-related')).toHaveLength(1)
  })

  it('emits one row per shares pair', async () => {
    const a1 = await insertAttribute(orgA.id, 'A')
    const a2 = await insertAttribute(orgA.id, 'B')
    await shareAttributes(orgA.id, a1, a2)

    const g = await getDataArchitectureGraph({ organizationId: orgA.id, role: 'admin' })
    expect(g.edges.filter(e => e.kind === 'shares')).toHaveLength(1)
  })
})
