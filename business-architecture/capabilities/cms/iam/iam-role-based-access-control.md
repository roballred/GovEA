# Capability: Role-Based Access Control

## What It Does
The system must control what each user can see and do based on their assigned role. Permissions are enforced consistently across the UI, API, and data layer.

## Personas
- **CMS Administrator** — assigns roles to users; understands what each role can do
- **Content Viewer** — subject to role enforcement; receives read-only access by default

## Behaviors
- Enforce three built-in roles: Admin, Contributor, Viewer
- Enforce `instance_admin` as a separate instance-scoped operating role rather than a fourth org-scoped content role
- Prevent users from accessing features or content outside their role's permissions
- Allow an Admin to change a user's role at any time
- Preserve the role already assigned to a pre-provisioned SSO user account at sign-in
- Display only the UI elements a user has permission to use — do not show and then block

## Roles

| Role | Permissions |
|---|---|
| Admin | Full access — manage users, org settings, all content |
| Contributor | Create and edit content — no user management, no delete |
| Viewer | Read-only access to viewer-visible content: published core content, accepted ADRs, and active/complete initiatives |

`instance_admin` is not listed in the table above because it is a separate operating role layered on top of a user's org-scoped role. It exists for platform governance, not as a content-ownership shortcut.

## Rules
- Roles are fixed in v1 — custom role creation is out of scope
- Permission enforcement must occur server-side; UI hiding alone is not sufficient
- A user can hold only one role per organization at a time
- Role assignments must be scoped to an organization
- Org-scoped Admin retains ownership of org settings; instance-scoped authority is defined separately under Instance Administration

## Implementation Status
Shipped (v1). The three fixed roles (Admin / Contributor / Viewer) plus the instance-scoped `instance_admin` operating role are enforced server-side in [apps/govea/src/lib/rbac.ts](apps/govea/src/lib/rbac.ts), with parallel definitions in [packages/core/src/rbac/index.ts](packages/core/src/rbac/index.ts) pending consolidation under #34. Domain-owner attribution + overwrite-protection (#611) layer on top of RBAC for content-owner ergonomics.

## Links
- Depends on: User Management
- Related: SSO Authentication, Local Authentication
