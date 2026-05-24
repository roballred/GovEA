# Capability: Health & Monitoring

**Scope:** v1

## What It Does

The system must surface enough operator-facing signal that a generic uptime / log-aggregation tool can answer two questions reliably: is GovEA up, and what went wrong when it isn't. The intent is dropping GovEA into an operator's existing observability stack, not building a GovEA-specific monitoring product.

## Personas

- **Instance Administrator** — needs to know when GovEA stops responding without tailing logs continuously; needs structured logs to identify a fault when an alert fires

## Behaviors

- Expose a lightweight liveness endpoint (`/api/healthz` or equivalent) that returns 200 when the Next.js app is serving and 503 when it isn't, without taking a DB lock
- Emit structured error logs with enough context (operation, user id, organization id, timestamp) for an operator to correlate a fault to an audit-log entry without source access
- Distinguish recoverable warnings (e.g. SMTP not configured) from boot-blocking errors (DB unreachable) so an operator's alert rule has a clear signal to filter on
- Write operator-relevant audit events to the platform-level audit log (`organizationId IS NULL` rows; see `/instance/audit`) so a security operator can review platform actions in one place

## Rules

- The health endpoint never returns sensitive data — operators integrate it with their own auth boundary
- Structured logs never include credentials, session tokens, or personally identifiable content (a SMTP password value should never appear in a log line, even on error)
- Operator-facing log shape is documented; consumers can rely on field names not silently changing across releases

## Implementation Status

**Planned — partial.** Some pieces exist: the platform audit log (`/instance/audit`) captures operator-relevant events filtered to `organizationId IS NULL`, and break-glass sessions are individually audited. What does not yet exist as a documented capability:

- A dedicated `/api/healthz` endpoint
- A documented log-shape contract for operators
- A starter Grafana / Datadog integration runbook

These are the natural follow-up slices.

## Links

- Depends on: `iam-audit-trail` (platform-level audit semantics)
- Related: `do-deployment`, `do-upgrade-migration`
