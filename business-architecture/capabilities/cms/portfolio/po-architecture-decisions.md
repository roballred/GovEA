# Capability: Architecture Decision Records

## What It Does
The system must allow contributors to record, track, and supersede architecture decisions so the organization has a durable, navigable log of why significant technical choices were made. ADRs use the standard lightweight format: context, decision, consequences.

## Personas
- **CMS Contributor** — creates and maintains ADR records
- **CMS Administrator** — has all Contributor permissions; can delete records
- **Content Viewer** — reads published ADRs through the front-end ADR list view
- **Department Director** — reads significant decisions to understand technical direction and constraints

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
- Only published ADRs appear in front-end portfolio views

## Implementation Status
Implemented in early v1:
- Schema and server actions support the full ADR lifecycle, including supersession links
- Admin UI includes list, detail, create, edit, and delete flows
- ADRs can link to capabilities, applications, initiatives, and objectives

Remaining gaps:
- richer ADR analytics and debt-oriented reporting are still future work

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Capability Map, Frontend Display — Portfolio Views
