/**
 * Applies the @govcore/schema platform migrations (the `govcore` Postgres schema:
 * organizations, users, audit, federation, support, instance/platform config)
 * via the core `govcore-migrate` runner. Phase 1b of the GovCore cutover (#900).
 *
 * Run BEFORE `db:push`: `govcore-migrate` creates the `govcore.*` platform tables
 * so the app's `public` domain tables (whose FKs reference `govcore.organizations`)
 * can be created by `db:push` afterwards. The two migration streams never overlap
 * — `drizzle.config.ts` sets `schemaFilter: ['public']` so `db:push` leaves the
 * `govcore` schema to this runner.
 *
 * This applies the full core migration set, including `0001_platform_security`
 * (RLS + the append-only audit trigger). The RLS policies are inert until #896
 * introduces a non-superuser runtime role — superusers (the current owner pool,
 * and CI's `postgres`) bypass RLS, so there is no behavior change here.
 *
 * Local: `pnpm --filter govea db:platform-migrate`
 * CI:    `pnpm --filter govea db:platform-migrate:container`
 */
import { migrate } from '@govcore/schema/migrate'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('platform-migrate: DATABASE_URL is not set')
    process.exit(1)
  }

  const { applied } = await migrate({ connectionString: url, log: (m) => console.log(`  ${m}`) })
  console.log(
    applied.length
      ? `platform-migrate: applied ${applied.length} migration(s): ${applied.join(', ')}`
      : 'platform-migrate: already up to date',
  )
}

main().catch((err) => {
  console.error('platform-migrate: failed', err)
  process.exit(1)
})
