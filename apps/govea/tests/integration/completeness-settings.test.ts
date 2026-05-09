/**
 * Completeness + confidence settings (#380 PR-2).
 *
 * Asserts:
 *   1. Default `completenessSettings` for new orgs preserves the prior
 *      hardcoded 90-day staleness behavior.
 *   2. `getConfidenceSummary(orgId, audience)` honors authenticatedVisibility
 *      vs publicVisibility independently. Legacy rows with only `enabled` set
 *      still work for the 'authenticated' audience.
 *   3. Public visibility never inherits from `enabled` — it must be explicit.
 *   4. The DEFAULT_COMPLETENESS_SETTINGS export is what the dashboard falls
 *      back to when an org has no settings row.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  organizations,
  DEFAULT_COMPLETENESS_SETTINGS,
} from '@/db/schema'
import { getConfidenceSummary, isVisibleToAudience } from '@/lib/confidence'
import { createTestOrg, cleanupOrg, type TestOrg } from './helpers/db'

let org: TestOrg

beforeAll(async () => {
  org = await createTestOrg({ name: 'Settings Org', slug: `set-${randomUUID().slice(0, 8)}` })
})

afterAll(async () => {
  await cleanupOrg(org.id)
})

describe('DEFAULT_COMPLETENESS_SETTINGS', () => {
  it('preserves the prior 90-day staleness behavior', () => {
    expect(DEFAULT_COMPLETENESS_SETTINGS.stalenessDays).toBe(90)
  })

  it('starts with no domain targets (PR-3 introduces them)', () => {
    expect(DEFAULT_COMPLETENESS_SETTINGS.domainTargets).toEqual({})
  })

  it('has sensible ranking weights', () => {
    expect(DEFAULT_COMPLETENESS_SETTINGS.rankingWeights.publishedButStale).toBeGreaterThan(0)
    expect(DEFAULT_COMPLETENESS_SETTINGS.rankingWeights.incompleteRelationship).toBeGreaterThan(0)
    expect(DEFAULT_COMPLETENESS_SETTINGS.rankingWeights.unpublished).toBeGreaterThan(0)
  })
})

describe('isVisibleToAudience', () => {
  it('returns enabled for authenticated audience on legacy rows (no visibility split)', () => {
    expect(isVisibleToAudience(
      { enabled: true, narrative: null, suppressBelowPercent: 0 },
      'authenticated',
    )).toBe(true)
    expect(isVisibleToAudience(
      { enabled: false, narrative: null, suppressBelowPercent: 0 },
      'authenticated',
    )).toBe(false)
  })

  it('public is always false on legacy rows (never inherits from enabled)', () => {
    expect(isVisibleToAudience(
      { enabled: true, narrative: null, suppressBelowPercent: 0 },
      'public',
    )).toBe(false)
  })

  it('honors authenticatedVisibility over enabled when both present', () => {
    expect(isVisibleToAudience(
      { enabled: true, narrative: null, suppressBelowPercent: 0, authenticatedVisibility: false },
      'authenticated',
    )).toBe(false)
    expect(isVisibleToAudience(
      { enabled: false, narrative: null, suppressBelowPercent: 0, authenticatedVisibility: true },
      'authenticated',
    )).toBe(true)
  })

  it('public visibility is independent of authenticated visibility at the helper level', () => {
    // The helper itself returns whatever the field says — the UI / save action
    // are responsible for the "public requires authenticated" coupling.
    expect(isVisibleToAudience(
      { enabled: false, narrative: null, suppressBelowPercent: 0, publicVisibility: true },
      'public',
    )).toBe(true)
  })
})

describe('getConfidenceSummary audience parameter', () => {
  it('returns shouldShow=false when public visibility is off', async () => {
    await db.update(organizations)
      .set({
        confidenceSettings: {
          enabled: true,
          narrative: null,
          suppressBelowPercent: 0,
          authenticatedVisibility: true,
          publicVisibility: false,
        },
      })
      .where(eq(organizations.id, org.id))

    const auth = await getConfidenceSummary(org.id, 'authenticated')
    const pub = await getConfidenceSummary(org.id, 'public')
    expect(auth.shouldShow).toBe(true) // org has 0 content; suppressBelowPercent=0 → shouldShow=true
    expect(pub.shouldShow).toBe(false)
  })

  it('returns shouldShow=true for public when both flags are on', async () => {
    await db.update(organizations)
      .set({
        confidenceSettings: {
          enabled: true,
          narrative: null,
          suppressBelowPercent: 0,
          authenticatedVisibility: true,
          publicVisibility: true,
        },
      })
      .where(eq(organizations.id, org.id))

    const pub = await getConfidenceSummary(org.id, 'public')
    expect(pub.shouldShow).toBe(true)
  })

  it('legacy enabled=true row remains visible to authenticated callers', async () => {
    await db.update(organizations)
      .set({
        confidenceSettings: {
          enabled: true,
          narrative: null,
          suppressBelowPercent: 0,
          // No authenticatedVisibility / publicVisibility — legacy row shape
        },
      })
      .where(eq(organizations.id, org.id))

    const auth = await getConfidenceSummary(org.id, 'authenticated')
    expect(auth.shouldShow).toBe(true)

    const pub = await getConfidenceSummary(org.id, 'public')
    expect(pub.shouldShow).toBe(false) // legacy row never implicitly grants public access
  })

  it('default audience is authenticated', async () => {
    await db.update(organizations)
      .set({
        confidenceSettings: {
          enabled: true,
          narrative: null,
          suppressBelowPercent: 0,
          authenticatedVisibility: true,
          publicVisibility: false,
        },
      })
      .where(eq(organizations.id, org.id))

    const defaultCall = await getConfidenceSummary(org.id)
    const explicitAuth = await getConfidenceSummary(org.id, 'authenticated')
    expect(defaultCall.shouldShow).toBe(explicitAuth.shouldShow)
  })
})
