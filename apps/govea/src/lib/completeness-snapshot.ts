/**
 * Completeness snapshot recompute (#380 PR-1).
 *
 * Pre-computed snapshot row per (organizationId, snapshotDate) that the
 * confidence summary and (future) drill-down dashboard read from.
 * Per `rm-query-performance-decision.md`, dashboard reads must complete in
 * < 500 ms — a single-row snapshot lookup is the only path that meets that
 * SLO at scale.
 *
 * Recompute is idempotent: it always upserts today's row for the org.
 * Called from:
 *   - mutating server actions, fire-and-forget after the mutation commits
 *   - a nightly fallback job for orgs that didn't mutate that day
 *   - the backfill script on first deploy
 */
import { db } from '@/db/client'
import {
  capabilities, applications, personas, valueStreams,
  strategicObjectives, principles, glossaryTerms, initiatives, adrs,
  completenessSnapshots,
  organizations,
  auditLog,
  type SnapshotCounts,
  type ConfidenceSettings,
} from '@/db/schema'
import { and, count, desc, eq, max, ne, sql } from 'drizzle-orm'
import { scoreFromCounts } from './completeness-trend'

/** UTC date string (YYYY-MM-DD) — Postgres `date` columns are timezone-naive. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export type RecomputedSnapshot = {
  organizationId: string
  snapshotDate: string
  counts: SnapshotCounts
  lastUpdated: Date | null
}

/**
 * Compute today's counts for one org from live tables and upsert the snapshot row.
 * Idempotent — calling twice in a row returns identical data.
 */
