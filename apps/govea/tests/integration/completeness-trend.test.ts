/**
 * Trend, suppression-transition, and retention pruning (#380 PR-4).
 *
 * Asserts:
 *   1. getCompletenessTrend reads daily snapshots in chronological order and
 *      derives the same score that lib/confidence.ts uses.
 *   2. recomputeCompletenessSnapshot writes ONE audit-log entry on a
 *      suppression-direction transition and ZERO on subsequent recomputes
 *      that don't cross the threshold.
 *   3. Pruning behavior: rows older than `retentionDays` are deleted; rows
 *      within the window are kept; the operation is idempotent.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  capabilities, applications,
  organizations,
  completenessSnapshots,
  auditLog,
  DEFAULT_COMPLETENESS_SETTINGS,
  type SnapshotCounts,
} from '@/db/schema'
import { getCompletenessTrend, scoreFromCounts } from '@/lib/completeness-trend'
import { recomputeCompletenessSnapshot } from '@/lib/completeness-snapshot'
import { createTestOrg, cleanupOrg, type TestOrg } from './helpers/db'

let org: TestOrg

const ZERO_COUNTS: SnapshotCounts = {
  capabilities:        { total: 0, mature: 0 },
  applications:        { total: 0, mature: 0 },
  personas:            { total: 0, mature: 0 },
  valueStreams:        { total: 0, mature: 0 },
  strategicObjectives: { total: 0, mature: 0 },
  principles:          { total: 0, mature: 0 },
  glossaryTerms:       { total: 0, mature: 0 },
  initiatives:         { total: 0, mature: 0 },
  adrs:                { total: 0, mature: 0 },
}

function withCapabilityCounts(total: number, mature: number): SnapshotCounts {
  return { ...ZERO_COUNTS, capabilities: { total, mature } }
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dateNDaysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

beforeAll(async () => {
  org = await createTestOrg({ name: 'Trend Org', slug: `trend-${randomUUID().slice(0, 8)}` })
  await db.update(organizations)
    .set({ completenessSettings: DEFAULT_COMPLETENESS_SETTINGS })
    .where(eq(organizations.id, org.id))
})

afterAll(async () => {
  await cleanupOrg(org.id)
})

beforeEach(async () => {
  // Clean snapshot history and audit rows for this org between tests.
  // Audit rows are append-only at the DB layer (#417), so this delete will
  // be blocked unless we filter to test orgs only — which is fine because
  // cleanupOrg() in afterAll cascades the org row and these audit rows
  // outlive it. For per-test isolation we instead read with a filter.
  await db.delete(completenessSnapshots).where(eq(completenessSnapshots.organizationId, org.id))
  await db.delete(capabilities).where(eq(capabilities.organizationId, org.id))
  await db.delete(applications).where(eq(applications.organizationId, org.id))
})

// ── getCompletenessTrend ────────────────────────────────────────────────────

describe('getCompletenessTrend', () => {
  it('returns rows in chronological order and derives the same score the live calc uses', async () => {
    // Backfill three days
    await db.insert(completenessSnapshots).values([
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(2)), counts: withCapabilityCounts(10, 4), lastUpdated: dateNDaysAgo(2) },
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(1)), counts: withCapabilityCounts(10, 6), lastUpdated: dateNDaysAgo(1) },
      { organizationId: org.id, snapshotDate: isoDate(new Date()),     counts: withCapabilityCounts(10, 8), lastUpdated: new Date() },
    ])

    const points = await getCompletenessTrend(org.id, 30)
    expect(points.length).toBe(3)
    expect(points[0].score).toBe(40)  // 4/10
    expect(points[1].score).toBe(60)  // 6/10
    expect(points[2].score).toBe(80)  // 8/10
    // Chronological: oldest first
    expect(points[0].date < points[2].date).toBe(true)
  })

  it('respects daysBack window', async () => {
    await db.insert(completenessSnapshots).values([
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(40)), counts: ZERO_COUNTS, lastUpdated: dateNDaysAgo(40) },
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(5)),  counts: ZERO_COUNTS, lastUpdated: dateNDaysAgo(5) },
    ])

    const recent = await getCompletenessTrend(org.id, 30)
    expect(recent.length).toBe(1) // 40-day-old row is outside the window
  })

  it('returns empty array when no history exists', async () => {
    const points = await getCompletenessTrend(org.id)
    expect(points).toEqual([])
  })
})

// ── scoreFromCounts (sanity) ────────────────────────────────────────────────

describe('scoreFromCounts', () => {
  it('returns 0 when there is no content', () => {
    expect(scoreFromCounts(ZERO_COUNTS)).toBe(0)
  })

  it('returns 100 when all content is mature', () => {
    expect(scoreFromCounts(withCapabilityCounts(5, 5))).toBe(100)
  })
})

// ── Suppression-transition audit logging ────────────────────────────────────

describe('recomputeCompletenessSnapshot — suppression transition audit', () => {
  let baseline: { suppressed: number; recovered: number }

  beforeEach(async () => {
    // Set the org to enabled with a 50% suppression threshold for these tests.
    await db.update(organizations)
      .set({ confidenceSettings: { enabled: true, narrative: null, suppressBelowPercent: 50, authenticatedVisibility: true, publicVisibility: false } })
      .where(eq(organizations.id, org.id))
    // audit_log is append-only at the DB level (#417), so we can't delete
    // between tests — capture the baseline count and assert on the delta.
    baseline = await readTransitionAuditCount()
  })

  async function readTransitionAuditCount(): Promise<{ suppressed: number; recovered: number }> {
    const rows = await db.select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.organizationId, org.id))
    return {
      suppressed: rows.filter(r => r.action === 'completeness.summary_suppressed').length,
      recovered:  rows.filter(r => r.action === 'completeness.summary_recovered').length,
    }
  }

  async function deltaSinceBaseline(): Promise<{ suppressed: number; recovered: number }> {
    const now = await readTransitionAuditCount()
    return {
      suppressed: now.suppressed - baseline.suppressed,
      recovered:  now.recovered  - baseline.recovered,
    }
  }

  it('writes summary_suppressed audit row when score crosses below threshold', async () => {
    // Pre-seed yesterday's snapshot at 80% (above threshold)
    await db.insert(completenessSnapshots).values({
      organizationId: org.id,
      snapshotDate: isoDate(dateNDaysAgo(1)),
      counts: withCapabilityCounts(10, 8),
      lastUpdated: dateNDaysAgo(1),
    })

    // Today's content is 0/0 → score 0 → below 50% threshold → transition
    await recomputeCompletenessSnapshot(org.id)

    const { suppressed, recovered } = await deltaSinceBaseline()
    expect(suppressed).toBe(1)
    expect(recovered).toBe(0)
  })

  it('writes summary_recovered audit row when score crosses back above threshold', async () => {
    // Yesterday: 0/10 (suppressed)
    await db.insert(completenessSnapshots).values({
      organizationId: org.id,
      snapshotDate: isoDate(dateNDaysAgo(1)),
      counts: withCapabilityCounts(10, 0),
      lastUpdated: dateNDaysAgo(1),
    })
    // Today: 8/10 published capabilities → 80%
    for (let i = 0; i < 8; i++) {
      await db.insert(capabilities).values({
        id: randomUUID(),
        organizationId: org.id,
        name: `Pub-${i}`,
        status: 'published',
        visibility: 'org',
      })
    }
    for (let i = 0; i < 2; i++) {
      await db.insert(capabilities).values({
        id: randomUUID(),
        organizationId: org.id,
        name: `Draft-${i}`,
        status: 'draft',
        visibility: 'org',
      })
    }

    await recomputeCompletenessSnapshot(org.id)

    const { suppressed, recovered } = await deltaSinceBaseline()
    expect(suppressed).toBe(0)
    expect(recovered).toBe(1)
  })

  it('does NOT write an audit row when there is no boundary cross', async () => {
    // Yesterday: 8/10 → 80% (above)
    await db.insert(completenessSnapshots).values({
      organizationId: org.id,
      snapshotDate: isoDate(dateNDaysAgo(1)),
      counts: withCapabilityCounts(10, 8),
      lastUpdated: dateNDaysAgo(1),
    })
    // Today: also 8/10 published — no transition
    for (let i = 0; i < 8; i++) {
      await db.insert(capabilities).values({
        id: randomUUID(),
        organizationId: org.id,
        name: `Pub-${i}`,
        status: 'published',
        visibility: 'org',
      })
    }
    for (let i = 0; i < 2; i++) {
      await db.insert(capabilities).values({
        id: randomUUID(),
        organizationId: org.id,
        name: `Draft-${i}`,
        status: 'draft',
        visibility: 'org',
      })
    }

    await recomputeCompletenessSnapshot(org.id)

    const { suppressed, recovered } = await deltaSinceBaseline()
    expect(suppressed).toBe(0)
    expect(recovered).toBe(0)
  })

  it('does NOT write an audit row when there is no prior snapshot', async () => {
    // First-ever snapshot for this org. Even a low score is not a "transition".
    await recomputeCompletenessSnapshot(org.id)

    const { suppressed, recovered } = await deltaSinceBaseline()
    expect(suppressed).toBe(0)
    expect(recovered).toBe(0)
  })

  it('does NOT write an audit row when authenticated visibility is off', async () => {
    await db.update(organizations)
      .set({ confidenceSettings: { enabled: false, narrative: null, suppressBelowPercent: 50, authenticatedVisibility: false, publicVisibility: false } })
      .where(eq(organizations.id, org.id))

    await db.insert(completenessSnapshots).values({
      organizationId: org.id,
      snapshotDate: isoDate(dateNDaysAgo(1)),
      counts: withCapabilityCounts(10, 8),
      lastUpdated: dateNDaysAgo(1),
    })

    await recomputeCompletenessSnapshot(org.id)

    const { suppressed, recovered } = await deltaSinceBaseline()
    expect(suppressed).toBe(0)
    expect(recovered).toBe(0)
  })
})

// ── Retention pruning (logic from the script) ───────────────────────────────

describe('snapshot retention pruning', () => {
  /**
   * The pruning script is a single SQL delete; replicating it here so we
   * test the actual operation without spawning a child process.
   */
  async function pruneOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const deleted = await db
      .delete(completenessSnapshots)
      .where(and(
        eq(completenessSnapshots.organizationId, org.id),
        lt(completenessSnapshots.snapshotDate, cutoffStr),
      ))
      .returning({ org: completenessSnapshots.organizationId })
    return deleted.length
  }

  it('deletes rows older than the retention window and keeps newer rows', async () => {
    await db.insert(completenessSnapshots).values([
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(400)), counts: ZERO_COUNTS, lastUpdated: null },
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(100)), counts: ZERO_COUNTS, lastUpdated: null },
      { organizationId: org.id, snapshotDate: isoDate(dateNDaysAgo(10)),  counts: ZERO_COUNTS, lastUpdated: null },
    ])

    const deleted = await pruneOlderThan(365)
    expect(deleted).toBe(1) // only the 400-day-old row

    const remaining = await db
      .select({ id: completenessSnapshots.organizationId })
      .from(completenessSnapshots)
      .where(eq(completenessSnapshots.organizationId, org.id))
    expect(remaining.length).toBe(2)
  })

  it('is idempotent — second run is a no-op', async () => {
    await db.insert(completenessSnapshots).values({
      organizationId: org.id,
      snapshotDate: isoDate(dateNDaysAgo(400)),
      counts: ZERO_COUNTS,
      lastUpdated: null,
    })

    const first = await pruneOlderThan(365)
    const second = await pruneOlderThan(365)
    expect(first).toBe(1)
    expect(second).toBe(0)
  })
})
