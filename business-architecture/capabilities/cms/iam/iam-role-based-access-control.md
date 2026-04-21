# Capability: Role-Based Access Control

## What It Does
The system must control what each user can see and do based on their assigned role. Permissions are enforced consistently across the UI, API, and data layer.

## Personas
- **CMS Administrator** — assigns roles to users; understands what each role can do
- **Content Viewer** — subject to role enforcement; receives read-only access by default

## Behaviors
- Enforce three built-in roles: Admin, Contributor, Viewer
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

## Rules
- Roles are fixed in v1 — custom role creation is out of scope
- Permission enforcement must occur server-side; UI hiding alone is not sufficient
- A user can hold only one role per organization at a time
- Role assignments must be scoped to an organization

## Links
- Depends on: User Management
- Related: SSO Authentication, Local Authentication
