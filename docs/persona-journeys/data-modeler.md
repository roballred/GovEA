# Persona Journey — Data Modeler

**Persona file:** [`business-architecture/personas/data-modeler.md`](../../business-architecture/personas/data-modeler.md)
**Capability anchors:** [`ea/data-architecture`](../../business-architecture/capabilities/ea/data-architecture/) group — `da-physical-metamodel`, `da-chen-visualization`.
**Walk audited:** 2026-05-19 — tenth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #569](https://github.com/roballred/GovEA/issues/569))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `carol@govea.dev` (Riverdale Contributor — same role as the Junior EA Analyst walk; the data-modeler persona is contributor-shaped in GovEA's RBAC).

This is the **first walk that touches the data-architecture surfaces** (`/data/**`). None of the prior nine walks exercised these routes. The walk's emphasis is the persona's stated need to treat *metadata as a first-class deliverable* — definitions, naming, owner attribution, physical-layer hand-off metadata.

## Canonical journey

1. Sign in as Contributor.
2. Open Data Architecture Overview (`/data`).
3. Open Entities list (`/data/entities`); inspect entity create form.
4. Open Entity detail page; check metadata fidelity and relationships.
5. Open Chen Notation Diagram (`/data/diagram`).
6. Cross-reference the implementation against the `ea/data-architecture` capability docs.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in | **Works** | Same dashboard landing as prior walks. Covered by [#548](https://github.com/roballred/GovEA/issues/548) in epic [#556](https://github.com/roballred/GovEA/issues/556). |
| 2 | Data Architecture Overview | **Works very well** | Plain-language framing: *"A Data Vault-aligned metamodel for Data Architects. Capture entities, attributes, links, and business keys with their physical-table metadata."* Four navigation tiles with live counts (Entities 3 / Attributes 11 / Links 4 / Business keys 7). "View diagram" link to `/data/diagram`. Good orientation page. |
| 3 | Entity create form (`/data/entities/new`) | **Works (with gap)** | Fields: Name (required) / Description / Status / Visibility / Physical Hub Table Name / Server / Database / Schema / Owners (persona multi-select). Captures every field the `da-physical-metamodel` capability doc lists. But Hub Table Name is a free-text input with **no naming-standard enforcement** (e.g., no `h_*` prefix check). Persona pain point #2. Gap [#570](https://github.com/roballred/GovEA/issues/570). |
| 4 | Entity detail (Customer) | **Works very well** | Renders: status badge, name, description, visibility, **Hub table** (`h_customer`), **Server** (`dw01`), **Database** (`riverdale_dv`), **Schema** (`raw_vault`), Owners (Enterprise Data Architect, Data Modeler), and three relationship categories — Related entities (1), Characterizing attributes (5), Instantiating business keys (3). All linked, all read-only. "Edit relationships" sub-page exists. **No publish/last-updated date** — same gap as [#553](https://github.com/roballred/GovEA/issues/553), applies symmetrically. |
| 5 | Chen Notation diagram (`/data/diagram`) | **Works very well — but capability doc is out of date** | Renders the full graph with rectangles (entities), ovals (attributes), underlined ovals (business keys), and diamonds with labelled relationships ("is related" / "shares" / "instantiates"). Filters work: Owner / Attribute type / Link type / free-text name. Shows live counts (3 entities / 11 attributes / 7 business keys / 21 relationships). Read-only with edit links back to detail pages — exactly the documented intent. **But [`da-chen-visualization.md`](business-architecture/capabilities/ea/data-architecture/da-chen-visualization.md) says "Planned — not yet implemented"** despite the implementation having shipped. Docs-hygiene observation; flagged in [#570](https://github.com/roballred/GovEA/issues/570) "Related" section. |
| 6 | Authoring-side gaps | **Inherited from junior-ea-analyst walk** | Same patterns — no duplicate-name check ([#566](https://github.com/roballred/GovEA/issues/566)), HTML5-only required-field validation, no unsaved-changes warning ([#567](https://github.com/roballred/GovEA/issues/567)). Apply unchanged to the data-architecture authoring surfaces. |

**Tally:** 3 works-very-well · 1 works-with-gap · 2 inherited-gaps. No new blockers.

## Findings

### Gap filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#570](https://github.com/roballred/GovEA/issues/570) | Medium (persona pain point #2) | No naming-standard enforcement on Data Vault physical-table fields (Hub / Satellite / Link table names). Suggested two-tier approach: soft hints + auto-suggest first, blur-validation second, org-level enforcement deferred. |

### Strong positives — worth preserving

- **The Data Vault metamodel is comprehensively implemented.** Schema + CRUD + relationships + owner junctions all shipped per #471/#472. Every field the `da-physical-metamodel` capability doc lists is captured and persisted. The metadata-as-first-class promise the persona makes is structurally honored.
- **Chen Notation visualization actually ships** (despite the capability doc claiming otherwise). Rectangles / ovals / diamonds / underlined-oval keys are all there; the three documented filters work; counts are accurate; deep links back to detail pages preserve the documented "read-only canvas" intent.
- **Entity detail page is a genuine "single source of truth"** for an entity. Status, physical-table metadata, owner attribution, three relationship categories all visible in one screen. This is exactly what `da-physical-metamodel`'s objective ("make the model an addressable part of the broader architecture repository") describes.
- **Relationship-editing sub-page** at `/data/entities/[id]/relationships` (and same shape for attributes) — keeps the edit form for basic fields uncluttered while still letting the modeler manage cross-object relationships authoritatively.

### Existing gaps that apply equally

| Existing | Coverage |
|---|---|
| [#566](https://github.com/roballred/GovEA/issues/566) | Duplicate-name not checked — same gap across the data-architecture create paths. |
| [#567](https://github.com/roballred/GovEA/issues/567) | Unsaved-changes warning + richer required-field guidance — same gap on entity / attribute / business-key edit. |
| [#553](https://github.com/roballred/GovEA/issues/553) | Publish/last-updated date missing on entity / attribute / business-key detail pages — same symmetric gap. |
| [#548](https://github.com/roballred/GovEA/issues/548) (in [#556](https://github.com/roballred/GovEA/issues/556)) | Admin-shaped dashboard landing — applies to Contributor too. |

### Capability-doc hygiene observation

[`da-chen-visualization.md`](../../business-architecture/capabilities/ea/data-architecture/da-chen-visualization.md) reads *"**Planned — not yet implemented.** Tracked at #470."* The implementation has actually shipped — confirmed live in `/data/diagram`. The capability doc should be updated to Implementation Status: Shipped (v1). Trivial doc-only PR; flagged in [#570](https://github.com/roballred/GovEA/issues/570) but not filed as a separate issue. Same pattern as the `admin-configuration` and `frontend-display` hygiene observations from earlier walks.

### Persona-validation note

Persona is still **Assumed**. The persona file itself flags that the role boundary between Data Modeler, Business Analyst, and DBA is described from one SME's practice; validation across other organizations is required. The walk's gaps stand regardless of persona-validation outcomes — naming-standard hints don't depend on the persona's role boundary, just on whether the org chose Data Vault. The bigger validation question (would real state/local government data modelers actually adopt GovEA for this work vs. their existing modeling tool?) is out of scope for an audit.

## Cumulative state after ten walks

- **6 / 16 personas remaining.**
- Pattern: each authoring walk now produces 1–2 net-new gaps + confirms several from the cumulative pile.
- The Data Vault metamodel implementation is the most comprehensive single-area surface in GovEA — strongest "matches the capability doc" alignment of any area surfaced so far.
- Three doc-hygiene observations now collected (admin-configuration, frontend-display, data-architecture) — worth a single follow-up docs PR rather than three separate issues. Not filed.

## Recommended follow-up

1. **[#570](https://github.com/roballred/GovEA/issues/570) (naming-standard hints) is the highest-leverage data-architecture authoring fix.** Tier 1 (soft hint + auto-suggest) is mechanically cheap and addresses the persona's named pain point. Tier 3 (org-level enforcement toggle) should wait for persona validation.
2. **Tiny docs PR** to update `da-chen-visualization.md` from "Planned" to "Shipped (v1)." Trivial; could ride along with #570 or any data-architecture PR.
3. **Next persona walk: [`enterprise-data-architect`](business-architecture/personas/enterprise-data-architect.md)** — sibling persona that *reviews* what the Data Modeler builds. The Enterprise Data Architect walk will likely surface a different gap profile (scorecard-friendly summary views, model-quality signals, cross-modeler comparison) and validate or refine [#570](https://github.com/roballred/GovEA/issues/570)'s framing from the review side.
