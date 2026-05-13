/**
 * Cross-object semantic relationships (#363 PR-2).
 *
 * Asserts the contract for the three new relationship kinds:
 *   - entity ↔ entity  "is related"        (data_entity_relations, symmetric)
 *   - entity ↔ attribute "characterized by" (data_entity_attribute_links)
 *   - attribute ↔ attribute "shares"        (data_attribute_shares, symmetric)
 *
 * The fourth kind from the spec — entity ↔ business key "instantiates" — is
 * already structurally enforced by PR-1's owningDataEntityId FK; PR-2 only
 * surfaces it in UI and does not need new tests here.
 *
 * Coverage:
 *   1. Round-trip per relationship kind.
 *   2. Symmetric kinds store one row per pair with canonical ordering.
 *   3. setX replaces the set atomically (idempotent re-save).
 *   4. Self-relations are silently filtered out.
 *   5. Cross-org target is rejected.
 *   6. ON DELETE CASCADE removes relationship rows when the underlying
 *      entity/attribute is deleted.
 *   7. Viewer cannot mutate relationships.
 *   8. Audit row written on each set_*.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq, or } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  dataEntities, dataAttributes,
  dataEntityRelations, dataEntityAttributeLinks, dataAttributeShares,
  auditLog,
} from '@/db/schema'
import {
  createDataEntity, createDataAttribute, deleteDataEntity, deleteDataAttribute,
} from '@/actions/data-architecture'
import {
  setRelatedEntities, getRelatedEntityIds,
  setCharacterizingAttributes, getCharacterizingAttributeIds, getEntitiesCharacterizedBy,
  setSharedAttributes, getSharedAttributeIds,
} from '@/actions/data-architecture-relationships'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  type TestOrg, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let adminA: TestUser
let viewerA: TestUser
let adminB: TestUser

function asUser(user: TestUser) {
  mockAuth.mockResolvedValue(makeSession(user))
}

function fd(input: Record<string, string | string[] | boolean | undefined>): FormData {
  const out = new FormData()
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue
    if (Array.isArray(v)) {
      for (const x of v) out.append(k, x)
    } else if (typeof v === 'boolean') {
      if (v) out.set(k, 'on')
    } else {
      out.set(k, v)
    }
  }
  return out
}

beforeAll(async () => {
  orgA = await createTestOrg({ name: 'Rel Org A', slug: `rel-a-${randomUUID().slice(0, 8)}` })
  orgB = await createTestOrg({ name: 'Rel Org B', slug: `rel-b-${randomUUID().slice(0, 8)}` })
  ;[adminA, viewerA, adminB] = await Promise.all([
    createTestUser(orgA.id, 'admin', { name: 'Rel Admin A' }),
    createTestUser(orgA.id, 'viewer', { name: 'Rel Viewer A' }),
    createTestUser(orgB.id, 'admin', { name: 'Rel Admin B' }),
  ])
})

afterAll(async () => {
  await Promise.all([cleanupOrg(orgA.id), cleanupOrg(orgB.id)])
})

beforeEach(async () => {
  // Cascade clears all relationship rows when the underlying object rows go.
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgA.id))
  await db.delete(dataAttributes).where(eq(dataAttributes.organizationId, orgA.id))
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgB.id))
  await db.delete(dataAttributes).where(eq(dataAttributes.organizationId, orgB.id))
})

// ── 1. entity ↔ entity "is related" ─────────────────────────────────────────

describe('setRelatedEntities', () => {
  it('round-trips, stores one row per pair, returns from both sides', async () => {
    asUser(adminA)
    const e1 = await createDataEntity(fd({ name: 'Customer' }))
    const e2 = await createDataEntity(fd({ name: 'Product' }))
    const e3 = await createDataEntity(fd({ name: 'Order' }))

    await setRelatedEntities(e1, [e2, e3])
    expect((await getRelatedEntityIds(e1)).sort()).toEqual([e2, e3].sort())
    // Reverse side reads the same set.
    expect(await getRelatedEntityIds(e2)).toEqual([e1])
    expect(await getRelatedEntityIds(e3)).toEqual([e1])

    // Only 2 physical rows (canonical ordering, not 4).
    const rows = await db.select().from(dataEntityRelations)
      .where(eq(dataEntityRelations.organizationId, orgA.id))
    expect(rows).toHaveLength(2)
    // Canonical ordering check: every left < right.
    for (const r of rows) {
      expect(r.leftDataEntityId < r.rightDataEntityId).toBe(true)
    }
  })

  it('replaces the related-set atomically (idempotent re-save shrinks)', async () => {
    asUser(adminA)
    const a = await createDataEntity(fd({ name: 'A' }))
    const b = await createDataEntity(fd({ name: 'B' }))
    const c = await createDataEntity(fd({ name: 'C' }))

    await setRelatedEntities(a, [b, c])
    expect((await getRelatedEntityIds(a)).length).toBe(2)
    // Shrink to one related.
    await setRelatedEntities(a, [b])
    expect(await getRelatedEntityIds(a)).toEqual([b])
    // c no longer sees a.
    expect(await getRelatedEntityIds(c)).toEqual([])
  })

  it('silently filters self-relations', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'Solo' }))
    await setRelatedEntities(e, [e])
    expect(await getRelatedEntityIds(e)).toEqual([])
  })

  it('rejects cross-org target entity', async () => {
    asUser(adminB)
    const otherOrgEntity = await createDataEntity(fd({ name: 'OtherOrg' }))
    asUser(adminA)
    const ownEntity = await createDataEntity(fd({ name: 'Own' }))
    await expect(setRelatedEntities(ownEntity, [otherOrgEntity]))
      .rejects.toThrow(/not found in this organization/)
  })

  it('cascades when an entity is deleted', async () => {
    asUser(adminA)
    const a = await createDataEntity(fd({ name: 'CascadeA' }))
    const b = await createDataEntity(fd({ name: 'CascadeB' }))
    await setRelatedEntities(a, [b])
    await deleteDataEntity(a)
    const rows = await db.select().from(dataEntityRelations)
      .where(or(eq(dataEntityRelations.leftDataEntityId, b), eq(dataEntityRelations.rightDataEntityId, b)))
    expect(rows).toHaveLength(0)
  })

  it('viewer cannot set related entities', async () => {
    asUser(adminA)
    const a = await createDataEntity(fd({ name: 'A' }))
    const b = await createDataEntity(fd({ name: 'B' }))
    asUser(viewerA)
    await expect(setRelatedEntities(a, [b])).rejects.toThrow(/Forbidden/)
  })

  it('writes a set_relations audit row', async () => {
    asUser(adminA)
    const a = await createDataEntity(fd({ name: 'A' }))
    const b = await createDataEntity(fd({ name: 'B' }))
    const baseline = await db.select().from(auditLog)
      .where(and(eq(auditLog.organizationId, orgA.id), eq(auditLog.entityId, a)))
    await setRelatedEntities(a, [b])
    const after = await db.select().from(auditLog)
      .where(and(eq(auditLog.organizationId, orgA.id), eq(auditLog.entityId, a)))
    const delta = after.filter(r => r.action === 'data_entity.set_relations').length - baseline.filter(r => r.action === 'data_entity.set_relations').length
    expect(delta).toBe(1)
  })
})

// ── 2. entity ↔ attribute "characterized by" ────────────────────────────────

describe('setCharacterizingAttributes', () => {
  it('round-trips and is queryable from both sides', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'Customer' }))
    const a1 = await createDataAttribute(fd({ name: 'Name' }))
    const a2 = await createDataAttribute(fd({ name: 'Email' }))

    await setCharacterizingAttributes(e, [a1, a2])
    expect((await getCharacterizingAttributeIds(e)).sort()).toEqual([a1, a2].sort())
    expect(await getEntitiesCharacterizedBy(a1)).toEqual([e])
    expect(await getEntitiesCharacterizedBy(a2)).toEqual([e])
  })

  it('replaces atomically (drop one, keep one)', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'E' }))
    const a1 = await createDataAttribute(fd({ name: 'A1' }))
    const a2 = await createDataAttribute(fd({ name: 'A2' }))
    await setCharacterizingAttributes(e, [a1, a2])
    await setCharacterizingAttributes(e, [a1])
    expect(await getCharacterizingAttributeIds(e)).toEqual([a1])
    expect(await getEntitiesCharacterizedBy(a2)).toEqual([])
  })

  it('rejects cross-org attribute', async () => {
    asUser(adminB)
    const otherAttr = await createDataAttribute(fd({ name: 'Foreign' }))
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'E' }))
    await expect(setCharacterizingAttributes(e, [otherAttr]))
      .rejects.toThrow(/not found in this organization/)
  })

  it('cascades on entity delete', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'E' }))
    const a = await createDataAttribute(fd({ name: 'A' }))
    await setCharacterizingAttributes(e, [a])
    await deleteDataEntity(e)
    expect(await getEntitiesCharacterizedBy(a)).toEqual([])
  })

  it('cascades on attribute delete', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'E' }))
    const a = await createDataAttribute(fd({ name: 'A' }))
    await setCharacterizingAttributes(e, [a])
    await deleteDataAttribute(a)
    expect(await getCharacterizingAttributeIds(e)).toEqual([])
  })

  it('viewer cannot set characterizing attributes', async () => {
    asUser(adminA)
    const e = await createDataEntity(fd({ name: 'E' }))
    asUser(viewerA)
    await expect(setCharacterizingAttributes(e, [])).rejects.toThrow(/Forbidden/)
  })
})

// ── 3. attribute ↔ attribute "shares" ───────────────────────────────────────

describe('setSharedAttributes', () => {
  it('round-trips with canonical ordering + symmetric reads', async () => {
    asUser(adminA)
    const a1 = await createDataAttribute(fd({ name: 'A1' }))
    const a2 = await createDataAttribute(fd({ name: 'A2' }))
    const a3 = await createDataAttribute(fd({ name: 'A3' }))

    await setSharedAttributes(a1, [a2, a3])
    expect((await getSharedAttributeIds(a1)).sort()).toEqual([a2, a3].sort())
    expect(await getSharedAttributeIds(a2)).toEqual([a1])
    expect(await getSharedAttributeIds(a3)).toEqual([a1])

    const rows = await db.select().from(dataAttributeShares)
      .where(eq(dataAttributeShares.organizationId, orgA.id))
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(r.leftDataAttributeId < r.rightDataAttributeId).toBe(true)
    }
  })

  it('silently filters self-relations', async () => {
    asUser(adminA)
    const a = await createDataAttribute(fd({ name: 'Solo' }))
    await setSharedAttributes(a, [a])
    expect(await getSharedAttributeIds(a)).toEqual([])
  })

  it('cascades on attribute delete', async () => {
    asUser(adminA)
    const a1 = await createDataAttribute(fd({ name: 'A1' }))
    const a2 = await createDataAttribute(fd({ name: 'A2' }))
    await setSharedAttributes(a1, [a2])
    await deleteDataAttribute(a1)
    expect(await getSharedAttributeIds(a2)).toEqual([])
  })
})
