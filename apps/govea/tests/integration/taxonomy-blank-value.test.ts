/**
 * Regression tests: syncEntityTaxonomyValues drops blank / malformed term IDs (#631)
 *
 * Production bug: Application save crashed with
 *   `invalid input syntax for type uuid: ""`
 * because optional single-select taxonomy fields submit `taxonomyTermIds=""`
 * (the "— None —" option's value) and the helper inserted the empty string
 * straight into the `uuid` column. Fix lives in `syncEntityTaxonomyValues` so
 * every entity type that uses optional taxonomy benefits.
 *
 * Capability: cm-taxonomy-management
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  taxonomyTerms, entityTaxonomyValues, applications,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  sanitizeTaxonomyTermIds,
  syncEntityTaxonomyValues,
} from '@/lib/entity-taxonomy-helpers'
import { createTestOrg, cleanupOrg } from './helpers/db'

const VALID_UUID = '11111111-2222-3333-4444-555555555555'
const ANOTHER_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('sanitizeTaxonomyTermIds (#631)', () => {
  it('drops empty strings', () => {
    expect(sanitizeTaxonomyTermIds([''])).toEqual([])
    expect(sanitizeTaxonomyTermIds([VALID_UUID, ''])).toEqual([VALID_UUID])
  })

  it('drops whitespace-only values', () => {
    expect(sanitizeTaxonomyTermIds(['   ', VALID_UUID])).toEqual([VALID_UUID])
  })

  it('trims surrounding whitespace on valid UUIDs', () => {
    expect(sanitizeTaxonomyTermIds([`  ${VALID_UUID}  `])).toEqual([VALID_UUID])
  })

  it('drops malformed values that are not UUIDs', () => {
    expect(sanitizeTaxonomyTermIds(['not-a-uuid', VALID_UUID])).toEqual([VALID_UUID])
    expect(sanitizeTaxonomyTermIds(['12345', '', VALID_UUID, ''])).toEqual([VALID_UUID])
  })

  it('preserves all valid UUIDs and their order', () => {
    expect(sanitizeTaxonomyTermIds([VALID_UUID, ANOTHER_UUID])).toEqual([VALID_UUID, ANOTHER_UUID])
  })

  it('accepts upper-case UUIDs (case-insensitive)', () => {
    expect(sanitizeTaxonomyTermIds([VALID_UUID.toUpperCase()])).toEqual([VALID_UUID.toUpperCase()])
  })

  it('handles an empty input array', () => {
    expect(sanitizeTaxonomyTermIds([])).toEqual([])
  })

  it('handles input that is entirely blank', () => {
    expect(sanitizeTaxonomyTermIds(['', '   ', ''])).toEqual([])
  })
})

describe('syncEntityTaxonomyValues (#631 integration)', () => {
  let orgId: string
  let applicationId: string
  let termIdA: string
  let termIdB: string

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id

    // Seed one application to attach taxonomy rows to.
    const [app] = await db.insert(applications).values({
      id: randomUUID(),
      organizationId: orgId,
      name: 'Test App for #631',
    }).returning()
    applicationId = app.id

    // Seed two taxonomy terms so we have real UUIDs to verify round-trip
    // behaviour. The FK on entity_taxonomy_values.taxonomy_term_id refuses
    // arbitrary UUIDs, so the test must reference actual term rows.
    const [t1, t2] = await Promise.all([
      db.insert(taxonomyTerms).values({
        id: randomUUID(),
        organizationId: orgId,
        name: 'Test Tier 1',
        slug: 'test-tier-1',
      }).returning().then(rows => rows[0]),
      db.insert(taxonomyTerms).values({
        id: randomUUID(),
        organizationId: orgId,
        name: 'Test Tier 2',
        slug: 'test-tier-2',
      }).returning().then(rows => rows[0]),
    ])
    termIdA = t1.id
    termIdB = t2.id
  })

  afterAll(() => cleanupOrg(orgId))

  async function readTermsFor(entityId: string): Promise<string[]> {
    const rows = await db.select().from(entityTaxonomyValues).where(
      and(
        eq(entityTaxonomyValues.organizationId, orgId),
        eq(entityTaxonomyValues.entityType, 'application'),
        eq(entityTaxonomyValues.entityId, entityId),
      ),
    )
    return rows.map(r => r.taxonomyTermId).sort()
  }

  it('accepts a fully-empty term list (the "no taxonomy selected" case) without throwing', async () => {
    await expect(
      db.transaction(tx => syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, [])),
    ).resolves.not.toThrow()
    expect(await readTermsFor(applicationId)).toEqual([])
  })

  it('accepts a list containing only blank strings without throwing (#631 reproducer)', async () => {
    // This is the literal payload Application edit was sending. Pre-fix this
    // threw `invalid input syntax for type uuid: ""`.
    await expect(
      db.transaction(tx => syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, [''])),
    ).resolves.not.toThrow()
    expect(await readTermsFor(applicationId)).toEqual([])
  })

  it('inserts valid term IDs and skips blanks in the same call', async () => {
    await db.transaction(tx =>
      syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, ['', termIdA, '', termIdB]),
    )
    expect(await readTermsFor(applicationId)).toEqual([termIdA, termIdB].sort())
  })

  it('replaces existing rows on subsequent calls — including replace-with-empty', async () => {
    // After the previous test, the entity carries two term rows. Replacing
    // with [''] should clear them and not crash.
    await db.transaction(tx =>
      syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, ['']),
    )
    expect(await readTermsFor(applicationId)).toEqual([])
  })

  it('drops malformed (non-UUID) inputs without throwing', async () => {
    await db.transaction(tx =>
      syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, ['not-a-uuid', termIdA]),
    )
    expect(await readTermsFor(applicationId)).toEqual([termIdA])
  })
})
