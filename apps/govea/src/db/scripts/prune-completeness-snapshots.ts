/**
 * Snapshot retention pruning (#380 PR-4).
 *
 * Per `rm-query-performance-decision.md`:
 *   "One snapshot row per organization per day. Each row stores aggregate
 *    counts only (no individual object data). Retention is 36 months by
 *    default, configurable."
 *
 * Deletes rows older than the retention window. Idempotent — safe to run
 * any number of times in a day. Default 36 months; override via
 * `--days N` or `SNAPSHOT_RETENTION_DAYS` env.
 *
 * Local: `pnpm --filter govea db:prune-snapshots`
 * Schedule: monthly via cron / Container Apps job is plenty.
 */
import { lt } from 'drizzle-orm'
import { db } from '../client'
import { completenessSnapshots } from '../schema'

function resolveRetentionDays(): number {
  const flagIdx = process.argv.indexOf('--days')
  if (flagIdx !== -1) {
    const v = Number(process.argv[flagIdx + 1])
    if (Number.isFinite(v) && v > 0) return v
  }
  if (process.env.SNAPSHOT_RETENTION_DAYS) {
    const v = Number(process.env.SNAPSHOT_RETENTION_DAYS)
    if (Number.isFinite(v) && v > 0) return v
  }
  return 36 * 30 // ~36 months
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('prune-snapshots: DATABASE_URL is not set')
    process.exit(1)
  }

  const retentionDays = resolveRetentionDays()
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const startedAt = Date.now()
  const deleted = await db
    .delete(completenessSnapshots)
    .where(lt(completenessSnapshots.snapshotDate, cutoffStr))
    .returning({ org: completenessSnapshots.organizationId })

  const durationMs = Date.now() - startedAt
  console.log(
    `prune-snapshots: deleted ${deleted.length} rows older than ${cutoffStr} `
    + `(retention=${retentionDays}d) in ${durationMs}ms`,
  )
}

main().catch(err => {
  console.error('prune-snapshots: fatal', err)
  process.exit(1)
})
