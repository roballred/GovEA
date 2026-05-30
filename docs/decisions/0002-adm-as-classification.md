# ADR-0002: ADM Stages as Optional Classification

**Status:** Accepted
**Date:** 2026-05-30
**Amends:** [ADR-0001](./0001-togaf-adm-scope.md) (consequence #3)
**Issues:** [#665](https://github.com/roballred/GovEA/issues/665), [#313](https://github.com/roballred/GovEA/issues/313)

---

## Context

[ADR-0001](./0001-togaf-adm-scope.md) (Accepted, 2026-04-26) adopted "Option B": TOGAF as an optional, org-level overlay with **no ADM enforcement**. Its consequence #3 stated:

> ADM phase tracking is explicitly out of scope for v1 and v2. There is no modelling of ADM phases (Preliminary, A through H, Requirements Management) as workflow states. There are no phase-gated approvals, phase transition rules, or ADM-structured dashboards. Implementing this would require validated demand from real government users who cannot adopt GovEA without it.

ADR-0001 also required that any change to this position be made through a **new ADR**.

Two things have changed since 2026-04-26:

1. **The architectural direction shifted from a hard-coded overlay to taxonomy-backed configuration** (#665, #313, and `docs/design/togaf-recipe-reconciliation.md`). TOGAF concepts — including Architecture Domains — are being reframed as ordinary taxonomy types installed by an admin-run recipe, not as bespoke product features.
2. **The lead architect has set the direction** that ADM stages should be available as a taxonomy type (one of the recipe's example types), purely as a classification vocabulary an architect can tag work with — not as a workflow.

ADR-0001's consequence #3 conflated two distinct things: ADM **as enforced workflow** (phase gates, approvals, transition rules) and ADM **as classification** (a label you can put on a record). The first remains undesirable for GovEA's EasyEA-first positioning. The second is just another taxonomy type and is consistent with how every other classification in GovEA already works.

---

## Decision

**ADM stages are permitted as an optional classification taxonomy. ADM as enforced workflow remains out of scope.**

Specifically, amending ADR-0001 consequence #3:

1. **ADM stages MAY exist as a taxonomy type** (e.g. a type named "ADM Phase" with values Preliminary, A: Architecture Vision, … H: Architecture Change Management, Requirements Management). They are created by the TOGAF recipe like any other taxonomy type — a parent `taxonomy_terms` row with child value rows — and bound to entities via `entity_taxonomy_definitions`.

2. **ADM stages are classification only.** A record may be *tagged* with an ADM phase. There is:
   - **no phase-gated approval** — tagging a record with "C: Information Systems Architectures" grants or blocks nothing;
   - **no phase transition rule** — any record can carry any phase, changed freely at any time;
   - **no ADM-structured workflow or required progression** — GovEA does not model moving an org "through" the ADM.

3. **Reporting on ADM tags is permitted** as read-only classification reporting (e.g. "which capabilities are tagged to which phase"). This is the same generic group-by-taxonomy-type reporting available for any type. It is not an ADM governance dashboard and asserts no conformance.

4. **The EasyEA workflow remains the default and primary value proposition**, unchanged. ADM tags are invisible to organisations that do not install the TOGAF recipe, and — via the framework `audience` flag (see below) — invisible to non-architect roles and stakeholder-facing reports even when installed.

5. **What still requires a further ADR:** any move from classification to *enforcement* — phase gates, approvals tied to phase, mandatory progression, or presenting ADM as a required operating model. That bar (validated demand from at least two government organisations, plus design review) carries forward from ADR-0001 unchanged for the enforcement case.

---

## Rationale

**Why this is consistent with ADR-0001's intent, not a reversal:**
ADR-0001's concern was that "TOGAF scaffolding can become a constraint — teams implementing all of TOGAF lose stakeholder patience before delivering value." That risk lives entirely in *enforcement* — phase gates and mandatory progression. A label an architect can optionally apply carries none of that weight. ADR-0001 already permits tagging capabilities and applications with TOGAF **domain** labels ("annotation, not enforcement"); ADM-as-classification is the same kind of annotation applied to a different vocabulary.

**Why allow it now:**
Once TOGAF support is taxonomy-backed, *excluding* ADM as a taxonomy type would require special-case code to forbid one specific vocabulary — more complexity to prevent a capability, not less. Permitting ADM-as-classification is the simpler, more honest position: the taxonomy system treats it like everything else, and the recipe ships it as an example type.

**Why keep the enforcement bar:**
Nothing in the market research changed the conclusion that ADM *workflow* enforcement is wrong for GovEA's positioning. This ADR narrows ADR-0001's prohibition to where it belongs (enforcement) rather than abandoning it.

---

## Consequences

- The TOGAF recipe (#665, Slice 2) MAY install an "ADM Phase" taxonomy type and bind it to capabilities and/or initiatives as optional classification.
- ADM-tag reporting is available through the generic group-by-taxonomy-type report engine (#665, Slice 3). No bespoke ADM dashboard is built.
- Framework taxonomy types (TOGAF domains, ADM phase) carry an `audience: 'framework'` marker so they remain invisible to viewer-role users and to stakeholder-facing reports by default, preserving ADR-0001's "no framework jargon for Department Directors" guarantee without the now-removed overlay toggle.
- No phase-gating, approval, or transition logic is introduced anywhere. Any future attempt to add it requires a new ADR and the two-org demand bar.
- ADR-0001 remains in force in all other respects; only its consequence #3 is narrowed by this decision.

---

## Related

- [ADR-0001](./0001-togaf-adm-scope.md) — TOGAF and ADM scope boundary (amended by this ADR)
- [`docs/design/togaf-recipe-reconciliation.md`](../design/togaf-recipe-reconciliation.md) — recipe/taxonomy reconciliation and resolved decisions
- [#665](https://github.com/roballred/GovEA/issues/665) — replace TOGAF overlay with taxonomy-backed recipe
- [#313](https://github.com/roballred/GovEA/issues/313) — taxonomy-backed TOGAF domains and ADM stages
- [EasyEA methodology](https://github.com/roballred/EasyEA)
