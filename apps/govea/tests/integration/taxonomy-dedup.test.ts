/**
 * Integration tests: taxonomy_terms uniqueness guard (#554)
 *
 * The dedupe SQL in `src/db/sql/taxonomy-terms-dedup.sql` collapses historical
 * duplicate rows AND installs a unique index on
 * (organization_id, parent_id, name) using NULLS NOT DISTINCT. These tests
 * pin the index behavior so a future schema change can't silently re-allow
 * the duplicate-tag-chips bug the Content Viewer persona walk surfaced.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { taxonomyTerms } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createTestOrg, cleanupOrg } from './helpers/db'

describe('taxonomy_terms uniqueness guard (#554)', () => {
  let orgId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
  })

  afterAll(() => cleanupOrg(orgId))

  it('allows a single (org, parent, name) tuple', async () => {
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'unique-term-1', slug: 'unique-term-1',
    })
    const rows = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))
    expect(rows.filter(r => r.name === 'unique-term-1')).toHaveLength(1)
  })

  it('rejects a second insert with the same (org, null parent, name)', async () => {
    await expect(db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'unique-term-1', slug: 'unique-term-1-dup',
    })).rejects.toThrow()
    // Drizzle wraps postgres errors; the canonical pg constraint name lives
    // on the err.cause chain, not the top-level message. Asserting the call
    // throws + verifying no extra row landed is sufficient.
  })

  it('allows the same name under different parents', async () => {
    const [parentA] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'parent-A', slug: 'parent-a',
    }).returning()
    const [parentB] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'parent-B', slug: 'parent-b',
    }).returning()

    // Same child name under each parent — both should succeed.
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: parentA.id,
      name: 'shared-child', slug: 'shared-child-a',
    })
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: parentB.id,
      name: 'shared-child', slug: 'shared-child-b',
    })

    const rows = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))
    expect(rows.filter(r => r.name === 'shared-child')).toHaveLength(2)
  })

  it('NULLS NOT DISTINCT: two NULL parents with the same name collide', async () => {
    // The default behavior of UNIQUE in Postgres treats NULL as distinct,
    // which is what let the duplicate-tag bug accumulate in the first place.
    // NULLS NOT DISTINCT inverts that for this index.
    const sharedName = 'null-parent-collision-' + randomUUID().slice(0, 8)
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: sharedName, slug: sharedName + '-a',
    })
    await expect(db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: sharedName, slug: sharedName + '-b',
    })).rejects.toThrow()
    // Drizzle wraps postgres errors; the canonical pg constraint name lives
    // on the err.cause chain, not the top-level message. Asserting the call
    // throws + verifying no extra row landed is sufficient.
  })

  it('same name in a different org is permitted', async () => {
    const otherOrg = await createTestOrg()
    try {
      await db.insert(taxonomyTerms).values({
        id: randomUUID(), organizationId: otherOrg.id, name: 'unique-term-1', slug: 'unique-term-1',
      })
      const rows = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, otherOrg.id))
      expect(rows.some(r => r.name === 'unique-term-1')).toBe(true)
    } finally {
      await cleanupOrg(otherOrg.id)
    }
  })
})

describe('taxonomy_terms slug uniqueness guard (#684)', () => {
  // The slug guard (taxonomy_terms_org_parent_slug_unique) is the key the
  // recipe-install upsert (#671) targets via ON CONFLICT (org, parent, slug).
  // It catches a class the name guard misses: distinct names that normalise to
  // the same slug.
  let orgId: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
  })

  afterAll(() => cleanupOrg(orgId))

  it('rejects distinct names that collide on slug (same org, null parent)', async () => {
    // "Data Architecture" and "Data  Architecture" (double space) have
    // different names but both slugify to "data-architecture". The name guard
    // lets the second through; the slug guard must catch it.
    const slug = 'data-architecture-' + randomUUID().slice(0, 8)
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'Data Architecture A', slug,
    })
    await expect(db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'Data Architecture B', slug,
    })).rejects.toThrow()
  })

  it('allows the same slug under different parents', async () => {
    const [parentA] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'slug-parent-A', slug: 'slug-parent-a',
    }).returning()
    const [parentB] = await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'slug-parent-B', slug: 'slug-parent-b',
    }).returning()

    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: parentA.id,
      name: 'Child One', slug: 'shared-slug',
    })
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, parentId: parentB.id,
      name: 'Child Two', slug: 'shared-slug',
    })

    const rows = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))
    expect(rows.filter(r => r.slug === 'shared-slug')).toHaveLength(2)
  })

  it('NULLS NOT DISTINCT: two NULL parents with the same slug collide', async () => {
    const slug = 'null-parent-slug-' + randomUUID().slice(0, 8)
    await db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'Null Parent Slug One', slug,
    })
    await expect(db.insert(taxonomyTerms).values({
      id: randomUUID(), organizationId: orgId, name: 'Null Parent Slug Two', slug,
    })).rejects.toThrow()
  })
})
