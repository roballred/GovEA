# Capability: Upgrade & Migration

**Scope:** v1

## What It Does

The system must provide a documented, low-risk procedure for moving an operating GovEA instance from one supported release to the next. The intent is "upgrade is a routine 30-minute operator task," not "upgrade is a bespoke migration project." Today GovEA is pre-production and runs against `db:push` (schema-without-migration-files); this capability documents the procedure that takes over once a tenant exists whose data cannot be discarded.

Cross-references upstream architecture work tracked under [#4](https://github.com/roballred/GovEA/issues/4).

## Personas

- **Instance Administrator** — runs the upgrade; needs the procedure to be reliable and clearly bounded so they can choose a maintenance window with confidence

## Behaviors

- Document the pre-production → first-tenant transition: squash the schema into `0000_initial_schema.sql`, fold `apps/govea/src/db/sql/*.sql` triggers into the migration sequence, switch CI from `db:push` to `db:migrate`. This is a one-time cutover, not a recurring upgrade
- Per-release: ship a `MIGRATING.md` (or per-release notes) section describing breaking changes, required env-var updates, and any data-migration steps that need operator intervention
- Provide a pre-flight check command (`pnpm db:check` or similar) that compares the current schema to the target release's expected starting point and refuses to upgrade when there is a divergence
- The migration runner is idempotent: an interrupted upgrade can be re-run safely without manual cleanup
- Roll-back is best-effort and explicit: every release identifies whether its migrations are forward-only or whether a documented rollback path exists. Forward-only releases require operator awareness before being applied

## Rules

- Schema migrations are forward-compatible during a transition window: a new GovEA version starts cleanly against the previous version's schema, runs migrations on boot or on demand, and only then assumes the new shape
- No migration silently truncates data; any column drop is a deliberate, release-noted action with a documented backup recommendation
- Triggers under `apps/govea/src/db/sql/` are idempotent and reapplied on every deploy — they describe the canonical post-deploy state, not a one-time apply
- An upgrade across more than one release version is supported by running the intermediate versions in sequence, not by skipping them

## Implementation Status

**Planned.** Pre-production today uses `pnpm --filter govea db:push --force` and lives without migration files (see `CLAUDE.md`'s "Database Workflow" section). The hard requirements for this capability — pre-flight check, idempotent migration runner, per-release notes — do not yet exist because the cost of doing them now (pre-tenant) is wasted work.

This file describes the v1 target so the work can be picked up as soon as the first real tenant lands.

## Links

- Depends on: `do-deployment` (the deployment machinery the upgrade procedure runs on top of)
- Related: `do-health-monitoring`, `iam-audit-trail`
