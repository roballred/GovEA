/**
 * Integration tests: TOGAF recipe content (#672 / #665 S2)
 *
 * Pins the recipe *data* (not the engine — that's recipe-install.test.ts): the
 * TOGAF recipe installs an Architecture Domain type and an ADM Phase type, both
 * audience='framework' (ADR-0001/0002), with the right values + bindings, plus
 * glossary and principles — and is idempotent on re-install.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { taxonomyTerms, entityTaxonomyDefinitions, glossaryTerms, principles } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { installRecipe } from '@/lib/recipes/install'
import { togafRecipe } from '@/lib/recipes/togaf'
import { getRecipe, RECIPE_CATALOG } from '@/lib/recipes/catalog'
import { createTestOrg, cleanupOrg } from './helpers/db'

describe('TOGAF recipe (#672)', () => {
  let orgId: string
  beforeAll(async () => { orgId = (await createTestOrg()).id })
  afterAll(() => cleanupOrg(orgId))

  async function typeBySlug(slug: string) {
    const [t] = await db.select().from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), isNull(taxonomyTerms.parentId), eq(taxonomyTerms.slug, slug)))
    return t
  }
  async function childCount(typeId: string) {
    return (await db.select().from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.parentId, typeId)))).length
  }
  async function bindingsFor(typeId: string) {
    const rows = await db.select().from(entityTaxonomyDefinitions)
      .where(and(eq(entityTaxonomyDefinitions.organizationId, orgId), eq(entityTaxonomyDefinitions.taxonomyTypeId, typeId)))
    return rows.map(r => `${r.entityType}:${r.selectionMode}`).sort()
  }

  it('is registered in the catalog', () => {
    expect(getRecipe('togaf')).toBe(togafRecipe)
    expect(RECIPE_CATALOG).toContain(togafRecipe)
  })

  it('installs Architecture Domain + ADM Phase as framework-audience classifications', async () => {
    const result = await installRecipe(orgId, togafRecipe, null)
    expect(result.taxonomyTypes).toBe(2)

    const domain = await typeBySlug('togaf-architecture-domain')
    expect(domain.audience).toBe('framework')
    expect(await childCount(domain.id)).toBe(4)
    expect(await bindingsFor(domain.id)).toEqual(['application:multi', 'capability:multi'])

    const adm = await typeBySlug('togaf-adm-phase')
    expect(adm.audience).toBe('framework')
    expect(await childCount(adm.id)).toBe(10) // Preliminary + A–H + Requirements Management
    expect(await bindingsFor(adm.id)).toEqual(['capability:single', 'initiative:single'])
  })

  it('installs TOGAF glossary terms and principles', async () => {
    const gloss = await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))
    expect(gloss.some(g => g.term.startsWith('Architecture Development Method'))).toBe(true)
    const princ = await db.select().from(principles).where(eq(principles.organizationId, orgId))
    expect(princ.some(p => p.name === 'Data Is an Asset')).toBe(true)
  })

  it('is idempotent on re-install (no new rows, counts zero)', async () => {
    const before = {
      tax: (await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))).length,
      gloss: (await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))).length,
      princ: (await db.select().from(principles).where(eq(principles.organizationId, orgId))).length,
    }
    const result = await installRecipe(orgId, togafRecipe, null)
    expect(result).toMatchObject({ taxonomyTypes: 0, taxonomyTerms: 0, bindings: 0, glossaryTerms: 0, principles: 0 })
    const after = {
      tax: (await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.organizationId, orgId))).length,
      gloss: (await db.select().from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId))).length,
      princ: (await db.select().from(principles).where(eq(principles.organizationId, orgId))).length,
    }
    expect(after).toEqual(before)
  })
})
