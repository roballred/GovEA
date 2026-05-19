# Capability: Chen Notation Visualization

## What It Does

Renders the Data Architecture metamodel — entities, attributes, links, business keys, and the three cross-object semantic relationship kinds — as a Chen Notation graph that a Data Architect or Modeler can read at a glance. Reading the model object-by-object through detail pages is sufficient for editing; it is not sufficient for explaining the model to a stakeholder, for spotting an entity that has too few characterizing attributes, or for confirming that two entities are related the way the modeler intended. The visualization closes that gap without becoming a second editing surface.

Chen Notation is the SME's preferred conceptual / logical-layer convention. Using it here for the physical layer is a deliberate choice — it gives the architect a familiar shape language for explaining what they have built, even when the underlying tables are Data Vault hubs / sats / links.

## Personas

- **Enterprise Data Architect** — needs a single view they can present to non-technical stakeholders and to use as the basis for the model scorecard conversation
- **Data Modeler** — needs a quick visual check that the model they have built has the connections, characterizing attributes, and business keys they intended; sees the diagram as a sanity check on their work

> ⚠️ Enterprise Data Architect and Data Modeler are **Assumed** personas. Behaviors below describe the design intent; validation with additional practitioners may surface differences in expected notation, filter behavior, or layout strategy.

## Behaviors

- Render the org's metamodel as a single Chen Notation graph at `/data/diagram`:
  - **Entities** rendered as rectangles
  - **Cross-object relationships** rendered as diamonds with the kind labelled ("is related," "characterized by," "shares," "instantiates")
  - **Attributes** rendered as ovals
  - **Business keys** rendered with a distinct glyph (e.g. underlined attribute, double-bordered oval — convention to be chosen during implementation)
- Surface filter controls to reduce the graph to a tractable subset:
  - by owner persona
  - by physical attribute type
  - by physical relationship type
  - by free-text name match
- Honor federation visibility on every node — an Org A user cannot see an Org B object that lacks `connections` or `instance` visibility
- Honor workflow status — Viewer-role users see only published nodes; Admin / Contributor see drafts as well, visually distinguished
- Render is read-only in v1. Editing happens on the existing detail / edit / relationships pages; the diagram links each node back to its detail page
- Support a deep-linked "focus" mode that filters the graph to a single entity plus its 1-hop neighborhood, opened from the entity detail page

## Rules

- The diagram never reveals an object the caller could not already read through `/data/{resource}/[id]` directly — the same federation and role-gating rules apply
- The diagram is computed server-side from the published-or-better state of the metamodel; the client receives data already filtered for visibility
- Layout is deterministic per render so a user revisiting the page sees the same shape unless the underlying model changed
- The diagram must not introduce a write path. All edit links navigate away to the existing detail pages

## Implementation Status

**Shipped (v1).** `/data/diagram` renders the metamodel as a Chen Notation graph with the documented node conventions (rectangles for entities, ovals for attributes, underlined ovals for business keys, diamonds for relationships labeled "is related" / "shares" / "instantiates"). The four documented filters (owner persona / attribute type / link type / free-text name) are all functional. Live counts are surfaced ("Showing N entities, M attributes, P business keys, Q relationships"). Read-only with edit links navigating back to detail pages — the documented "no write path on the canvas" intent is honored.

Tracked at [#470](https://github.com/roballred/GovEA/issues/470) (now closed by the implementation PR). Confirmed during the Data Modeler persona journey audit ([#569](https://github.com/roballred/GovEA/issues/569)).

## Out of Scope (v1)

- Edit-from-diagram (creating or deleting objects from the canvas) — would re-open the question of where the authoritative editing surface lives. Deferred to a separate issue
- Export to PNG / SVG — useful but not required for the read-only viewing use case
- Automatic layout improvements beyond what the chosen library provides — fine to ship with the library's default plus minimal manual hints

## Links

- Depends on: `da-physical-metamodel`
- Related: `po-capability-map` (precedent for a read-only diagram surface inside GovEA)
