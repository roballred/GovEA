# Capability: Application Portfolio

## What It Does
The system must allow contributors to maintain a structured inventory of the organization's applications, capturing lifecycle status, hosting model, vendor, version, and links to the business capabilities each application supports.

## Personas
- **Enterprise Architect (Central IT)** — owns the application inventory at the enterprise level; uses it as the source of truth for portfolio analysis
- **Domain Architect** — maintains the slice of the inventory for their domain (e.g. finance, public works) and reviews lifecycle status
- **Department Director** — reads the inventory to understand what their department depends on and where investment is going

> RBAC roles (Admin / Contributor / Viewer) are not personas. See [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md); role behavior is reflected in `## Rules` below.

## Behaviors
- Create an application record with: name, description, vendor, version, hosting model, lifecycle status, workflow status, and visibility
- Link an application to one or more business capabilities (required — at least one link must exist)
- Edit all fields on an existing application record
- Delete an application record (Admin only)
- View all applications in a table, sortable by name
- Filter applications by lifecycle status, hosting model, and owning department on the front-end portfolio view

## Lifecycle Status Values
| Status | Meaning |
|---|---|
| `active` | Application is in active use |
| `planned` | Application is approved or under procurement; not yet live |
| `sunset` | Application is being phased out; a replacement exists or is in progress |
| `decommissioned` | Application has been retired and is no longer in use |

## Hosting Model Values
Free-text field. Recommended values: `on-prem`, `saas`, `hybrid`, `cloud-hosted`.

## Rules
- Every application must be linked to at least one capability — enforced at the application layer
- Deletion is Admin-only
- All create, edit, and delete actions are written to the audit log
- Visibility defaults to `org`; Contributors can set to `connections` or `instance`
- Only published applications appear in front-end portfolio views

## Implementation Status
Fully implemented in v1:
- Schema: `applications` table, `application_capabilities` junction table (`apps/govea/src/db/schema/applications.ts`)
- Server actions: create, edit, delete, get (`apps/govea/src/actions/applications.ts`)
- Admin UI: list view, detail view, create/edit forms (`apps/govea/src/app/(admin)/applications/`)

## Links
- Depends on: Capability Map, IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Frontend Display — Portfolio Views, Planning — Initiatives
