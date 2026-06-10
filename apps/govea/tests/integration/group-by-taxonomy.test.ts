/**
 * Integration tests: generic group-by-taxonomy report engine (#673 / #665 S3)
 *
 * Buckets entities into a taxonomy type's values via entity_taxonomy_values,
 * with an explicit unmapped gap set; supports multi-select; exposes the type's
 * audience so callers can hide framework types from viewers (ADR-0001/0002).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { taxonomyTerms, capabilities, entityTaxonomyValues } from '@/db/schema'
import { groupByTaxonomyType, type EntityRef } from '@/lib/reports/group-by-taxonomy'
import { createTestOrg, cleanupOrg } from './helpers/db'

describe('groupByTaxonomyType (#673)', () => {
  let orgId: string
  let termAId: string
  let termBId: string
  let caps: EntityRef[]

  beforeAll(async () => {
    orgId = (await createTestOrg()).id

    const [type] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'Report Type', slug: 'report-type', audience: 'framework',
    }).returning()
    const [a] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: type.id, name: 'Group A', slug: 'group-a', sortOrder: '0',
    }).returning()
    const [b] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: type.id, name: 'Group B', slug: 'group-b', sortOrder: '1',
    }).returning()
    termAId = a.id; termBId = b.id

    const rows = await db.insert(capabilities).values([
      { id: randomUUID(), organizationId: orgId, name: 'Cap One' },
      { id: randomUUID(), organizationId: orgId, name: 'Cap Two' },
      { id: randomUUID(), organizationId: orgId, name: 'Cap Three' },
    ]).returning()
    caps = rows.map(r => ({ id: r.id, name: r.name }))

    // Cap One -> A; Cap Two -> A and B (multi); Cap Three -> none (unmapped)
    await db.insert(entityTaxonomyValues).values([
      { organizationId: orgId, entityType: 'capability', entityId: caps[0].id, taxonomyTermId: termAId },
      { organizationId: orgId, entityType: 'capability', entityId: caps[1].id, taxonomyTermId: termAId },
      { organizationId: orgId, entityType: 'capability', entityId: caps[1].id, taxonomyTermId: termBId },
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('returns null for an unknown taxonomy type slug', async () => {
    expect(await groupByTaxonomyType(orgId, 'capability', 'does-not-exist', caps)).toBeNull()
  })

  it('groups entities by value, supports multi-select, and surfaces unmapped', async () => {
    const r = await groupByTaxonomyType(orgId, 'capability', 'report-type', caps)
    expect(r).not.toBeNull()
    expect(r!.type.audience).toBe('framework')
    expect(r!.total).toBe(3)

    const a = r!.groups.find(g => g.termId === termAId)!
    const b = r!.groups.find(g => g.termId === termBId)!
    expect(a.members.map(m => m.name).sort()).toEqual(['Cap One', 'Cap Two'])
    expect(b.members.map(m => m.name)).toEqual(['Cap Two']) // multi-select: Cap Two in both
    expect(r!.unmapped.map(m => m.name)).toEqual(['Cap Three'])
  })

  it('preserves child-term order as the group order', async () => {
    const r = await groupByTaxonomyType(orgId, 'capability', 'report-type', caps)
    expect(r!.groups.map(g => g.termSlug)).toEqual(['group-a', 'group-b'])
  })
})
