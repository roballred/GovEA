# Design: Value Chains in GovEA

**Status:** Accepted — v1 spine shipped (capability value-chain taxonomy); read view + richer scope still gated on #668
**Issue:** [#694](https://github.com/roballred/GovEA/issues/694)
**Capabilities:** `po-value-streams`, `fd-traceability-views`, `rm-end-to-end-traceability`
**Personas:** Enterprise Architect (Central IT), Agency EA Coordinator, Department Director
**Related:** `business-architecture/capabilities/cms/portfolio/po-value-streams.md` (shipped value streams), market research `~/Claude/ea-research/` (value-chain market analysis), #668 (persona validation), #671 (recipe engine — possible delivery vehicle for seeded chains)

---

## Why this doc exists

#694 asks us to decide **whether "Value Chain" should be a distinct content type, a curated view over existing records, or a taxonomy-backed grouping** — without duplicating value-stream authoring or adding a diagramming burden. This doc makes the product distinction, evaluates the three options against GovEA's existing model and the market evidence, recommends one, and lists the inputs that gate finalizing it.

> **Bottom line:** Recommend **Option C (taxonomy-backed grouping) as the spine + Option B (curated read view) as the presentation** — *not* a new staged-authoring entity. A value chain becomes a lightweight named grouping that capabilities (and optionally value streams/services) belong to, rendered as a read-oriented traceability view that composes records GovEA already links. This matches how government reference architectures actually model value chains (top-level grouping of capabilities), reuses the exact capabilities tagged on this issue, and keeps the concept people-centered. **Gate the *richer* build on #668 validation.**

> **Decision update (owner-directed):** Proceed now with the **Option C spine, capabilities-only** — a "Value Chain" taxonomy on the `capability` entity, exactly like the existing Domain / Capability Priority taxonomies. It needs no new code (the entity-taxonomy mechanism already supports it) and is trivially reversible, so it doesn't wait on #668. **Shipped:** seeded "Value Chain" taxonomy type + `entity_taxonomy_definition` for capabilities (`db/seeds/run.ts`). **Still gated on #668:** the curated read view (Option B), value-stream/service membership, and any first-class-entity upgrade (§6 deferred list).

---

## 1. Value Chain vs Value Stream — the product distinction

This is the definitional output #694 needs. In GovEA terms:

| | **Value Stream** (shipped) | **Value Chain** (proposed) |
|---|---|---|
| Question it answers | "How does *one* outcome get delivered, stage by stage?" | "How do *multiple* services, streams, capabilities, and orgs combine to deliver an end-to-end public outcome?" |
| Shape | Authored, **ordered stages**, each linked to capabilities + a stakeholder persona | A **named grouping / lens** over existing records — not re-authored stages |
| Granularity | One stakeholder-triggered flow | The L0 frame above streams/capabilities |
| Authoring burden | Deliberate authoring activity | Near-zero new authoring; composes what exists |
| Analogy | A process / journey | The "value chain banner" at the top of a capability map |

Critically, the value chain is **not** a Porter strategic-margin entity (margin / competitive advantage don't map to government), and it is **not** a second staged-authoring object (that would duplicate value streams). It is the **top-level organizing grouping** that a government business architect expects above the capability map — which is exactly how the recognized state-government Business Reference Architectures structure it (value chains → capabilities).

## 2. Market & methodology context

- **Whitespace, with real demand.** Across 7 leading EA tools (market research, 2026), "value chain" as a first-class construct appears in **none** — yet it *is* the top-level frame in authoritative US state-government reference architectures (e.g. Info-Tech's BRA links value chains directly to capabilities). Absent in tools + present in the gov standard = a genuine differentiator opportunity, not a gap to copy a competitor on.
- **EasyEA philosophy.** Lightweight, people-centered, "not a diagramming burden." This pushes hard away from Option A (heavy new entity) and toward a grouping + readable view.
- **Government framing.** "Value" = public outcome delivered to a stakeholder (GovEA already reframed this correctly in value streams via `value_item` → persona). A value chain should explain *delivery of public value*, not introduce private-sector strategy modeling.

## 3. The three options

### Option A — Value Chain as a distinct first-class content type
A new authored entity with its own records, stages, workflow, and links.
- **Pros:** Maximum flexibility; explicit object to attach everything to.
- **Cons:** Duplicates value-stream authoring; adds a diagramming/authoring burden #694 explicitly warns against; heaviest build; highest risk of becoming "another inventory object." **Rejected.**

### Option B — Value Chain as a curated/saved traceability view
A read-oriented view that composes existing records (services → value streams → capabilities → applications/risk) into a named chain.
- **Pros:** No new authoring; reuses `fd-traceability-views` + `rm-end-to-end-traceability`; readable, outcome-centered.
- **Cons:** Without a persisted anchor, "which records belong to this chain" is implicit/heuristic; hard to curate or seed deliberately.

### Option C — Taxonomy-backed grouping over existing records
A value chain is a lightweight named term; capabilities (and optionally value streams/services) are tagged into it, same pattern as GovEA's existing taxonomy + entity-taxonomy links.
- **Pros:** Tiny model change; reuses taxonomy + `entity_taxonomy_values` machinery; matches the gov-BRA "value chain → capability" structure directly; seedable/installable (e.g. via the recipe engine #671); authorable by EA *and* Agency Coordinators like any taxonomy.
- **Cons:** A grouping alone isn't a "readable chain" — it needs a view to be useful.

### Recommended: **C (spine) + B (presentation)**
Persist the chain as a **taxonomy-backed grouping** (the explicit, seedable anchor) and render it through a **curated traceability view** that walks from public outcome → services/value streams → capabilities → supporting applications, surfacing existing risk/debt. This gives a real, curatable object *and* a people-centered readable chain, with almost no new authoring and full reuse of shipped machinery.

## 4. How it maps to the existing model (reuse, not duplication)

- **Anchor:** a `value-chain` taxonomy type; each chain is a term under it (org-scoped, slug-keyed — the `(org, parent, slug)` uniqueness from #684/#685 already supports clean upsert/seed).
- **Membership:** capabilities (and optionally value streams, services) link to a chain term via the existing `entity_taxonomy_values` pattern — no new junction tables for v1.
- **View:** extend traceability views to render a chain by following existing links (value stream → stage capabilities; service → capability; objective → value stream). No new authoring path; value streams are untouched (AC: "do not rename or collapse").
- **Federation/visibility:** each hop respects its own visibility + org-connection rules; a cross-org chain shows another org's records only where a connection is approved — reuse existing federation guards, invent nothing.

## 5. Answers to #694's design questions

1. **EA-only or also Agency Coordinators?** Both — a taxonomy-backed grouping is naturally org-scoped and authorable by contributors, like other taxonomy.
2. **Own workflow/visibility or inherited?** The chain grouping carries minimal metadata (name, description, visibility); **each linked record keeps its own visibility/federation** so the view never leaks. No separate heavy workflow in v1.
3. **Relation to goals/objectives?** Derive through value streams primarily; allow a direct link where useful. Keep minimal in v1.
4. **Minimum useful v1?** Named chain (taxonomy term) + capability/value-stream membership + a readable composed view. **Gap/risk scoring is v2.**
5. **Cross-org approval?** Yes — reuse existing org-connection approval; unapproved orgs' records do not appear in the chain view.

## 6. Proposed v1 scope (minimal) vs deferred

**v1:** value-chain taxonomy type; tag capabilities/value streams into a chain; read-only chain detail view (outcome → streams → capabilities → apps, with existing risk surfaced); seeded demo (one cross-service chain, one single-org chain); tests for read visibility, link integrity, viewer-safe rendering.

**Deferred to v2:** gap/risk *scoring*, dedicated chain workflow status, visual chain map/diagram, direct authoring of chain-specific stages.

## 7. Why this is Proposed, not Accepted — gating inputs

Two inputs should land before committing engineering:

1. **The reference-architecture structure.** The recommendation assumes the gov BRA models value chains as a top-level grouping of capabilities. The specific L0 chain list, cardinality (one capability → one chain vs. many), and tier depth from the operator's **Info-Tech state-government BRA** should be confirmed to finalize the taxonomy shape. *(Note licensing: GovEA cannot ship Info-Tech's proprietary content; seed from public-domain sources — NASCIO, federal BRM — or operator-provided content.)*
2. **Validation (#668).** This is differentiator-track. One Tier-1 persona interview should confirm gov architects want a value-chain layer and that the grouping-over-capabilities framing matches their mental model, before building.

## 8. Follow-up issues if accepted

- `feat(taxonomy): value-chain taxonomy type + capability/value-stream membership` (v1 model)
- `feat(views): value-chain read view composing streams → capabilities → apps` (v1 view)
- `feat(seed): cross-service and single-org value-chain demo content`
- (v2) `feat(value-chain): gap/risk surfacing on a critical chain`
- Possibly delivered as a **recipe** (#671) so a gov reference value-chain set installs as starter content.
