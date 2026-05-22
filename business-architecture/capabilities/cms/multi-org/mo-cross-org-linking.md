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
- Display pending outbound links on the source content item's detail page, labeled as awaiting approval
- Display inbound pending requests and approved links on the target content item's detail page
- Allow the source org to withdraw a pending or approved link at any time
- When a cross-org link is approved, it appears in the target org's content item as an inbound link (read-only attribution)
- Hide local relationship edit controls when the current org is viewing a remote federated record

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
- Removing an org connection removes cross-org links that depended on that trust relationship
- Notification and approval-history surfaces are still future work; the current prototype relies on in-app status visibility on the linked records themselves

## Implementation Status
Shipped (v1). Cross-org linking for capabilities and personas with the three link types (implements / extends / maps_to), status lifecycle (pending → active), inbound/outbound visibility, and withdraw is in place. Reverse-direction seed data for source-side approval testing is tracked under #543.

## Links
- Depends on: Content Visibility, Org Connections, Cross-Org Link Approval
- Related: Content Relationships
