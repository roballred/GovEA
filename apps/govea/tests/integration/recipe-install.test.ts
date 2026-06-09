/**
 * Integration tests: recipe-install engine (#671 / #665 S1)
 *
 * Pins the framework-agnostic engine: idempotent upsert of taxonomy
 * types/terms/bindings + glossary + principles, and the `audience` marker.
 * See docs/design/togaf-recipe-reconciliation.md §9–§10.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { taxonomyTerms, entityTaxonomyDefinitions, glossaryTerms, principles } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { installRecipe } from '@/lib/recipes/install'
import type { Recipe } from '@/lib/recipes/types'
import { createTestOrg, cleanupOrg } from './helpers/db'

const RECIPE: Recipe = {
  slug: 'test-recipe', name: 'Test Recipe', version: '1.0.0',
  taxonomyTypes: [{
    name: 'Test Domain', slug: 'test-domain', audience: 'framework',
    terms: [{ name: 'Alpha', slug: 'alpha' }, { name: 'Beta', slug: 'beta' }],
    bindings: [{ entityType: 'capability', selectionMode: 'single' }],
  }],
  glossaryTerms: [{ term: 'Test Term', definition: 'A term installed by a recipe.' }],
  principles: [{ name: 'Test Principle', title: 'Prefer tests', principleType: 'architecture' }],
}

describe('recipe-install engine (#671)', () => {
  let orgId: string
  beforeAll(async () => { orgId = (await createTestOrg()).id })
  afterAll(() => cleanupOrg(orgId))

  async function counts() {
    const tax = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))
    const defs = await db.select().from(entityTaxonomyDefinitions).where(eq(entityTaxonomyDefinitions.organizationId, orgId))
    const gloss = await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))
    const princ = await db.select().from(principles).where(eq(principles.organizationId, orgId))
    return { tax: tax.length, defs: defs.length, gloss: gloss.length, princ: princ.length }
  }

  it('installs taxonomy types/terms/bindings, glossary, and principles', async () => {
    const r = await installRecipe(orgId, RECIPE)
    expect(r).toMatchObject({ taxonomyTypes: 1, taxonomyTerms: 2, bindings: 1, glossaryTerms: 1, principles: 1 })
    expect(await counts()).toEqual({ tax: 3, defs: 1, gloss: 1, princ: 1 }) // 1 type + 2 terms
  })

  it('sets the audience marker on the type', async () => {
    const [type] = await db.select().from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), isNull(taxonomyTerms.parentId), eq(taxonomyTerms.slug, 'test-domain')))
    expect(type.audience).toBe('framework')
  })

  it('binds the type to the capability entity', async () => {
    const [def] = await db.select().from(entityTaxonomyDefinitions)
      .where(and(eq(entityTaxonomyDefinitions.organizationId, orgId), eq(entityTaxonomyDefinitions.entityType, 'capability')))
    expect(def).toBeTruthy()
    expect(def.selectionMode).toBe('single')
  })

  it('is idempotent — re-running creates nothing new', async () => {
    const before = await counts()
    const r = await installRecipe(orgId, RECIPE)
    expect(r).toMatchObject({ taxonomyTypes: 0, taxonomyTerms: 0, bindings: 0, glossaryTerms: 0, principles: 0 })
    expect(await counts()).toEqual(before)
  })

  it('updates curated fields in place on re-install', async () => {
    const updated: Recipe = {
      ...RECIPE,
      glossaryTerms: [{ term: 'Test Term', definition: 'An updated definition.' }],
    }
    await installRecipe(orgId, updated)
    const [g] = await db.select().from(glossaryTerms)
      .where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.term, 'Test Term')))
    expect(g.definition).toBe('An updated definition.')
    // still exactly one glossary row (updated, not duplicated)
    const all = await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))
    expect(all).toHaveLength(1)
  })
})
