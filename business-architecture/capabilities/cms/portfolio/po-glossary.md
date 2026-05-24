# Capability: Glossary

## What It Does
The system must allow contributors to maintain a shared terminology reference for the organization's EA repository. The glossary gives architects, contributors, and non-technical stakeholders a common language — reducing ambiguity across capability maps, ADRs, principles, and planning content.

## Personas
- **Junior EA Analyst** — uses the glossary to learn the organization's specific EA vocabulary without specialist training
- **Department Director** — references the glossary to interpret EA content without needing specialist training
- **Business Stakeholder** — looks up unfamiliar EA jargon while reading a portfolio view or report

> RBAC roles (Admin / Contributor / Viewer) are not personas. See [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md); role behavior is reflected in `## Rules` below.

## Behaviors
- Create a glossary term with: term, definition, domain, notes, status, and visibility
- Optionally attach one or more source definitions from authoritative references (e.g. TOGAF, NIST, ISO) with source name, URL, and verbatim definition
- Mark one source definition as the active definition — populates `definitionSource` and `definitionSourceUrl` on the term
- Edit all fields on an existing term
- Delete a term (Admin only)
- View all terms in a list, filterable by domain and status

## Fields

| Field | Purpose |
|---|---|
| `term` | The word or phrase being defined |
| `definition` | The organization's working definition |
| `definitionSource` | Name of the authoritative source for the active definition (optional) |
| `definitionSourceUrl` | URL to the source document (optional) |
| `domain` | Free-text grouping — e.g. "Enterprise Architecture", "Security", "Planning" |
| `notes` | Additional context, usage guidance, or disambiguation notes |
| `status` | Standard workflow state: draft / published / archived |
| `visibility` | Scope: org / connections / instance |

## Source Definitions
Each term can carry multiple reference definitions from external standards bodies. This supports organizations that want to show both the authoritative definition from a source (e.g. NIST) and their own adapted working definition. Source records are stored in the `glossary_term_sources` table and linked to the parent term.

## Rules
- A term must belong to an organization
- `definition` is required; source definitions are optional
- Deletion is Admin-only
- All create, edit, and delete actions are written to the audit log
- Visibility defaults to `org`
- Only published terms are visible to Content Viewers

## Implementation Status
Implemented in v1:
- Schema: `glossary_terms` table, `glossary_term_sources` table (`apps/govea/src/db/schema/glossary.ts`)
- Server actions: create, edit, delete, get (`apps/govea/src/actions/glossary.ts`)
- Admin UI: list view, detail view, create/edit forms (`apps/govea/src/app/(admin)/glossary/`)

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Capability Map, Principles, Portfolio Management
