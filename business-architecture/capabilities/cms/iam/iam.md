# Capability: Identity and Access Management (IAM)

## What It Does
The system must control who can access it, how they authenticate, and what they are permitted to do. IAM underpins every other capability — no user interaction is possible without it.

## Personas
- **CMS Administrator** — configures and manages all IAM functions
- **Content Viewer** — subject to IAM; authenticates and receives appropriate access

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| User Management | [iam-user-management.md](./iam-user-management.md) | Create, edit, deactivate, and delete user accounts |
| Role-Based Access Control | [iam-role-based-access-control.md](./iam-role-based-access-control.md) | Enforce Admin / Contributor / Viewer roles and permissions |
| Local Authentication | [iam-local-authentication.md](./iam-local-authentication.md) | Email and password login with password reset |
| SSO Authentication | [iam-sso-authentication.md](./iam-sso-authentication.md) | Microsoft Entra ID sign-in via OpenID Connect |
| IAM Audit Trail | [iam-audit-trail.md](./iam-audit-trail.md) | Immutable log of all identity and access events |
| First-Run Setup | [iam-first-run-setup.md](./iam-first-run-setup.md) | Bootstrap initial Admin account on first launch |

## Success Criteria

The following outcomes indicate IAM is working well for a 1–3 person government IT department 6 months after deployment:

- A new staff member can be provisioned with the correct role in under 5 minutes — no developer involvement, no separate ticket
- A departing staff member's access is revoked the same day IT is notified — one action in the UI, no database access required
- The administrator can answer "who changed this and when" for any user or role event using the audit log without assistance
- SSO sign-in works without a separate GovEA password — users authenticate once via the agency identity provider
- Local authentication remains available if SSO is unavailable — no user is locked out due to an IdP outage
- A new Admin account can be created by an existing Admin without rerunning first-run setup or touching the database

## Rules
- IAM is always active — authentication is required by default; public access to published content is an opt-in configuration controlled by the Admin
- Local authentication is always available as a fallback, even when SSO is configured
- All IAM events are logged and immutable
