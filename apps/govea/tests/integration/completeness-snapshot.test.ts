/**
 * Completeness snapshot foundation (#380 PR-1).
 *
 * Asserts the contract this PR establishes:
 *   1. Recompute writes exactly one row per (orgId, today) regardless of how
 *      many times it runs — idempotency.
 *   2. The snapshot's mature/total counts match what the live confidence
 *      calc produces (the no-behavior-change requirement when the snapshot
 *      flag is off).
 *   3. With the feature flag on, getConfidenceSummary reads from the snapshot
 *      and produces the same summary as the live calc.
 *   4. With the feature flag on but no snapshot row for today, getConfidenceSummary
 *      falls back to live calc and fires an async recompute.
 *   5. recomputeAllOrgSnapshots covers every org in the DB.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  capabilities, applications, personas, valueStreams,
  strategicObjectives, principles, glossaryTerms, initiatives, adrs,
  completenessSnapshots,
  organizations,
} from '@/db/schema'
import {
  recomputeCompletenessSnapshot,
  recomputeAllOrgSnapshots,
  readTodayCompletenessSnapshot,
} from '@/lib/completeness-snapshot'
import { getConfidenceSummary } from '@/lib/confidence'
import { createTestOrg, cleanupOrg, type TestOrg } from './helpers/db'

const ENABLED_CONFIDENCE = {
  enabled: true,
  narrative: null,
  suppressBelowPercent: 0,
}

let org: TestOrg

async function seedOrgContent(orgId: string) {
  // 3 capabilities (2 published), 2 applications (1 published), 1 ADR (accepted),
  // 1 initiative (active). Score = 5 mature / 7 total ≈ 71% → 'actively maintained'.
  await db.insert(capabilities).values([
    { id: randomUUID(), organizationId: orgId, name: 'C1', status: 'published', visibility: 'org' },
    { id: randomUUID(), organizationId: orgId, name: 'C2', status: 'published', visibility: 'org' },
    { id: randomUUID(), organizationId: orgId, name: 'C3', status: 'draft',     visibility: 'org' },
  ])
  await db.insert(applications).values([
    { id: randomUUID(), organizationId: orgId, name: 'A1', status: 'published', visibility: 'org' },
    { id: randomUUID(), organizationId: orgId, name: 'A2', status: 'draft',     visibility: 'org' },
  ])
  await db.insert(adrs).values([
    { id: randomUUID(), organizationId: orgId, number: 'ADR-1', title: 'T', status: 'accepted', visibility: 'org' },
  ])
  await db.insert(initiatives).values([
    { id: randomUUID(), organizationId: orgId, name: 'I1', status: 'active', visibility: 'org' },
  ])
}

beforeAll(async () => {
  org = await createTestOrg({ name: 'Snapshot Org', slug: `snap-${randomUUID().slice(0, 8)}` })
  await seedOrgContent(org.id)
  // Mark the org's confidenceSettings enabled so getConfidenceSummary returns real data
  await db
    .update(organizations)
    .set({ confidenceSettings: ENABLED_CONFIDENCE })
    .where(eq(organizations.id, org.id))
})

afterAll(async () => {
  await cleanupOrg(org.id)
})

beforeEach(async () => {
  // Snapshot rows belong to the org being torn down at end of run, but we want
  // each test to start with a known-clean snapshot state for today.
  await db.delete(completenessSnapshots).where(eq(completenessSnapshots.organizationId, org.id))
})

describe('recomputeCompletenessSnapshot', () => {
  it('writes a single row per (orgId, today)', async () => {
    await recomputeCompletenessSnapshot(org.id)
    await recomputeCompletenessSnapshot(org.id) // idempotent
    await recomputeCompletenessSnapshot(org.id)

    const rows = await db
      .select()
      .from(completenessSnapshots)
      .where(eq(completenessSnapshots.organizationId, org.id))

    expect(rows).toHaveLength(1)
  })

  it('produces counts that match the seeded content', async () => {
    await recomputeCompletenessSnapshot(org.id)
    const snap = await readTodayCompletenessSnapshot(org.id)
    expect(snap).not.toBeNull()
    const c = snap!.counts
    expect(c.capabilities).toEqual({ total: 3, mature: 2 })
    expect(c.applications).toEqual({ total: 2, mature: 1 })
    expect(c.adrs).toEqual({ total: 1, mature: 1 })
    expect(c.initiatives).toEqual({ total: 1, mature: 1 })
    // Untouched entities
    expect(c.personas).toEqual({ total: 0, mature: 0 })
    expect(c.valueStreams).toEqual({ total: 0, mature: 0 })
  })

  it('updates computedAt on subsequent recomputes', async () => {
    await recomputeCompletenessSnapshot(org.id)
    const first = await readTodayCompletenessSnapshot(org.id)
    expect(first).not.toBeNull()

    // Add a new capability to confirm the second pass picks it up
    await db.insert(capabilities).values({
      id: randomUUID(), organizationId: org.id, name: 'C4', status: 'published', visibility: 'org',
    })
    // Tiny delay so computedAt differs
    await new Promise(r => setTimeout(r, 10))
    await recomputeCompletenessSnapshot(org.id)

    const second = await readTodayCompletenessSnapshot(org.id)
    expect(second).not.toBeNull()
    expect(second!.counts.capabilities).toEqual({ total: 4, mature: 3 })
    expect(second!.computedAt.getTime()).toBeGreaterThan(first!.computedAt.getTime())
  })
})

describe('recomputeAllOrgSnapshots', () => {
  it('returns ok for every org in the DB and includes our test org', async () => {
    const results = await recomputeAllOrgSnapshots()
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.ok)).toBe(true)

    const ours = results.find(r => r.orgId === org.id)
    expect(ours?.ok).toBe(true)

    const snap = await readTodayCompletenessSnapshot(org.id)
    expect(snap).not.toBeNull()
  })
})

describe('getConfidenceSummary feature-flag behavior', () => {
  const originalFlag = process.env.COMPLETENESS_SNAPSHOT_ENABLED

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.COMPLETENESS_SNAPSHOT_ENABLED
    else process.env.COMPLETENESS_SNAPSHOT_ENABLED = originalFlag
  })

  it('flag off → live calc; result matches snapshot calc', async () => {
    delete process.env.COMPLETENESS_SNAPSHOT_ENABLED
    const live = await getConfidenceSummary(org.id)

    await recomputeCompletenessSnapshot(org.id)
    process.env.COMPLETENESS_SNAPSHOT_ENABLED = 'true'
    const fromSnapshot = await getConfidenceSummary(org.id)

    expect(live.score).toBe(fromSnapshot.score)
    expect(live.label).toBe(fromSnapshot.label)
    expect(live.shouldShow).toBe(fromSnapshot.shouldShow)
  })

  it('flag on but no snapshot row → falls back to live calc and triggers async recompute', async () => {
    process.env.COMPLETENESS_SNAPSHOT_ENABLED = 'true'
    // No snapshot row for today (beforeEach deleted it)

    const summary = await getConfidenceSummary(org.id)
    expect(summary.score).toBeGreaterThan(0)
    expect(summary.label).toBe('actively maintained')

    // The fire-and-forget recompute eventually populates today's snapshot.
    // Poll briefly — recompute should finish within a few ms on a small org.
    let snap: Awaited<ReturnType<typeof readTodayCompletenessSnapshot>> | null = null
    for (let i = 0; i < 20 && snap == null; i++) {
      await new Promise(r => setTimeout(r, 25))
      snap = await readTodayCompletenessSnapshot(org.id)
    }
    expect(snap).not.toBeNull()
  })
})

// Suppress unused-import lint for entity tables we only reference indirectly
void [personas, valueStreams, strategicObjectives, principles, glossaryTerms, and]
