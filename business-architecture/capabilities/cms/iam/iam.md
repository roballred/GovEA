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

## Rules
- IAM is always active — no part of the system is accessible without authentication
- Local authentication is always available as a fallback, even when SSO is configured
- All IAM events are logged and immutable
