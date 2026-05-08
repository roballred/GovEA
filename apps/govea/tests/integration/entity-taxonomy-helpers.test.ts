/**
 * Lock in the architecture from #427.
 *
 * The entity-taxonomy helpers (getEntityTaxonomyDefinitions,
 * getAllEntityTaxonomyDefinitions, getEntityTaxonomyValues,
 * syncEntityTaxonomyValues, getEntityTaxonomyValuesForMany) MUST live in
 * lib/ — not actions/ — so they cannot be reached as 'use server' RPC
 * endpoints. If a future change re-exports them from actions/, this test
 * fails.
 */
import { vi, describe, it, expect } from 'vitest'

// auth() is mocked because importing actions/taxonomy transitively pulls in
// next-auth, which has Node-only resolution that breaks in vitest without a
// mock. We never call auth() in this file.
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('entity-taxonomy-helpers placement (#427)', () => {
  it('helpers are exported from lib/entity-taxonomy-helpers', async () => {
    const lib = await import('@/lib/entity-taxonomy-helpers')
    expect(typeof lib.getEntityTaxonomyDefinitions).toBe('function')
    expect(typeof lib.getAllEntityTaxonomyDefinitions).toBe('function')
    expect(typeof lib.getEntityTaxonomyValues).toBe('function')
    expect(typeof lib.syncEntityTaxonomyValues).toBe('function')
    expect(typeof lib.getEntityTaxonomyValuesForMany).toBe('function')
  })

  it('actions/taxonomy no longer exports the entity-taxonomy helpers', async () => {
    const actions = await import('@/actions/taxonomy')
    // 'use server' RPC modules must NOT expose internal helpers — those
    // would otherwise become network-callable endpoints.
    expect(actions).not.toHaveProperty('getEntityTaxonomyDefinitions')
    expect(actions).not.toHaveProperty('getAllEntityTaxonomyDefinitions')
    expect(actions).not.toHaveProperty('getEntityTaxonomyValues')
    expect(actions).not.toHaveProperty('syncEntityTaxonomyValues')
    expect(actions).not.toHaveProperty('getEntityTaxonomyValuesForMany')
  })
})
