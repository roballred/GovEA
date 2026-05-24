/**
 * Regression: deleteTaxonomyTerm cascades to personas.type (#49)
 *
 * personas.type stores the taxonomy term NAME as plain text (no FK). Deleting
 * a persona-type value or its "Persona Type" parent should clear personas.type
 * to NULL for matching rows in the same org so the table and type filter
 * don't display orphan strings. Audit log captures the cascade.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { personas, taxonomyTerms, auditLog } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { deleteTaxonomyTerm } from '@/actions/taxonomy'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRevalidate = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

async function seedPersonaTypeRoot(orgId: string): Promise<string> {
  const [row] = await db.insert(taxonomyTerms).values({
    id: randomUUID(),
    organizationId: orgId,
    name: 'Persona Type',
    slug: 'persona-type',
    parentId: null,
  }).returning()
  return row.id
}

async function seedPersonaTypeChild(orgId: string, parentId: string, name: string): Promise<{ id: string; name: string }> {
  const [row] = await db.insert(taxonomyTerms).values({
    id: randomUUID(),
    organizationId: orgId,
    parentId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
  }).returning()
  return { id: row.id, name: row.name }
}

async function seedPersona(orgId: string, name: string, type: string | null) {
  const [row] = await db.insert(personas).values({
    id: randomUUID(),
    organizationId: orgId,
    name,
    type,
  }).returning()
  return row
}

describe('deleteTaxonomyTerm — persona-type cascade (#49)', () => {
  let orgId: string
  let admin: TestUser
  let otherOrgId: string

  beforeAll(async () => {
    orgId = (await createTestOrg()).id
    otherOrgId = (await createTestOrg()).id
    admin = await createTestUser(orgId, 'admin')
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
    await cleanupOrg(otherOrgId)
  })

  it('nulls personas.type when the matching type VALUE is deleted', async () => {
    const root = await seedPersonaTypeRoot(orgId)
    const staff = await seedPersonaTypeChild(orgId, root, 'Staff')
    const resident = await seedPersonaTypeChild(orgId, root, 'Resident')

    const alice = await seedPersona(orgId, 'Alice', staff.name)
    const bob = await seedPersona(orgId, 'Bob', staff.name)
    const carol = await seedPersona(orgId, 'Carol', resident.name)

    await deleteTaxonomyTerm(staff.id)

    const [aliceRow, bobRow, carolRow] = await Promise.all([
      db.query.personas.findFirst({ where: eq(personas.id, alice.id) }),
      db.query.personas.findFirst({ where: eq(personas.id, bob.id) }),
      db.query.personas.findFirst({ where: eq(personas.id, carol.id) }),
    ])

    expect(aliceRow?.type).toBeNull()
    expect(bobRow?.type).toBeNull()
    // Untouched — only the deleted type's name was nulled
    expect(carolRow?.type).toBe('Resident')
  })

  it('does not touch personas in a different org with the same type name', async () => {
    // Same name in a different org — must not be affected
    const otherRoot = await seedPersonaTypeRoot(otherOrgId)
    const otherStaff = await seedPersonaTypeChild(otherOrgId, otherRoot, 'OtherOrgStaff')
    const isolated = await seedPersona(otherOrgId, 'Isolated', otherStaff.name)

    // Also create the same-named type in orgId so we can delete it
    const root = await db.query.taxonomyTerms.findFirst({
      where: and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.slug, 'persona-type')),
    })
    const sameName = await seedPersonaTypeChild(orgId, root!.id, 'OtherOrgStaff')
    const sameNameUser = await seedPersona(orgId, 'SameName', sameName.name)

    await deleteTaxonomyTerm(sameName.id)

    const [isolatedRow, sameNameRow] = await Promise.all([
      db.query.personas.findFirst({ where: eq(personas.id, isolated.id) }),
      db.query.personas.findFirst({ where: eq(personas.id, sameNameUser.id) }),
    ])

    expect(isolatedRow?.type).toBe('OtherOrgStaff')  // untouched (different org)
    expect(sameNameRow?.type).toBeNull()             // cascaded (same org)
  })

  it('nulls every matching persona when the "Persona Type" PARENT is deleted', async () => {
    // Fresh org so the parent isn't shared with the previous test
    const localOrgId = (await createTestOrg()).id
    const localAdmin = await createTestUser(localOrgId, 'admin')
    mockAuth.mockResolvedValue(makeSession(localAdmin))

    const root = await seedPersonaTypeRoot(localOrgId)
    const staff = await seedPersonaTypeChild(localOrgId, root, 'Staff')
    const resident = await seedPersonaTypeChild(localOrgId, root, 'Resident')
    const vendor = await seedPersonaTypeChild(localOrgId, root, 'Vendor')

    const p1 = await seedPersona(localOrgId, 'P1', staff.name)
    const p2 = await seedPersona(localOrgId, 'P2', resident.name)
    const p3 = await seedPersona(localOrgId, 'P3', vendor.name)
    const p4 = await seedPersona(localOrgId, 'P4', null)  // already null

    await deleteTaxonomyTerm(root)

    const rows = await db.select().from(personas).where(eq(personas.organizationId, localOrgId))
    for (const p of rows) {
      expect(p.type, `${p.name} should have null type after parent delete`).toBeNull()
    }
    expect(rows.find(r => r.id === p1.id)).toBeDefined()
    expect(rows.find(r => r.id === p4.id)).toBeDefined()
    // Avoid unused-var lint complaints
    void p2; void p3

    // All three child terms must also be gone
    const remainingChildren = await db.select().from(taxonomyTerms).where(
      and(eq(taxonomyTerms.organizationId, localOrgId), eq(taxonomyTerms.parentId, root)),
    )
    expect(remainingChildren).toHaveLength(0)

    await cleanupOrg(localOrgId)
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  it('does NOT cascade when the deleted term is unrelated to "Persona Type"', async () => {
    const localOrgId = (await createTestOrg()).id
    const localAdmin = await createTestUser(localOrgId, 'admin')
    mockAuth.mockResolvedValue(makeSession(localAdmin))

    // Seed an unrelated taxonomy type (parent slug != persona-type) and a
    // persona whose type happens to match the child's NAME by coincidence.
    const [unrelatedRoot] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: localOrgId,
      name: 'Application Tier', slug: 'application-tier', parentId: null,
    }).returning()
    const [tier1] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: localOrgId,
      parentId: unrelatedRoot.id, name: 'Tier 1', slug: 'tier-1',
    }).returning()

    const survivor = await seedPersona(localOrgId, 'NameCollision', tier1.name)

    await deleteTaxonomyTerm(tier1.id)

    const after = await db.query.personas.findFirst({ where: eq(personas.id, survivor.id) })
    expect(after?.type).toBe('Tier 1')  // untouched — wrong parent

    await cleanupOrg(localOrgId)
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  it('writes the cascade detail to the audit log', async () => {
    const localOrgId = (await createTestOrg()).id
    const localAdmin = await createTestUser(localOrgId, 'admin')
    mockAuth.mockResolvedValue(makeSession(localAdmin))

    const root = await seedPersonaTypeRoot(localOrgId)
    const staff = await seedPersonaTypeChild(localOrgId, root, 'Staff')
    await seedPersona(localOrgId, 'A', staff.name)
    await seedPersona(localOrgId, 'B', staff.name)

    await deleteTaxonomyTerm(staff.id)

    const [latest] = await db.select()
      .from(auditLog)
      .where(and(eq(auditLog.organizationId, localOrgId), eq(auditLog.action, 'taxonomy.delete')))
      .orderBy(desc(auditLog.createdAt))
      .limit(1)

    expect(latest).toBeDefined()
    expect(latest.metadata).toMatchObject({
      cascade: 'personas.type → null',
      affectedNames: ['Staff'],
      personasNulledCount: 2,
    })

    await cleanupOrg(localOrgId)
    mockAuth.mockResolvedValue(makeSession(admin))
  })
})
