# Capability: Content Workflow

## What It Does
The system must manage the lifecycle state of each content item through a defined workflow. Content moves through states in a controlled sequence and only published content is visible to Viewers.

## Personas
- **CMS Administrator** — manages content state; can move content to any state
- **Content Viewer** — sees only published content; workflow state is invisible to them

## Behaviors
- Track each content item through three states: Draft → Published → Archived
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
- Content cannot skip states — Draft must precede Published; Published must precede Archived
- Archived content cannot be edited — it must be moved back to Draft first
- Deleting a content item is separate from archiving — archive first, delete only when certain

## Links
- Depends on: Content Authoring, IAM — Role-Based Access Control
- Related: Content Versioning, IAM — IAM Audit Trail
