# Capability: Deployment

**Scope:** v1

## What It Does

The system must be installable and runnable from a clean operator environment without requiring source-code understanding. Operators provide a small set of environment variables and a database connection; everything else — schema, seed content, runtime configuration — is bootstrapped from documented commands. The supported deployment shape in v1 is a single-instance container running against a Postgres database; multi-instance horizontal scaling is post-v1.

## Personas

- **Instance Administrator** — performs the initial deployment and any redeploys; needs the procedure to be reliable and self-documenting

## Behaviors

- Provide a runtime-agnostic compose helper (`scripts/container-compose.sh`) that auto-detects Podman or Docker and exposes the same set of commands either way
- Document the environment-variable surface (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, optional SSO / SMTP keys) in `README.md` with no implicit "magic" values
- Distinguish the workflows operators actually use: host app + containerized DB (fastest hot reload), database-only, full container stack
- Initialize the schema via `pnpm --filter govea db:push` (pre-production) or `db:migrate` (post-tenant); seed via `db:seed`; install Postgres triggers via `db:apply-triggers`
- Persist Postgres data in a named volume so a stack restart does not wipe content; document the volume's name and the recovery procedure for the cross-tool gotcha (mixing `podman compose` with `podman-compose` lands on different volumes)

## Rules

- Deployment is fully configured by environment variables. No source-code edit is required to deploy a different instance
- Required env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`) are validated at boot; the process exits with a clear error if any are missing
- Optional env vars (SSO, SMTP) cause the corresponding feature to render as not-configured rather than crash the boot
- A fresh `db:push` followed by `db:seed` on an empty database produces a fully usable demo instance; this property is exercised by CI on every PR

## Implementation Status

**Shipped (v1).** Container compose helper supports Podman (preferred) and Docker (fallback). Three documented workflows (`pnpm demo:start`, `pnpm demo:db`, `pnpm demo:container`) cover host-and-DB, DB-only, and full-container deployments. Schema, trigger, and seed commands are stable and exercised by CI on every PR.

Still partial: a production-grade runbook (vs the local-container quickstart). The README is good for evaluators; a dedicated production-deployment doc is open follow-up.

## Links

- Depends on: `cms/iam` (first-run admin bootstrap)
- Related: `do-health-monitoring`, `do-upgrade-migration`, `ac-email-configuration`
