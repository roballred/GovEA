# Capability: Content Workflow

## What It Does
The system must manage the lifecycle state of each content item through a defined workflow. For the core repository content model, content moves through Draft → Published → Archived and only published content is visible to Viewers. Planning entities currently use planning-specific lifecycle states.

## Personas
- **CMS Administrator** — manages content state; can move content to any state
- **Content Viewer** — sees only published content; workflow state is invisible to them

## Behaviors
- Track core content items through three states: Draft → Published → Archived
- Allow Contributors to move content from Draft to Published
- Allow Contributors to move published content back to Draft for editing
- Allow Admins to archive published content
- Show the current state of each content item in the admin content list
- Filter the content list by workflow state

## State Definitions

| State | Description |
|---|---|
| Draft | Work in progress — visible to Contributors and Admins only |
| Published | Live — visible to all users including Viewers |
| Archived | Retired — hidden from Viewers; preserved for history and audit |

## Rules
- Core content cannot skip states — Draft must precede Published; Published must precede Archived
- Archived content cannot be edited — it must be moved back to Draft first
- Deleting a content item is separate from archiving — archive first, delete only when certain
- Planning entities use domain-specific lifecycle states rather than the core `draft / published / archived` workflow. For Viewer access, the following mappings apply: initiatives in `active` or `complete` are visible; `proposed`, `on-hold`, and `cancelled` are not. ADRs with status `accepted` are visible; `proposed`, `deprecated`, and `superseded` are not. Strategic objectives follow the standard `workflowStatusEnum` (published only for Viewers). (Decision: #202)

## Implementation Status
Shipped (v1). All seven core content types implement `draft / published / archived` workflow with viewer visibility gating. Planning entities (initiatives, ADRs, strategic objectives) use the domain-specific lifecycle states documented above per decision #202.

## Links
- Depends on: Content Authoring, IAM — Role-Based Access Control
- Related: Content Versioning, IAM — IAM Audit Trail
