# Capability: Principles

## What It Does
The system must allow contributors to capture and maintain the architecture principles that guide design decisions across the organization. Principles articulate the values and rules that constrain how the organization builds and changes its EA — giving decision-makers a stable reference point when evaluating options and trade-offs.

## Personas
- **Enterprise Architect (Central IT)** — authors enterprise-level principles and applies them when reviewing portfolio changes
- **Domain Architect** — authors domain-specific principles and reviews work against them
- **Department Director** — references principles to understand the rules of the road before initiating change

> RBAC roles (Admin / Contributor / Viewer) are not personas. See [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md); role behavior is reflected in `## Rules` below.

## Behaviors
- Create a principle with: name (short label), title (full principle statement), description (one-sentence summary), rationale, implications, status, and visibility
- Edit all fields on an existing principle record
- Link a principle to one or more capabilities it governs
- Link a principle to one or more ADRs that apply or express it
- Delete a principle record (Admin only)
- View all principles in a list with status and linked records visible

## Fields

| Field | Purpose |
|---|---|
| `name` | Short display label — e.g. "SaaS First" |
| `title` | Full principle statement — e.g. "Prefer SaaS solutions before building custom" |
| `description` | One-sentence summary for scannable lists |
| `rationale` | Why this principle exists — the reasoning behind the rule |
| `implications` | What following this principle means in practice |
| `status` | Standard workflow state: draft / published / archived |
| `visibility` | Scope: org / connections / instance |

## Rules
- A principle must belong to an organization
- Deletion is Admin-only
- All create, edit, and delete actions are written to the audit log
- Visibility defaults to `org`
- Only published principles are visible to Content Viewers

## Implementation Status
Implemented in v1:
- Schema: `principles` table, `principle_capabilities` and `principle_adrs` junction tables (`apps/govea/src/db/schema/principles.ts`)
- Server actions: create, edit, delete, get (`apps/govea/src/actions/principles.ts`)
- Admin UI: list view, detail view, create/edit forms (`apps/govea/src/app/(admin)/principles/`)

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Content Workflow
- Related: Architecture Decision Records, Capability Map
