# Capability: Persona Tags

## What It Does
The system must allow organization administrators to manage taxonomy-backed persona tags scoped to their organization, and allow contributors to assign multiple tags to each persona. Persona tags are modeled as values under the top-level `Persona Tag` taxonomy type. They enable flexible filtering and search that cuts across the type hierarchy — e.g. flagging personas as `mobile-first`, `accessibility`, or `high-volume` regardless of their type.

## Personas
- **CMS Administrator** — manages the `Persona Tag` taxonomy branch for the organization
- **Agency EA Coordinator** — assigns tags to personas to improve search and cross-referencing

## Behaviors
- Display persona tag values through the Taxonomy Management page rather than a standalone tag-management dialog
- Allow administrators to create a top-level `Persona Tag` taxonomy type if it does not exist yet
- Allow administrators to add, edit, and delete tag values under that taxonomy type
- Allow administrators to remove a tag; the `persona_tags` junction rows for that taxonomy term are cascade-deleted
- Tags appear as colored pill badges on each persona row in the table
- A tag filter dropdown in the toolbar filters personas to those carrying the selected tag
- The create and edit dialogs show a scrollable checklist of available tags; contributors may select any combination
- A persona may have zero or more tags; tags are stored in a `persona_tags` junction table that points to taxonomy terms

## Rules
- Persona tags are organization-scoped taxonomy values, not a dedicated table or enum
- Only Admins may delete persona tag taxonomy terms; Admins and Contributors may create or edit taxonomy terms through Taxonomy Management
- Contributors and above may assign or remove tags when creating or editing a persona
- Tag names must be unique within the `Persona Tag` branch for an organization
- Deleting a tag cascades — all `persona_tags` rows referencing that tag are removed automatically (FK cascade)
- The `Persona Tag` taxonomy branch is the source of truth for current selectable tags in the UI

## Implementation Status
Shipped (v1). Persona tags are managed through the Taxonomy Management page as values under the `Persona Tag` taxonomy type; the persona table displays tag pills and offers a tag filter, and the create/edit dialogs include a multi-select tag list.

## Links
- Depends on: IAM — Role-Based Access Control, Content Management — Taxonomy Management
- Enables: Content Management — Personas
- Related: Persona Type Management
