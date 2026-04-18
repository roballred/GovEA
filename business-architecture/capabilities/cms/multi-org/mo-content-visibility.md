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

## Access Matrix

| Action | Owning org | Connected org (`connections`) | Any org (`instance`) |
|---|---|---|---|
| Read | ✅ | ✅ | ✅ |
| Create cross-org link request | — | ✅ | ✅ |
| Edit content | ✅ | ❌ | ❌ |
| Delete content | ✅ (Admin) | ❌ | ❌ |
| Change visibility | ✅ (Contributor+) | ❌ | ❌ |
| Archive content | ✅ (Admin) | ❌ | ❌ |

Content ownership never transfers across org boundaries. Sharing content at a broader visibility level does not grant any write access to other organizations.

## Rules
- Default visibility for all new content is `org` — sharing is always an explicit opt-in
- Read access to cross-org content does not imply write or delete access
- Only the owning organization may edit, archive, or delete its content
- Visibility changes are logged in the audit trail
- `instance` visibility is appropriate for enterprise reference artifacts, not agency-internal content

## Implementation Status
- Visibility levels (`org`, `connections`, `instance`) are enforced on shipped federated reads, including direct detail-page fetches, via `getConnectedOrgIds` in `federation.ts`
- Write protection is enforced in content mutation server actions via `assertOwnership` in `federation.ts` — throws before any DB write if the calling user's org does not own the content
- Remote federated detail pages are rendered read-only in the UI even when the viewer has contributor rights in their own organization

## Links
- Depends on: Org Connections (for `connections` level), IAM — Role-Based Access Control
- Related: Cross-Org Linking, Content Relationships
