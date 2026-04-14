# Capability: Cross-Org Linking

## What It Does
The system must allow an agency to link one of its own capabilities or personas to a counterpart in another organization — typically an enterprise-level capability or persona published by central IT. A cross-org link asserts a relationship (e.g., "our Permit Issuance capability implements the enterprise Licensing & Permitting capability") and makes that relationship visible to both organizations.

## Personas
- **Agency EA Coordinator** — initiates cross-org links from their agency's content to enterprise counterparts; browses instance-level and connected-org content to find linkable items
- **Enterprise Architect (Central IT)** — sees which agencies have linked to their enterprise capabilities; uses this to understand adoption and identify gaps

## Behaviors
- Allow a contributor or admin to browse `instance`-visibility and `connections`-visibility capabilities and personas from other orgs
- Allow the user to propose a cross-org link from a local content item to a cross-org item, specifying a link type (`implements`, `extends`, `maps_to`)
- Set the link status to `pending` until the target org approves
- Display pending outbound links on the content item's detail page, labeled as awaiting approval
- Display approved cross-org links on both the source and target content items' detail pages
- Allow the source org to withdraw a pending or approved link at any time
- When a cross-org link is approved, it appears in the target org's content item as an inbound link (read-only attribution)

## Link Types

| Type | Meaning |
|---|---|
| `implements` | Our capability fulfills the enterprise capability |
| `extends` | Our capability builds on the enterprise capability with additional scope |
| `maps_to` | Our capability is functionally equivalent to the target capability |

## Rules
- Cross-org links are directional: the initiating org owns the link; the target org approves or rejects it
- **Approval does not grant write access.** An approved cross-org link gives the target org read attribution (the inbound link appears on their content item) — it does not allow the target org to edit, delete, or archive the source org's content
- A link does not grant the target org any access to the source org's content beyond what visibility settings already allow
- Deleting a local content item removes all cross-org links originating from it
- If the target content item is deleted or its visibility is reduced so the source org can no longer see it, the link is automatically invalidated and both orgs are notified

## Links
- Depends on: Content Visibility, Org Connections, Cross-Org Link Approval
- Related: Content Relationships