export async function recomputeCompletenessSnapshot(orgId: string): Promise<RecomputedSnapshot> {
  const [
    capRows, appRows, personaRows, vsRows, objRows,
    principleRows, glossaryRows, initRows, adrRows,
    latestRows,
  ] = await Promise.all([
    db.select({ status: capabilities.status, count: count() }).from(capabilities)
      .where(eq(capabilities.organizationId, orgId)).groupBy(capabilities.status),
    db.select({ status: applications.status, count: count() }).from(applications)
      .where(eq(applications.organizationId, orgId)).groupBy(applications.status),
    db.select({ status: personas.status, count: count() }).from(personas)
      .where(eq(personas.organizationId, orgId)).groupBy(personas.status),
    db.select({ status: valueStreams.status, count: count() }).from(valueStreams)
      .where(eq(valueStreams.organizationId, orgId)).groupBy(valueStreams.status),
    db.select({ status: strategicObjectives.status, count: count() }).from(strategicObjectives)
      .where(eq(strategicObjectives.organizationId, orgId)).groupBy(strategicObjectives.status),
    db.select({ status: principles.status, count: count() }).from(principles)
      .where(eq(principles.organizationId, orgId)).groupBy(principles.status),
    db.select({ status: glossaryTerms.status, count: count() }).from(glossaryTerms)
      .where(eq(glossaryTerms.organizationId, orgId)).groupBy(glossaryTerms.status),
    db.select({ status: initiatives.status, count: count() }).from(initiatives)
      .where(eq(initiatives.organizationId, orgId)).groupBy(initiatives.status),
    db.select({ status: adrs.status, count: count() }).from(adrs)
      .where(eq(adrs.organizationId, orgId)).groupBy(adrs.status),
    // Latest updatedAt across the five entity types the existing confidence calc considers
    db.select({
      capLatest: max(capabilities.updatedAt),
    }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
  ])

  // Second pass for the other four max() reads — keeping it parallel-friendly
  // but separate to avoid building one giant select.
  const [
    [{ appLatest }],
    [{ personaLatest }],
    [{ vsLatest }],
    [{ initLatest }],
  ] = await Promise.all([
    db.select({ appLatest: max(applications.updatedAt) }).from(applications).where(eq(applications.organizationId, orgId)),
    db.select({ personaLatest: max(personas.updatedAt) }).from(personas).where(eq(personas.organizationId, orgId)),
    db.select({ vsLatest: max(valueStreams.updatedAt) }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
    db.select({ initLatest: max(initiatives.updatedAt) }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
  ])

  const tally = (rows: { status: string; count: number | string }[], matureStatuses: string[]) => {
    let total = 0
    let mature = 0
    for (const r of rows) {
      const n = Number(r.count)
      total += n
      if (matureStatuses.includes(r.status)) mature += n
    }
    return { total, mature }
  }

  const counts: SnapshotCounts = {
    capabilities:        tally(capRows, ['published']),
    applications:        tally(appRows, ['published']),
    personas:            tally(personaRows, ['published']),
    valueStreams:        tally(vsRows, ['published']),
    strategicObjectives: tally(objRows, ['published']),
    principles:          tally(principleRows, ['published']),
    glossaryTerms:       tally(glossaryRows, ['published']),
    initiatives:         tally(initRows, ['active', 'complete']),
    adrs:                tally(adrRows, ['accepted']),
  }

  const dates = [
    latestRows[0]?.capLatest, appLatest, personaLatest, vsLatest, initLatest,
  ].filter((d): d is Date => d != null)
  const lastUpdated = dates.length > 0
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : null

  const snapshotDate = todayUtc()

  // Read the most recent prior snapshot so we can detect a threshold-crossing
  // transition (#380 PR-4 auto-suppression notification). We compare scores
  // and audit-log only on the boundary cross — not on every recompute.
  const [previous, settingsRow] = await Promise.all([
    db.query.completenessSnapshots.findFirst({
      where: and(
        eq(completenessSnapshots.organizationId, orgId),
        ne(completenessSnapshots.snapshotDate, snapshotDate),
      ),
      orderBy: [desc(completenessSnapshots.snapshotDate)],
    }),
    db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { confidenceSettings: true },
    }),
  ])

  await db
    .insert(completenessSnapshots)
    .values({
      organizationId: orgId,
      snapshotDate,
      counts,
      lastUpdated,
    })
    .onConflictDoUpdate({
      target: [completenessSnapshots.organizationId, completenessSnapshots.snapshotDate],
      set: {
        counts,
        lastUpdated,
        computedAt: sql`now()`,
      },
    })

  await maybeAuditSuppressionTransition({
    orgId,
    settings: settingsRow?.confidenceSettings ?? null,
    prevCounts: previous?.counts ?? null,
    currentCounts: counts,
  })

  return { organizationId: orgId, snapshotDate, counts, lastUpdated }
}

/**
 * Audit-log a suppression transition when today's score crosses the
 * `suppressBelowPercent` threshold relative to the previous snapshot.
 *
 *   - "completeness.summary_suppressed" — was ≥ threshold, now < threshold
 *   - "completeness.summary_recovered"  — was < threshold, now ≥ threshold
 *
 * No audit row is written when there is no prior snapshot, when the org has
 * no confidence settings, or when the score did not cross the boundary.
 */
async function maybeAuditSuppressionTransition({
  orgId, settings, prevCounts, currentCounts,
}: {
  orgId: string
  settings: ConfidenceSettings | null
  prevCounts: SnapshotCounts | null
  currentCounts: SnapshotCounts
}) {
  if (!settings || !prevCounts) return
  // Only meaningful when the summary is actually published to someone.
  // If neither audience visibility is on, suppression is a no-op operationally.
  const enabled = settings.authenticatedVisibility ?? settings.enabled
  if (!enabled) return

  const threshold = settings.suppressBelowPercent
  const prevScore = scoreFromCounts(prevCounts)
  const currentScore = scoreFromCounts(currentCounts)

  const wasShown = prevScore >= threshold
  const nowShown = currentScore >= threshold

  if (wasShown === nowShown) return // no boundary cross

  const action = nowShown
    ? 'completeness.summary_recovered'
    : 'completeness.summary_suppressed'

  await db.insert(auditLog).values({
    action,
    entityType: 'organization',
    entityId: orgId,
    organizationId: orgId,
    userId: null, // system event — no user actor
    metadata: {
      previousScore: prevScore,
      currentScore,
      threshold,
    },
  })
}

/** Recompute snapshots for every organization. Used by the nightly fallback and the backfill. */
export async function recomputeAllOrgSnapshots(): Promise<{ orgId: string; ok: boolean; error?: string }[]> {
  const orgs = await db.select({ id: organizations.id }).from(organizations)
  const results: { orgId: string; ok: boolean; error?: string }[] = []
  for (const { id } of orgs) {
    try {
      await recomputeCompletenessSnapshot(id)
      results.push({ orgId: id, ok: true })
    } catch (err) {
      results.push({ orgId: id, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return results
}

/**
 * Read today's snapshot. Returns null if no snapshot exists yet (first day for this org;
 * the caller should fall back to recompute or live calc).
 */
export async function readTodayCompletenessSnapshot(orgId: string) {
  const rows = await db
    .select()
    .from(completenessSnapshots)
    .where(and(
      eq(completenessSnapshots.organizationId, orgId),
      eq(completenessSnapshots.snapshotDate, todayUtc()),
    ))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Fire-and-forget snapshot trigger. Server actions call this after a mutation commits.
 * Errors are logged and swallowed — the snapshot is an analytics view, not part of
 * the user-facing transaction. Nightly fallback corrects any misses.
 *
 * In tests, awaiting the returned promise produces a deterministic snapshot.
 */
export function triggerSnapshotRecompute(orgId: string): Promise<void> {
  return recomputeCompletenessSnapshot(orgId)
    .then(() => undefined)
    .catch((err) => {
      console.error('[completeness-snapshot] recompute failed', { orgId, err })
    })
}

