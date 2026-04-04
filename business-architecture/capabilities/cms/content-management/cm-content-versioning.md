# Capability: Content Versioning

## What It Does
The system must retain a complete history of changes to every content item so that administrators can see what changed, who changed it, and when — and restore a previous version if needed.

## Personas
- **CMS Administrator** — reviews change history to investigate issues, support audits, and restore content when needed

## Behaviors
- Automatically create a new version every time a content item is saved
- Display the full version history for a content item with author and timestamp
- Show a diff between any two versions highlighting what changed
- Restore a previous version (creates a new version — does not overwrite history)
- Display the current version number on the content item

## Rules
- Version history is append-only — versions cannot be deleted individually
- Restoring a previous version creates a new version rather than rolling back
- All versions are retained for the life of the content item
- Version history is visible to Admins and Contributors; not visible to Viewers

## Links
- Depends on: Content Authoring
- Related: Content Workflow, IAM — IAM Audit Trail
