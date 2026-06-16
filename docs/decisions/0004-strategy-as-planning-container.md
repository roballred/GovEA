# ADR-0004: Strategy as a planning container above Goals

**Status:** Superseded by [ADR-0005](./0005-reconcile-strategy-with-bizbok.md) (2026-06-16). The container-above-Goals shape inverted the BMM/BIZBOK ends-means relationship; Strategy is being reworked into a course-of-action *means*. Retained for history.
**Date:** 2026-06-13
**Issues:** [#697](https://github.com/roballred/GovEA/issues/697)
**Design:** [`docs/design/strategy-entity.md`](../design/strategy-entity.md)

---

## Context

GovEA's shipped planning model is Goal → Strategic Objective → Initiative, with
Roadmap as a view. There is no first-class **Strategy** record, so a user cannot
answer "which strategy does this goal belong to?" or "what planning horizon is
this part of?" without relying on naming conventions or free text.

#697 asks for a Strategy entity, but explicitly as a **design slice**: the
existing hierarchy is clean and useful, and the risk is that Strategy either
blurs that hierarchy or degrades into a static document upload. The open
questions are whether Strategy is one-per-org or many, what lifecycle it uses,
and whether Goals belong to one Strategy or many.

## Decision

Adopt a **lightweight Strategy container** above Goals, with these load-bearing
choices (full rationale in the design doc):

1. **Strategy is a planning container, not a document.** It holds Goals and a
   planning-period frame (horizon, owner, dates, summary). The strategic
   *content* is its Goals — themes and priorities are modeled as Goals, not a
   new sub-entity.
2. **A Goal belongs to at most one Strategy** — a nullable `goals.strategy_id`
   many-to-one FK, not a join table. `null` is valid (every existing goal stays
   valid). This keeps "one strategy per goal" true by construction.
3. **Planning-specific lifecycle:** `draft` → `adopted` → `superseded` →
   `retired`, with **at most one `adopted` strategy per org** enforced by a
   partial unique index. The adopted strategy is "the current strategy" that
   executive/dashboard surfaces read.
4. **Strategy is a traceability root** above Goals
   (`from=strategy`), pruning non-viewer-visible nodes exactly as existing roots
   do. No new visibility semantics.
5. **No new top-level navigation** — a `strategies` module under the existing
   Strategy module group, gated by module settings.

## Consequences

- The only change below Goals is an optional `strategy_id` column; the
  Objective/Initiative model is untouched. Back-compat is total (existing goals
  have `strategy_id = null`).
- "Current strategy" is a single DB-enforced fact, cheap to read on any surface.
- Adoption is a server action: adopting a strategy supersedes the previously
  adopted one in the same transaction, preserving the single-adopted invariant.
- **Implementation is gated**, not greenlit by this ADR: (a) the persona value is
  assumed until the first Tier-1 interview (#668) confirms a real director/
  coordinator wants a strategy *record*; (b) the Strategy/value-chain (#694) and
  Strategy/service-product (#791) boundaries are stated before build. The
  successor tracker issue carries the slice list and these gates.
- Changing any of decisions 1–3 later (e.g. allowing a Goal in multiple
  Strategies) requires a new ADR — the column shape and the single-adopted index
  bake these in.
