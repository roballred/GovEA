# Capability: Deployment & Operations

**Scope:** v1

## What It Does

The system must be deployable, runnable, observable, and upgradable by a small Central IT team without specialist EA tooling expertise. Day-1 deployment, day-2 health checks, and day-N upgrades are the three operator-facing surfaces this group describes. The objective is to make the cost of ownership of running GovEA visible and reasonable for a state or local government IT director — not to ship a sophisticated operations platform.

This group was added to close [ARB Finding #10](https://github.com/roballred/goveaapp/issues/10) (Central IT Director, Thomas Reed): "the real cost of ownership is invisible." With this group, an evaluator can read what running GovEA actually costs in operator effort before committing to it.

## Personas

- **Instance Administrator** — owns the deploy / monitor / upgrade workflow across the GovEA instance(s) they operate; needs the docs and surfaces here to be reliable enough that running the product is not a daily ad-hoc puzzle
- **Department Director (Central IT)** — does not operate the instance directly but is responsible for the operating-cost decision; reads this group to understand the resource commitment before approving deployment

## Sub-Capabilities

| Capability | File | Status | Description |
|---|---|---|---|
| Deployment | [do-deployment.md](./do-deployment.md) | Shipped (v1) | Container-based deployment with documented environment variables and database initialization |
| Health & Monitoring | [do-health-monitoring.md](./do-health-monitoring.md) | Planned — partial | Health-check endpoints, uptime monitoring, structured error logging |
| Upgrade & Migration | [do-upgrade-migration.md](./do-upgrade-migration.md) | Planned | Safe upgrade procedure across released versions; cross-links to [#4](https://github.com/roballred/GovEA/issues/4) |

## Success Criteria

- A Central IT operator can deploy GovEA from a clean environment to a working dev or demo instance in under an hour by following the documented runbook — no source-code reading required
- A running instance can be reliably monitored from a generic uptime / log-aggregation tool (no GovEA-specific operational stack required)
- An operator can move from one supported GovEA version to the next without destructive schema changes; pre-flight checks identify when an upgrade is unsafe
- A reader of `README.md` can answer "what does it take to run this in production?" without reaching out to a developer

## Rules

- All runtime configuration lives in environment variables, not hard-coded values — operators never edit source to deploy
- The runtime never depends on a paid service to start; SMTP, identity provider, and metrics endpoints are all optional and the system functions in a degraded but explicit mode without them
- Schema changes are forward-compatible during a transition window: a new GovEA version starts cleanly against the previous version's schema, runs migrations on boot or on demand, and only then assumes the new shape
- Operator-facing audit events (`instance.*`) record deploy-relevant actions distinct from tenant audit; see `iam-audit-trail`

## Implementation Status

**Shipped (v1):**
- Container-based deployment via the runtime-agnostic `scripts/container-compose.sh` helper, with Podman as the preferred default and Docker as the fallback. Documented in `README.md` under "Local Containers". `pnpm demo:start`, `pnpm demo:db`, and `pnpm demo:container` cover the three common workflows.

**Planned (v1, partial):**
- A documented production runbook beyond local-container quickstart. The current README is good for evaluators; a dedicated production-deployment doc is still missing.
- Health-check endpoint convention. Next.js's default `/api/healthz` style hook is not yet implemented.

**Planned (post-v1):**
- Structured upgrade procedure across released versions (#4). Today's pre-production `db:push` workflow means upgrades are not a concern; once the first real tenant lands, this story becomes urgent.
- Operator-facing observability dashboard.

## Out of Scope (v1)

- A GovEA-specific monitoring stack. The product is expected to drop into a generic operator's existing log + uptime tooling
- High-availability multi-instance orchestration. v1 is a single-instance product
- Automated rollback. Manual operator intervention is the v1 model

## Links

- Depends on: `cms/admin-configuration` (the in-app admin surface that complements operator-side configuration)
- Related: `cms/iam` (instance-admin role + break-glass audit trail), `cms/content-management` (DB schema lifecycle ultimately drives the upgrade story)
