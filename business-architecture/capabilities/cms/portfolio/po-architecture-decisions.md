# Capability: Architecture Decision Records

## What It Does
The system must allow contributors to record, track, and supersede architecture decisions so the organization has a durable, navigable log of why significant technical choices were made. ADRs use the standard lightweight format: context, decision, consequences.

## Personas
- **Domain Architect** — authors most ADRs for their domain; records the why behind each significant decision
- **Enterprise Architect (Central IT)** — owns enterprise-wide ADRs and reviews domain ADRs for cross-cutting impact
- **Department Director** — reads significant decisions to understand technical direction and constraints

> RBAC roles (Admin / Contributor / Viewer) are not personas. See [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md); role behavior is reflected in `## Rules` below.

## Behaviors
- Create an ADR with: number (e.g. ADR-001), title, context, decision, consequences, status, and visibility
- Edit all fields on an existing ADR
- Mark an ADR as superseded and link it to the ADR that replaces it
- Delete an ADR (Admin only)
- View all ADRs in a list with status prominently displayed
- Filter ADRs by status and affected capability on the front-end view
- Navigate from an ADR to the ADR that supersedes it (and vice versa)

## Status Values
| Status | Meaning |
|---|---|
| `proposed` | Decision is under review and not yet accepted |
| `accepted` | Decision is current and in effect |
| `deprecated` | Decision is no longer relevant but has not been replaced |
| `superseded` | Decision has been replaced by a newer ADR; `supersededBy` links to the replacement |

## Rules
- ADR numbers are manually assigned by contributors — the system does not auto-increment them in v1
- `supersededBy` references another ADR record in the same organization; the field is optional
- Deletion is Admin-only
- All create, edit, and delete actions are written to the audit log
- Visibility defaults to `org`
- For Viewers, only ADRs with status `accepted` appear in front-end portfolio views and detail pages

## Implementation Status
Partially implemented in early v1:
- Schema and server actions support ADR creation, editing, deletion, and supersession links
- Admin UI includes list, detail, create, edit, and delete flows
- ADRs can link to capabilities, applications, initiatives, and objectives

Remaining gaps:
- the ADR experience is still lighter and less polished than the core application, capability, persona, service, and value-stream surfaces
- richer ADR analytics, debt-oriented reporting, and broader decision-support workflows are still future work

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Capability Map, Frontend Display — Portfolio Views
