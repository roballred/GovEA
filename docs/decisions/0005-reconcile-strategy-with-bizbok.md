# ADR-0005: Reconcile the Strategy entity with BIZBOK alignment

**Status:** Proposed — decision pending (revisits [ADR-0004](./0004-strategy-as-planning-container.md))
**Date:** 2026-06-16
**Issues:** [#822](https://github.com/roballred/GovEA/issues/822), tracker [#805](https://github.com/roballred/GovEA/issues/805)
**Design:** [`docs/design/strategy-entity.md`](../design/strategy-entity.md)

---

## Context

ADR-0004 added a first-class **Strategy** as a *planning-period container above
Goals* (`Strategy → Goals → Objectives → Initiatives → Capabilities`), enforced
by `goals.strategy_id` and a single-`adopted`-per-org index. Slices 1–4 shipped
on that shape (schema, views, Strategy↔Goal linking, traceability root).

On review the question was raised: **does this align with BIZBOK / the Business
Motivation Model (BMM)?** It exposes a real semantic tension.

### The two meanings of "Strategy"

- **BMM/BIZBOK sense — Strategy is a *means*.** Goals and Objectives are *ends*
  ("what we want"); a Strategy is a *course of action* chosen to achieve a Goal.
  The relationship is **Goal → realized by → Strategy**. Strategy is *below*
  Goals, not above them. BIZBOK then maps strategy onto the operating model —
  the **Capability** and **Value Stream** core domains, which are **cross-mapped
  peers** (value-stream stages are *enabled by* capabilities), not a parent/child
  chain. Metrics measure objectives.

- **Government "Strategic Plan" sense — a *container*.** The multi-year plan
  *document* that frames and holds an agency's goals and objectives. This sits
  *above* everything. This is what ADR-0004 modeled, but it *named* it
  "Strategy" — colliding with the BIZBOK meaning the Enterprise Architect persona
  expects.

### What GovEA already has

GovEA's shipped model is already substantially BIZBOK-aligned **at the Objective
level**: `objective → capabilities` (`objectiveCapabilities`) **and** `objective
→ value streams` (`objectiveValueStreams`) both exist, and Initiatives are the
funded courses of action. So the Objective is already the unit that cross-maps
strategy onto the operating model. The ADR-0004 "Strategy" adds only a
planning-period frame on top of Goals — it does **not** add the strategy→
operating-model alignment (that was already there).

This matters: the choice is **not** "should strategy reach value streams and
capabilities" (it already does, via objectives) but **"what is the new Strategy
layer for, and where does it sit relative to Goals?"**

### Why now

This is precisely the modeling question **Gate A (#668)** was meant to validate
before the schema landed — whether a real coordinator/director wants a *plan
record* vs. *goals with a horizon*. We started the schema ahead of that gate
(#812), so we are paying that bill now, before slices 5–6 and before any real
tenant data exists (`db:push`, no migrations — schema changes are still cheap).

---

## Options

### Option 1 — Keep ADR-0004 as-is ("Strategy" container)

No change. Strategy stays a container named "Strategy" above Goals.

- **Schema delta:** none.
- **Rework:** none.
- **Pros:** zero cost; matches the government "strategic plan" mental model;
  preserves slices 1–4.
- **Cons:** inverts BMM ends-means; a BIZBOK-literate EA reads "Strategy contains
  Goals" as backwards; the name overloads a term that already means something
  specific in the methodology GovEA is built on (EasyEA/BIZBOK lineage).

### Option 2 — Keep the container shape, rename to "Strategic Plan" (recommended)

Keep everything ADR-0004 built; rename the concept to **Strategic Plan** so it no
longer collides with BIZBOK's "Strategy = course of action." The BIZBOK "strategy
as a means" role is left to **Objectives + Initiatives**, which already play it
and already cross-map to capabilities and value streams.

- **Schema delta (pre-prod, `db:push`):** rename `strategies` → `strategic_plans`,
  `strategy_status` → `strategic_plan_status`, `goals.strategy_id` →
  `goals.strategic_plan_id`; module key `strategies` → `strategic-plans`; routes
  `/strategies` → `/strategic-plans`; trace root `from=strategy` →
  `from=strategic-plan`. Mechanical; no relationship changes. (Label-only — keep
  table names, change UI strings — is even cheaper but leaves a name mismatch for
  maintainers; a full rename is preferred while we are pre-data.)
- **Rework:** rename pass across slices 1–4 (find/replace + tests); no model
  redesign. Roughly a day.
- **Pros:** removes the BIZBOK collision for ~the cost of a rename; keeps the
  genuinely useful gov feature (a plan container with a "current/adopted" plan);
  honest about what the entity is.
- **Cons:** still no first-class "strategy as a chosen approach" entity (if a
  stakeholder actually wants one, that is Option 3 later).

### Option 3 — Pivot to a BIZBOK course-of-action Strategy

Make Strategy a *means*: it realizes a Goal/Objective and cross-maps to the
operating model. Shape becomes roughly
`Goal → Objective (ends) → Strategy (means) → {Value Streams ⇄ Capabilities}`,
with Initiatives as delivery.

- **Schema delta:** drop `goals.strategy_id` (Strategy no longer *contains*
  goals); add junctions `strategy ↔ goal/objective` (achieves),
  `strategy ↔ capability` and `strategy ↔ value_stream` (impacts), and likely
  `strategy ↔ initiative` (delivered by). Lifecycle/`adopted` semantics need
  rethinking (a "current strategy" is less obviously single).
- **Rework:** reworks **all four merged slices** — schema, views, linking
  direction, and the traceability root all change. Several days, plus a clear
  boundary statement vs. Strategic Objective and Initiative (both are also
  "means") to avoid three overlapping concepts.
- **Pros:** the most BIZBOK-faithful; strongest for the Enterprise Architect
  persona and capability-/value-stream-based planning.
- **Cons:** highest cost; risks redundancy with Objective/Initiative; removes the
  simple "agency strategic plan" container that the gov audience expects unless
  re-added separately. Overlaps with the Gate B boundary work (#694, #791).

---

## Recommendation

**Option 2 (rename to "Strategic Plan"), pending one Gate A data point.** It
removes the real problem (the BIZBOK naming collision) at rename cost, keeps the
feature government users actually recognize, and leans on the fact that GovEA
*already* expresses BIZBOK strategy→operating-model alignment through Objectives.

Option 3 is the right answer **only if** a real coordinator/director says they
want to model "our chosen approach/course of action" as a distinct record (not
just goals, objectives, and initiatives). That is a #668 interview question, and
it is cheap to ask before committing several days of rework. Until then, Option 3
is speculative.

Option 1 is not recommended: the naming tension is real and only gets more
expensive to fix as more surfaces (slices 5–6) adopt the term.

## Consequences

- **Slice 5 (#805) is paused** until this is decided — it would otherwise spread
  the "Strategy" term across Dashboard/Roadmap/Executive surfaces we may rename.
- If **Option 2** is accepted: this ADR supersedes ADR-0004's naming; a rename PR
  updates slices 1–4 and `strategy-entity.md`; slices 5–6 proceed as "Strategic
  Plan." The single-`adopted` "current plan" invariant is retained.
- If **Option 3** is accepted: this ADR supersedes ADR-0004 outright; a redesign
  issue replaces the remaining slice list, and the Gate B boundary statements
  (#694, #791) are folded in.
- Either way, the #668 interview should explicitly test the container-vs-approach
  question so the next planning entity is validated, not assumed.
