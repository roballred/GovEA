# ADR-0005: Reconcile the Strategy entity with BIZBOK alignment

**Status:** Accepted — **Option 3 (BIZBOK course-of-action Strategy)**. Supersedes [ADR-0004](./0004-strategy-as-planning-container.md).
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

## Decision (2026-06-16)

**Option 3 is chosen.** Strategy becomes a BIZBOK course-of-action — a *means*
that pursues Goals and maps onto the operating model — superseding the ADR-0004
container. The maintainer accepted the rework cost over the cheaper rename to get
the BIZBOK-faithful model for the Enterprise Architect persona.

> The recommendation above was Option 2; the decision overrides it. As with the
> #812 schema-ahead-of-gate call, this is taken **without the Gate A (#668)
> interview** — recorded here so the override is auditable. The #668 interview
> should still test whether a separate "strategic plan container" is also wanted
> (if so, that is a *new, additional* entity later — not a reason to keep the
> ADR-0004 shape).

### Resolved model (the redesign these specifics seed)

The three "ends/means" concepts are kept distinct so we don't create three
overlapping records:

| Concept | BMM role | Question it answers | GovEA status |
|---|---|---|---|
| **Goal** | End | What broad outcome? | exists |
| **Strategic Objective** | End (measurable) | How do we measure progress toward the goal? | exists |
| **Strategy** | **Means — Course of Action** | What is our broad chosen *approach* to achieve the goal? | **new shape** |
| **Initiative** | Means — funded work (≈ Tactic) | What funded effort *delivers* the approach? | exists |

Load-bearing choices (these supersede ADR-0004 decisions 1–5):

1. **Strategy pursues Goals — many-to-many.** Junction `strategy_goals` (a
   strategy can serve several goals; a goal can be pursued by several
   strategies). The ADR-0004 `goals.strategy_id` column is **dropped**.
2. **Strategy maps onto the operating model.** Junctions `strategy_capabilities`
   and `strategy_value_streams` (with an optional `impact` label —
   `leverage`/`build`/`improve`/`retire` — mirroring `initiative_capabilities`),
   capturing what the approach leverages and changes. Value streams and
   capabilities stay cross-mapped peers; Strategy references both directly.
3. **Strategy is delivered by Initiatives.** Junction `strategy_initiatives`
   (the funded work that implements the approach). Objectives remain attached to
   Goals as today; Strategy does not own Objectives.
4. **Course-of-action lifecycle:** `proposed` → `active` → `achieved` →
   `abandoned` (mirrors the Initiative precedent; *not* a content publish). The
   ADR-0004 single-`adopted`-per-org invariant and partial unique index are
   **dropped** — multiple strategies can be active at once. ("Current strategy"
   surfaces become "active strategies.")
5. **No top-level nav change:** the `strategies` module stays under the Strategy
   group; the schema/relationships change beneath it.

### Boundary statements (Gate B — #694, #791)

- **Strategy vs. value-chain grouping (#694):** a value chain groups *value
  streams* (operating-model structure); a Strategy is a *chosen approach* that
  *references* value streams it affects. Different questions; Strategy links to
  value streams, it does not group them.
- **Strategy vs. service-product container (#791):** a service-product is a
  *delivery container* for what the org offers; a Strategy is the *approach* to
  achieve goals. A strategy may change the capabilities behind a product, but it
  does not contain products.

## Consequences

- This ADR **supersedes ADR-0004 outright.** ADR-0004 is marked Superseded.
- `docs/design/strategy-entity.md` is rewritten to the course-of-action model
  (the Resolved-model section above seeds it).
- The remaining slice list on tracker **#805 is replaced** with the rework slices
  below; merged slices 1–4 (container schema, views, `goals.strategy_id` linking,
  container traceability) are reworked, not extended:
  - **R1 — schema:** drop `goals.strategy_id` + single-adopted index; new
    course-of-action `strategy_status`; add `strategy_goals`,
    `strategy_capabilities`, `strategy_value_streams`, `strategy_initiatives`
    junctions; replace `adoptStrategy` with ordinary status edits; update
    relations/actions/tests.
  - **R2 — views:** strategy list/detail/edit for the new shape (no adopt);
    surface the goal/capability/value-stream/initiative links.
  - **R3 — linking:** Strategy↔Goal (both sides), Strategy↔Capability,
    Strategy↔Value Stream, Strategy↔Initiative.
  - **R4 — traceability:** `from=strategy` chain = Strategy → Goals (+ Objectives)
    and Strategy → {Value Streams ⇄ Capabilities} → Applications; affordances.
  - **5–6** (executive surfaces; import/export/backup + seed) proceed on the new
    shape; "current strategy" badge becomes "active strategies."
- **Slice 5 stays paused** until R1–R4 land.
- The #668 interview should still test whether a separate *strategic-plan
  container* is also wanted — a possible future entity, not a reason to revert.
