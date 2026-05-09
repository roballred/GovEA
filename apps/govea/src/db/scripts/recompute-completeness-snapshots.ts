/**
 * Nightly fallback for the completeness snapshot (#380 PR-1).
 *
 * The primary recompute path is fired from `writeAuditLog` whenever an EA
 * mutation commits. This script catches orgs that didn't mutate that day —
 * without it, an inactive org would never refresh its snapshot row and
 * staleness signals (`updated_at` cutoffs, in PR-3) would slowly drift.
 *
 * Idempotent: safe to run any number of times in a day.
 *
 * Local: `pnpm --filter govea db:recompute-snapshots`
 * Schedule: invoke from a daily cron / Container Apps job.
 */
import { recomputeAllOrgSnapshots } from '../../lib/completeness-snapshot'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('recompute-snapshots: DATABASE_URL is not set')
    process.exit(1)
  }

  const startedAt = Date.now()
  const results = await recomputeAllOrgSnapshots()
  const durationMs = Date.now() - startedAt

  const ok = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)

  console.log(`recompute-snapshots: ${ok}/${results.length} orgs ok in ${durationMs}ms`)
  for (const f of failed) {
    console.error(`recompute-snapshots: org ${f.orgId} failed: ${f.error}`)
  }

  if (failed.length > 0) process.exit(1)
}

main().catch(err => {
  console.error('recompute-snapshots: fatal', err)
  process.exit(1)
})
