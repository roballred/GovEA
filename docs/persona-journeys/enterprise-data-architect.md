# Persona Journey — Enterprise Data Architect

**Persona file:** [`business-architecture/personas/enterprise-data-architect.md`](../../business-architecture/personas/enterprise-data-architect.md)
**Capability anchors:** [`ea/data-architecture`](../../business-architecture/capabilities/ea/data-architecture/) group — `da-physical-metamodel`, `da-chen-visualization`; plus `rm-architecture-debt`.
**Walk audited:** 2026-05-19 — eleventh persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #572](https://github.com/roballred/GovEA/issues/572))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `alice@govea.dev` (Riverdale Admin) — exercises the governance / oversight RBAC level appropriate for a reviewer persona.

This is the **sibling-reviewer walk** to the Data Modeler audit ([#569](https://github.com/roballred/GovEA/issues/569)). Same data-architecture surface area; the lens is *can this persona defend the model's scorecard?* rather than *can they author it?*

## Canonical journey

1. Sign in as Admin.
2. Open `/data` overview — look for aggregate quality / completeness signals.
3. Open `/data/entities` — look for per-row quality cues.
4. Open `/data/diagram` — assess stakeholder-presentation-readiness.
5. Open `/debt` — assess data-layer debt support.
6. Cross-reference against the persona's scorecard / governance needs.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`alice@govea.dev`) | **Works** | Same admin-dashboard landing as prior walks. Covered by [#548](https://github.com/roballred/GovEA/issues/548) in epic [#556](https://github.com/roballred/GovEA/issues/556). |
| 2 | `/data` overview | **Partial** | Counts render (3 entities / 11 attributes / 4 links / 7 business keys), descriptive framing is plain-language and accurate. **No model-quality signals** — no completeness percentage, no "X entities lack owner attribution," no review-recency. The persona's primary deliverable need ("defending the scorecard") has no surface today. Gap [#573](https://github.com/roballred/GovEA/issues/573). |
| 3 | `/data/entities` list | **Works (object level) / Missing (aggregate)** | Per-row table works correctly. No per-row quality column. No filter by completeness state. Roll-up of "items needing attention" is absent. Same gap [#573](https://github.com/roballred/GovEA/issues/573). |
| 4 | `/data/diagram` (Chen) | **Works very well** | Same finding as Data Modeler walk ([#569](https://github.com/roballred/GovEA/issues/569)). The diagram is genuinely presentation-ready — the kind of visual the persona's critical insight ("explain the resulting model in plain language to non-technical stakeholders") asks for. |
| 5 | `/debt` page | **Works (empty) / mis-documented** | `/debt` route is live with filter chips for exactly the documented debt types (`lifecycle-risk` / `capability-gap` / `decision-drift` / `known-shortcut` / `unreviewed`). No data-layer-specific debt type (query performance, schema drift, space utilization — explicitly mentioned in the persona file). Page is empty in the dev seed; functionality vs. data is unclear at first glance. **Capability doc [`rm-architecture-debt.md`](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md) says "Not yet implemented" twice** — fourth such doc-hygiene observation across walks. Flagged in [#573](https://github.com/roballred/GovEA/issues/573). |
| 6 | Conceptual ↔ logical ↔ physical traceability | **Partial (implicit)** | The persona explicitly wants to *"trace conceptual subject areas through logical entities to physical tables."* The Data Vault metamodel only models the physical layer. Conceptual entities live elsewhere (Capabilities, glossary terms). The cross-layer linkage exists implicitly (an entity's owner is a persona; a capability can be described with metamodel concepts) but is not an explicit traceability surface. Not filed as a separate gap — capability scope question, not a bug. |

**Tally:** 2 works · 1 works-very-well · 1 works-empty-with-doc-issue · 2 partial-aggregate-missing. No new blockers.

## Findings

### Gap filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#573](https://github.com/roballred/GovEA/issues/573) | Medium (persona-foundational, scorecard need) | No model-quality signals or scorecard surface for the data architecture metamodel. Three-layer suggested approach: per-row quality cues (cheap), roll-up panel on `/data` (medium), explicit scorecard view (heaviest; validation-gated). |

### Doc-hygiene observation — pattern is now clear

Four capability docs are out of sync with shipped code:

| Capability file | Doc says | Reality |
|---|---|---|
| Multiple in `admin-configuration/` | (no `Implementation Status` section at all) | Partly shipped |
| Multiple in `frontend-display/` | (no `Implementation Status` section at all) | Partly shipped |
| [`da-chen-visualization.md`](../../business-architecture/capabilities/ea/data-architecture/da-chen-visualization.md) | "Planned — not yet implemented" | Shipped at `/data/diagram` |
| [`rm-architecture-debt.md`](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md) | "Not yet implemented" (twice) | `/debt` route + filter chips + create/edit/detail pages all live |

Worth a single follow-up docs PR. Not filing a separate issue; the pattern is captured here, in [#570](https://github.com/roballred/GovEA/issues/570), and in the data-modeler / cms-administrator walk reports.

### Existing gaps that apply equally

- [#570](https://github.com/roballred/GovEA/issues/570) — Hub naming-standard hints. The reviewer persona benefits from these even more than the modeler does (one-glance compliance check).
- [#553](https://github.com/roballred/GovEA/issues/553) — publish/last-updated dates missing. Particularly affects this persona's "review-recency" need.
- [#566](https://github.com/roballred/GovEA/issues/566), [#567](https://github.com/roballred/GovEA/issues/567) — authoring gaps apply to whoever the EDA delegates modeling to.
- Viewer Experience epic [#556](https://github.com/roballred/GovEA/issues/556) — applies wholesale.

### Strong positives — carried from Data Modeler walk

- The Data Vault metamodel implementation is comprehensive. Schema, CRUD, owner attribution, three relationship categories all shipped.
- Chen Notation diagram is genuinely presentation-ready — the persona's "explain in plain language to non-technical stakeholders" need is met by an existing surface.
- Contributor / Admin RBAC distinction works correctly (no leaked Admin-only affordances when I was signed in as Carol earlier; no missing Admin actions now as Alice).

### Persona-validation note

Persona is still **Assumed**. The persona file itself notes that the role description was developed from one SME's practice (Nichole) and needs validation across other practitioners. [#573](https://github.com/roballred/GovEA/issues/573)'s Layer 3 (explicit Hoberman scorecard view) is explicitly validation-gated for this reason — Layers 1 and 2 hold regardless of the persona's specific scorecard framing.

## Cumulative state after eleven walks

- **5 / 16 personas remaining.**
- Two data-architecture walks now done (Data Modeler [#569](https://github.com/roballred/GovEA/issues/569), this one). Combined finding: the data-architecture metamodel implementation is the most thorough single-area surface in GovEA, but it's optimized for the *modeler's screen* — the reviewer's screen (scorecards, roll-ups, governance) is the gap.
- Doc-hygiene pattern is now firmly established across four files. A single docs PR to backfill `Implementation Status` sections is high-leverage and overdue.

## Recommended follow-up

1. **[#573](https://github.com/roballred/GovEA/issues/573) Layer 1 + Layer 2 is the cheapest, highest-leverage data-architecture review fix.** Per-row quality cues + roll-up panel on `/data` overview — addresses the persona's named need without committing to the full Hoberman scorecard.
2. **Capability-doc backfill PR** — update `da-chen-visualization.md`, `rm-architecture-debt.md`, and the `admin-configuration` + `frontend-display` files I've flagged in prior walks. Should land before any further persona walks if possible — saves the reader-of-docs from confusion.
3. **Next persona walk** — three candidates remaining that exercise different surface areas:
   - [`domain-architect`](business-architecture/personas/domain-architect.md) — focuses on a single subject-area model (e.g., Finance, HR). Would exercise capability-domain navigation and cross-capability relationships.
   - [`programme-director`](business-architecture/personas/programme-director.md) — programme-portfolio lens; would exercise initiative + objective + roadmap interactions deeply, now that [#561](https://github.com/roballred/GovEA/pull/561) lands those paths.
   - [`consultant-si`](business-architecture/personas/consultant-si.md) — outside-systems-integrator perspective; would surface multi-tenant / data-handoff concerns.

   Recommend `programme-director` next — exercises a different capability cluster (planning + objectives + initiatives) that the audit has only lightly touched, and validates the [#561](https://github.com/roballred/GovEA/pull/561) fix end-to-end from a persona who actually needs the surface.
