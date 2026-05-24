# Capability: Identity and Access Management (IAM)

**Scope:** v1

## What It Does
The system must control who can access it, how they authenticate, and what they are permitted to do. IAM underpins every other capability — no user interaction is possible without it.

## Personas
- **CMS Administrator** — configures and manages all IAM functions
- **Instance Administrator** — governs platform-level access and tenant operations across the shared instance
- **Content Viewer** — subject to IAM; authenticates and receives appropriate access

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| User Management | [iam-user-management.md](./iam-user-management.md) | Create, edit, deactivate, and delete user accounts |
| Role-Based Access Control | [iam-role-based-access-control.md](./iam-role-based-access-control.md) | Enforce Admin / Contributor / Viewer roles and permissions |
| Instance Administration | [iam-instance-administration.md](./iam-instance-administration.md) | Govern tenant lifecycle, platform admin access, and audited break-glass operations |
| Local Authentication | [iam-local-authentication.md](./iam-local-authentication.md) | Email and password login with password reset |
| SSO Authentication | [iam-sso-authentication.md](./iam-sso-authentication.md) | OpenID Connect sign-in with admin-managed pre-provisioned access; current provider wiring targets Microsoft Entra ID |
| IAM Audit Trail | [iam-audit-trail.md](./iam-audit-trail.md) | Immutable log of all identity and access events |
| First-Run Setup | [iam-first-run-setup.md](./iam-first-run-setup.md) | Bootstrap initial Admin account on first launch |
| API Auth Decision | [iam-api-auth-decision.md](./iam-api-auth-decision.md) | Auth strategy for API routes (session-based, not token-based in v1) |

## Implementation Status

IAM is one of GovEA's strongest product areas and is credible as a core v1 pillar. Authentication, authorization, audit logging, meaningful E2E test coverage, and the full instance-admin console are all present.

**Remaining gap:** The last-admin edge case (preventing the final admin account from being demoted or deactivated) has a known CI reliability gap. Tracked in [issue #33](https://github.com/roballred/GovEA/issues/33). This is a test-coverage gap, not a missing feature — the behavior is implemented but the test scenario is not consistently exercised in CI.

## Success Criteria

The following outcomes indicate IAM is working well for a 1–3 person government IT department 6 months after deployment:

- A new staff member can be pre-provisioned with the correct role in under 5 minutes — no developer involvement, no separate ticket
- A departing staff member's access is revoked the same day IT is notified — one action in the UI, no database access required
- The administrator can answer "who changed this and when" for any user or role event using the audit log without assistance
- SSO sign-in works without a separate GovEA password — users authenticate once via the agency identity provider
- Local authentication remains available if SSO is unavailable — no user is locked out due to an IdP outage
- A new Admin account can be created by an existing Admin without rerunning first-run setup or touching the database

## Rules
- IAM is always active — authentication is required by default; public access to published content is an opt-in configuration controlled by the Admin
- Local authentication is always available as a fallback, even when SSO is configured
- SSO sign-in is allowed only for active pre-provisioned users with an organization binding
- Instance administration is separate from org-scoped administration and must not silently expand into tenant content ownership
- All IAM events are logged and immutable

## Links
- Depends on: IAM — User Management (foundational)
- Enables: Content Management, Admin & Configuration, Multi-Org, Frontend Display
- Related: Instance Administration, Audit Trail
