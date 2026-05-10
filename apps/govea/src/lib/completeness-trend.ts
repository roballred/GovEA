/**
 * Completeness trend reads (#380 PR-4).
 *
 * Reads the completeness_snapshots time-series for an org and derives the
 * aggregate score per row — the same mature/total math used by the live
 * confidence summary. Returned in chronological order so a sparkline can
 * render directly.
 *
 * Per `rm-query-performance-decision.md`, the trend-line SLO is < 1 s; a
 * 90-day pull at one row per day is 90 rows of small JSON, indexed on
 * `(organization_id, snapshot_date DESC)` from PR-1.
 */
import { db } from '@/db/client'
import { completenessSnapshots, type SnapshotCounts } from '@/db/schema'
import { and, desc, eq, gte } from 'drizzle-orm'

export interface TrendPoint {
  date: string // ISO date (YYYY-MM-DD)
  score: number // 0–100
}

export function scoreFromCounts(counts: SnapshotCounts): number {
  const totalAll =
    counts.capabilities.total + counts.applications.total + counts.personas.total +
    counts.valueStreams.total + counts.strategicObjectives.total + counts.initiatives.total +
    counts.adrs.total + counts.principles.total + counts.glossaryTerms.total

  const totalMature =
    counts.capabilities.mature + counts.applications.mature + counts.personas.mature +
    counts.valueStreams.mature + counts.strategicObjectives.mature + counts.initiatives.mature +
    counts.adrs.mature + counts.principles.mature + counts.glossaryTerms.mature

  return totalAll === 0 ? 0 : Math.round((totalMature / totalAll) * 100)
}

/**
 * Returns the trend series for the org, oldest first. Limited by `daysBack`
 * (default 90 to match the dashboard's recent-history window).
 */
export async function getCompletenessTrend(orgId: string, daysBack = 90): Promise<TrendPoint[]> {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const rows = await db
    .select({
      snapshotDate: completenessSnapshots.snapshotDate,
      counts: completenessSnapshots.counts,
    })
    .from(completenessSnapshots)
    .where(and(
      eq(completenessSnapshots.organizationId, orgId),
      gte(completenessSnapshots.snapshotDate, cutoffStr),
    ))
    .orderBy(desc(completenessSnapshots.snapshotDate))

  // Reverse to chronological order for the sparkline
  return rows.reverse().map(r => ({
    date: r.snapshotDate,
    score: scoreFromCounts(r.counts),
  }))
}
