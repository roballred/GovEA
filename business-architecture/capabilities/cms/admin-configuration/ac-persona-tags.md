# Capability: Persona Tags

## What It Does
The system must allow organization administrators to define a list of cross-cutting tags scoped to their organization, and allow contributors to assign multiple tags to each persona. Tags enable flexible filtering and search that cuts across the type hierarchy — e.g. flagging personas as 'mobile-first', 'accessibility', or 'high-volume' regardless of their type.

## Personas
- **CMS Administrator** — creates and removes tags for the organization; assigns tags to personas
- **Agency EA Coordinator** — assigns tags to personas to improve search and cross-referencing

## Behaviors
- Display the current list of org-scoped tags in a Manage tags dialog (admin only)
- Allow administrators to add a new tag by name; duplicate names within the same org are rejected
- Allow administrators to remove a tag; the `persona_tags` junction rows for that tag are cascade-deleted
- Tags appear as colored pill badges on each persona row in the table
- A tag filter dropdown in the toolbar filters personas to those carrying the selected tag
- The create and edit dialogs show a scrollable checklist of available tags; contributors may select any combination
- A persona may have zero or more tags; tags are stored in a `persona_tags` junction table

## Rules
- Only Admins may add or remove tags — Contributors and Viewers cannot manage the tag list
- Contributors and above may assign or remove tags when creating or editing a persona
- Tag names must be unique within an organization; instance-level uniqueness is not required
- Deleting a tag cascades — all `persona_tags` rows referencing that tag are removed automatically (FK cascade)
- No rename operation in v1; to rename, delete the old tag and add the new one

## Links
- Depends on: IAM — Role-Based Access Control
- Used by: Content Management — Personas
- Related: Persona Type Management
