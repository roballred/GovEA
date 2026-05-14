/**
 * Data architecture foundation (#363 PR-1).
 *
 * Asserts the contract for the four metamodel objects:
 *   1. Entity / Attribute / Link / BusinessKey CRUD persists rows + owner
 *      junctions transactionally.
 *   2. Owner-Persona junction sets are atomically replaced on edit.
 *   3. Required-field validation (name, owningDataEntityId for BK).
 *   4. Cross-org guard: BK cannot point at another org's entity via guessed UUID.
 *   5. Role gates: viewer cannot create/edit/delete; viewer reads only published.
 *   6. Audit log written for create / update / delete on each object.
 *   7. ON DELETE CASCADE: deleting an entity cascades to its business keys.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  dataEntities, dataAttributes, dataLinks, dataBusinessKeys,
  dataEntityOwners, dataAttributeOwners, dataBusinessKeyOwners,
  personas, auditLog,
} from '@/db/schema'
import {
  createDataEntity, editDataEntity, deleteDataEntity, getDataEntity, getDataEntities,
  createDataAttribute, editDataAttribute, deleteDataAttribute,
  createDataLink, deleteDataLink,
  createDataBusinessKey, editDataBusinessKey,
} from '@/actions/data-architecture'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession,
  type TestOrg, type TestUser,
} from './helpers/db'

// ── auth mocking ────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

let orgA: TestOrg
let orgB: TestOrg
let adminA: TestUser
let viewerA: TestUser
let adminB: TestUser
let personaA1: string
let personaA2: string

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
  orgA = await createTestOrg({ name: 'Data Org A', slug: `data-a-${randomUUID().slice(0, 8)}` })
  orgB = await createTestOrg({ name: 'Data Org B', slug: `data-b-${randomUUID().slice(0, 8)}` })
  ;[adminA, viewerA, adminB] = await Promise.all([
    createTestUser(orgA.id, 'admin', { name: 'Data Admin A' }),
    createTestUser(orgA.id, 'viewer', { name: 'Data Viewer A' }),
    createTestUser(orgB.id, 'admin', { name: 'Data Admin B' }),
  ])

  // Two personas in org A used as owners on data-arch objects.
  const [pA1, pA2] = await Promise.all([
    db.insert(personas).values({
      id: randomUUID(), organizationId: orgA.id, name: 'Data Architect A1',
      status: 'published', visibility: 'org',
    }).returning(),
    db.insert(personas).values({
      id: randomUUID(), organizationId: orgA.id, name: 'Data Modeler A2',
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
  // Cascade clears junctions; BK cascades from entity delete; audit log is append-only.
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgA.id))
  await db.delete(dataAttributes).where(eq(dataAttributes.organizationId, orgA.id))
  await db.delete(dataLinks).where(eq(dataLinks.organizationId, orgA.id))
  await db.delete(dataEntities).where(eq(dataEntities.organizationId, orgB.id))
})

// ── 1. Entity CRUD ──────────────────────────────────────────────────────────

describe('createDataEntity', () => {
  it('persists row + owner junctions transactionally', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({
      name: 'Customer',
      description: 'Hub for customer master data',
      status: 'published',
      physicalHubTableName: 'hub_customer',
      serverName: 'db01', databaseName: 'edw', schemaName: 'raw',
      ownerPersonaIds: [personaA1, personaA2],
    }))
    expect(id).toBeTruthy()

    const row = await db.query.dataEntities.findFirst({ where: eq(dataEntities.id, id) })
    expect(row?.name).toBe('Customer')
    expect(row?.physicalHubTableName).toBe('hub_customer')
    expect(row?.status).toBe('published')

    const owners = await db.select().from(dataEntityOwners).where(eq(dataEntityOwners.dataEntityId, id))
    expect(owners.map(o => o.personaId).sort()).toEqual([personaA1, personaA2].sort())
  })

  it('refuses to save without a name', async () => {
    asUser(adminA)
    await expect(createDataEntity(fd({ name: '' }))).rejects.toThrow(/Name is required/)
  })

  it('writes a data_entity.create audit row', async () => {
    asUser(adminA)
    const baseline = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    const id = await createDataEntity(fd({ name: 'Product', ownerPersonaIds: [personaA1] }))
    const after = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    const delta = after.length - baseline.length
    expect(delta).toBe(1)
    expect(after.some(row => row.entityId === id && row.action === 'data_entity.create')).toBe(true)
  })
})

describe('editDataEntity', () => {
  it('replaces owner-junction set atomically', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({
      name: 'Customer', ownerPersonaIds: [personaA1, personaA2],
    }))
    await editDataEntity(id, fd({
      name: 'Customer (renamed)', ownerPersonaIds: [personaA2],
    }))
    const owners = await db.select().from(dataEntityOwners).where(eq(dataEntityOwners.dataEntityId, id))
    expect(owners.map(o => o.personaId)).toEqual([personaA2])
  })

  it('writes a data_entity.update audit row', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({ name: 'Order' }))
    const baseline = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    await editDataEntity(id, fd({ name: 'Order (renamed)' }))
    const after = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    expect(after.length - baseline.length).toBe(1)
    expect(after.some(row => row.entityId === id && row.action === 'data_entity.update')).toBe(true)
  })
})

describe('deleteDataEntity', () => {
  it('removes the row and writes a delete audit row', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({ name: 'Disposable' }))
    const baseline = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    await deleteDataEntity(id)
    const after = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA.id))
    expect(after.length - baseline.length).toBe(1)
    expect(after.some(row => row.entityId === id && row.action === 'data_entity.delete')).toBe(true)

    const row = await db.query.dataEntities.findFirst({ where: eq(dataEntities.id, id) })
    expect(row).toBeUndefined()
  })
})

// ── 2. Read role-gating ─────────────────────────────────────────────────────

describe('getDataEntities role-gating', () => {
  it('viewer sees only published entities', async () => {
    asUser(adminA)
    await createDataEntity(fd({ name: 'Public Entity', status: 'published' }))
    await createDataEntity(fd({ name: 'Draft Entity', status: 'draft' }))

    asUser(viewerA)
    const visible = await getDataEntities()
    expect(visible.map(r => r.name).sort()).toEqual(['Public Entity'])
  })
})

describe('getDataEntity role-gating', () => {
  it('viewer cannot read a draft entity', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({ name: 'Hidden', status: 'draft' }))
    asUser(viewerA)
    expect(await getDataEntity(id)).toBeNull()
  })
})

// ── 3. Attribute ────────────────────────────────────────────────────────────

describe('Attribute CRUD', () => {
  it('persists physicalAttributeType enum + owner junctions', async () => {
    asUser(adminA)
    const id = await createDataAttribute(fd({
      name: 'EffectivityDates',
      physicalAttributeType: 'effectivity',
      physicalSatelliteTableName: 'sat_customer_effectivity',
      ownerPersonaIds: [personaA1],
    }))
    const row = await db.query.dataAttributes.findFirst({ where: eq(dataAttributes.id, id) })
    expect(row?.physicalAttributeType).toBe('effectivity')

    const owners = await db.select().from(dataAttributeOwners).where(eq(dataAttributeOwners.dataAttributeId, id))
    expect(owners).toHaveLength(1)
  })

  it('edit replaces owner junctions and writes audit', async () => {
    asUser(adminA)
    const id = await createDataAttribute(fd({
      name: 'Tracking',
      physicalAttributeType: 'record-tracking',
      ownerPersonaIds: [personaA1],
    }))
    await editDataAttribute(id, fd({
      name: 'Tracking',
      physicalAttributeType: 'status-tracking',
      ownerPersonaIds: [personaA2],
    }))
    const owners = await db.select().from(dataAttributeOwners).where(eq(dataAttributeOwners.dataAttributeId, id))
    expect(owners.map(o => o.personaId)).toEqual([personaA2])

    const audits = await db.select().from(auditLog)
      .where(and(eq(auditLog.organizationId, orgA.id), eq(auditLog.entityId, id)))
    expect(audits.map(a => a.action).sort()).toEqual(['data_attribute.create', 'data_attribute.update'])
  })

  it('admin can delete', async () => {
    asUser(adminA)
    const id = await createDataAttribute(fd({ name: 'Disposable' }))
    await deleteDataAttribute(id)
    const row = await db.query.dataAttributes.findFirst({ where: eq(dataAttributes.id, id) })
    expect(row).toBeUndefined()
  })
})

// ── 4. Link ─────────────────────────────────────────────────────────────────

describe('Link CRUD', () => {
  it('persists physicalLinkType enum', async () => {
    asUser(adminA)
    const id = await createDataLink(fd({
      name: 'CustomerOrder',
      physicalLinkType: 'hierarchical',
      physicalLinkTableName: 'lnk_customer_order',
    }))
    const row = await db.query.dataLinks.findFirst({ where: eq(dataLinks.id, id) })
    expect(row?.physicalLinkType).toBe('hierarchical')
  })

  it('admin can delete', async () => {
    asUser(adminA)
    const id = await createDataLink(fd({ name: 'Disposable' }))
    await deleteDataLink(id)
    const row = await db.query.dataLinks.findFirst({ where: eq(dataLinks.id, id) })
    expect(row).toBeUndefined()
  })
})

// ── 5. BusinessKey ──────────────────────────────────────────────────────────

describe('BusinessKey', () => {
  it('requires owningDataEntityId', async () => {
    asUser(adminA)
    await expect(createDataBusinessKey(fd({ name: 'OrphanKey' }))).rejects.toThrow(/Owning entity is required/)
  })

  it('rejects an owning entity from another org', async () => {
    asUser(adminB)
    const otherOrgEntityId = await createDataEntity(fd({ name: 'OtherOrgEntity' }))

    asUser(adminA)
    await expect(createDataBusinessKey(fd({
      name: 'GuessedKey',
      owningDataEntityId: otherOrgEntityId,
    }))).rejects.toThrow(/Owning entity not found/)
  })

  it('cascades when the owning entity is deleted', async () => {
    asUser(adminA)
    const entityId = await createDataEntity(fd({ name: 'CustomerHub' }))
    const bkId = await createDataBusinessKey(fd({
      name: 'CustomerNumber',
      dataType: 'VARCHAR(64)',
      owningDataEntityId: entityId,
    }))

    await deleteDataEntity(entityId)
    const bk = await db.query.dataBusinessKeys.findFirst({ where: eq(dataBusinessKeys.id, bkId) })
    expect(bk).toBeUndefined()
  })

  it('edit preserves owner-junction atomicity', async () => {
    asUser(adminA)
    const entityId = await createDataEntity(fd({ name: 'ProductHub' }))
    const bkId = await createDataBusinessKey(fd({
      name: 'SKU',
      owningDataEntityId: entityId,
      ownerPersonaIds: [personaA1, personaA2],
    }))
    await editDataBusinessKey(bkId, fd({
      name: 'SKU',
      owningDataEntityId: entityId,
      ownerPersonaIds: [personaA1],
    }))
    const owners = await db.select().from(dataBusinessKeyOwners).where(eq(dataBusinessKeyOwners.dataBusinessKeyId, bkId))
    expect(owners.map(o => o.personaId)).toEqual([personaA1])
  })
})

// ── 6. Role gates ───────────────────────────────────────────────────────────

describe('Role gates', () => {
  it('viewer cannot create an entity', async () => {
    asUser(viewerA)
    await expect(createDataEntity(fd({ name: 'NoGo' }))).rejects.toThrow(/Forbidden/)
  })

  it('viewer cannot create an attribute', async () => {
    asUser(viewerA)
    await expect(createDataAttribute(fd({ name: 'NoGo' }))).rejects.toThrow(/Forbidden/)
  })

  it('viewer cannot delete (admin-only)', async () => {
    asUser(adminA)
    const id = await createDataEntity(fd({ name: 'CannotDelete' }))
    asUser(viewerA)
    await expect(deleteDataEntity(id)).rejects.toThrow(/Forbidden/)
  })
})
