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

## Rules
- Audit log entries are immutable — no user including Admin can edit or delete them
- Logs must be retained for a configurable period (default: 12 months)
- Failed login attempts must be logged including the email address used

## Links
- Depends on: User Management, Local Authentication, SSO Authentication
- Related: Role-Based Access Control
