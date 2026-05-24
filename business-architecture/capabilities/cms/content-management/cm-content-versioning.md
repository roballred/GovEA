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

## Retention Policy

Retaining every version of every content item indefinitely creates unbounded storage growth. GovEA applies a configurable retention policy per content type.

| Setting | Default | Notes |
|---|---|---|
| Retention mode | Keep last N versions | Simplest to reason about; alternative: keep versions within X months |
| Default N | 25 versions | Sufficient for normal editorial workflows without runaway storage |
| On limit reached | Oldest versions pruned | Pruning is automatic; the current published version is never pruned |

- The retention policy is configurable per content type by an Admin
- The currently published version and the version immediately preceding it are always retained regardless of the retention limit
- Pruned versions are permanently deleted — export or download before they are pruned if long-term version history is required

## Rules
- Version history is append-only — versions cannot be deleted individually by users
- Restoring a previous version creates a new version rather than rolling back
- The currently published and immediately preceding versions are never automatically pruned
- Version history is visible to Admins and Contributors; not visible to Viewers

## Implementation Status
Planned — not yet implemented. GovEA today retains who/when/what via the immutable `audit_log` table (`iam-audit-trail`), but does not maintain a per-record version history with diff or restore capability. The retention policy described above and the diff/restore UI are not present in v1.

## Links
- Depends on: Content Authoring
- Related: Content Workflow, IAM — IAM Audit Trail
