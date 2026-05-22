# Capability: IAM Audit Trail

## What It Does
The system must log all identity and access management events so that administrators can answer who did what and when. Logs are immutable and viewable from the admin UI.

## Personas
- **CMS Administrator** — reviews audit logs to investigate access issues, support compliance requirements, and monitor for anomalies

## Behaviors
- Log all authentication events: successful login, failed login, logout, password reset
- Log all account events: user created, edited, deactivated, deleted, role changed
- Log who performed each action and when
- Display the audit log in the admin UI with filtering by event type, user, and date range
- Export the audit log as CSV

## Retention Policy

Audit logs are subject to government records retention requirements. The defaults below are designed to align with common state and local government retention schedules for IT system access logs.

| Setting | Default | Recommended maximum | On expiry |
|---|---|---|---|
| Retention period | 12 months | 7 years | Entries are permanently deleted |

- The 12-month default aligns with a common minimum for government IT access logs; agencies with longer statutory requirements must increase this in Site Settings
- The 7-year recommended maximum reflects typical government records schedules for administrative system logs; beyond this, storage cost and query performance degrade without corresponding compliance benefit
- No automated archival to external storage is provided in v1 — Admins must export via CSV before the retention window expires if long-term records are required
- Admins are responsible for confirming their configured period meets their agency's records retention schedule

## Rules
- Audit log entries are immutable — no user including Admin can edit or delete them through the application
- Logs must be retained for a configurable period (default: 12 months, recommended maximum: 7 years)
- Failed login attempts must be logged including the email address used

## Log Integrity

Application-level enforcement: no delete or update path exists for audit log entries in the application code. The UI provides read-only access.

Operational requirement: the database role used by the application must be granted INSERT-only on the `audit_log` table — no UPDATE or DELETE. This is a deployment configuration requirement, not enforced by the schema. See deployment documentation for setup instructions.

Acknowledged limitation: an operator with direct superuser database access can bypass application-level controls. This is accepted in v1. Mitigation options for future consideration include append-only cloud storage exports and WAL-based tamper detection.

## Implementation Status
Shipped (v1). The `audit_log` table records auth, account, and content events with actor + timestamp; the `/audit` admin view exposes URL-backed actor/action/time-window filtering (#617). Immutability is enforced at the database layer by a Postgres trigger that blocks UPDATE and DELETE (#417), in addition to application-level read-only access. CSV export is the recommended path for retaining entries beyond the configured retention window.

## Links
- Depends on: User Management, Local Authentication, SSO Authentication
- Related: Role-Based Access Control
