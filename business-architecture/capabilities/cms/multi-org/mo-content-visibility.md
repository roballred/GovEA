# Capability: Content Visibility

## What It Does
The system must allow contributors and admins to control how broadly a persona, capability, or application is visible across organizational boundaries. Visibility is set per content item and defaults to org-only.

## Personas
- **Agency EA Coordinator** — sets visibility on individual content items; decides what to share with connected orgs or publish instance-wide
- **Enterprise Architect (Central IT)** — publishes enterprise capabilities and personas at `instance` visibility so all agencies can browse and reference them
- **CMS Administrator** — may manage visibility settings as part of org administration

## Behaviors
- Display a visibility selector on persona, capability, and application create/edit forms
- Enforce three visibility levels:
  - `org` — visible only within the owning organization (default)
  - `connections` — visible to all organizations with an active connection to the owning org
  - `instance` — visible to all authenticated users on this installation, regardless of org
- Show `connections`-visibility content from connected orgs in browse/search results, clearly labeled with the source org
- Show `instance`-visibility content from all orgs in browse/search results, clearly labeled with the source org
- Never allow a user in org B to edit content owned by org A, regardless of visibility level
- When a connection is removed, `connections`-visibility content from the removed org disappears from the user's view immediately

## Rules
- Default visibility for all new content is `org` — sharing is always an explicit opt-in
- Read access to cross-org content does not imply write or delete access
- Visibility changes are logged in the audit trail
- `instance` visibility is appropriate for enterprise reference artifacts, not agency-internal content

## Links
- Depends on: Org Connections (for `connections` level), IAM — Role-Based Access Control
- Related: Cross-Org Linking, Content Relationships
