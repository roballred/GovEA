# Design: First-class Strategy entity (course of action)

**Status:** Accepted — implements [ADR-0005](../decisions/0005-reconcile-strategy-with-bizbok.md) (supersedes the ADR-0004 container design)
**Issue:** [#697](https://github.com/roballred/GovEA/issues/697) · Tracker [#805](https://github.com/roballred/GovEA/issues/805)
**Capabilities:** `pl-goals`, `pl-strategic-objectives`, `pl-initiatives`, `fd-traceability-views`, `rm-end-to-end-traceability` (capability group `cms/planning`)
**Personas:** Enterprise Architect, Agency EA Coordinator, Department Director, Budget & Performance Analyst
**Related:** [ADR-0005](../decisions/0005-reconcile-strategy-with-bizbok.md), `docs/data-model.md`, `docs/architect/data-and-traceability.md`

---

## Why this doc exists

#697 asks for a first-class **Strategy** entity. ADR-0004 first modeled it as a
*container above Goals*; on review that inverted the BMM/BIZBOK ends-means
relationship, and **ADR-0005** reworked it: a **Strategy is a course of action**
— the broad chosen *approach* to achieve Goals — that maps onto the operating
model (capabilities and value streams) and is delivered by Initiatives.

> **Bottom line:** Strategy is a *means*, not a container. Goals/Objectives are
> the **ends** (what we want, and how we measure it); a Strategy is **how we
> intend to get there**. It *pursues* one or more Goals, *impacts* Capabilities
> and Value Streams (the operating model it leverages and changes), and is
> *delivered by* Initiatives. Lifecycle is a course-of-action lifecycle
> (`proposed → active → achieved → abandoned`); multiple strategies can be
> active at once.

---

## 1. The product distinction

The four planning concepts are kept distinct so we don't create overlapping
records (BMM roles in parentheses):

| Entity | Role | Question it answers | Shape |
|---|---|---|---|
| **Goal** | End | What broad outcome are we trying to achieve? | Mission-level aim. |
| **Strategic Objective** | End (measurable) | How do we measure progress toward the goal? | Success metric + horizon; links to capabilities and value streams. |
| **Strategy** | **Means — course of action** | What is our broad chosen *approach* to achieve the goal? | Named approach with a horizon, owner, lifecycle; pursues goals, impacts the operating model, delivered by initiatives. |
| **Initiative** | Means — funded work (≈ Tactic) | What funded effort *delivers* the approach? | Time-boxed effort; links to objectives, capabilities, applications. |

Strategy sits *beside* Goals/Objectives as the chosen approach — it does not
contain them. The shipped Goal → Objective → Initiative chain is untouched.

## 2. Data model

### 2.1 `strategies`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `organization_id` | uuid → organizations (cascade) | tenant scope |
| `name` | text not null | |
| `summary` | text | markdown — the approach, in prose |
| `planning_horizon` | text | e.g. "FY26–FY28" |
| `owner_user_id` | uuid → users (set null) | accountable owner |
| `status` | enum `strategy_status` | `proposed` \| `active` \| `achieved` \| `abandoned`; default `proposed` |
| `visibility` | enum | `org` \| `connections` \| `instance` |
| `start_date` / `end_date` | `date` | proper date columns |
| audit columns | | `created_at/_by`, `updated_at/_by` |

No single-`active` constraint: multiple strategies may be active. "Active
strategies" (plural) is what executive surfaces read — there is no single
"current strategy."

### 2.2 Junctions (all many-to-many)

| Table | Meaning | Extra |
|---|---|---|
| `strategy_goals` | Strategy **pursues** Goal | — |
| `strategy_capabilities` | Strategy **impacts** Capability | `impact` (`leverage`/`build`/`improve`/`retire`) |
| `strategy_value_streams` | Strategy **impacts** Value Stream | `impact` |
| `strategy_initiatives` | Strategy is **delivered by** Initiative | — |

A goal can be pursued by several strategies, and vice-versa. Capabilities and
value streams stay cross-mapped peers; Strategy references both directly rather
than reaching them only through objectives.

> The old `goals.strategy_id` FK and the single-`adopted` partial unique index
> from ADR-0004 are **dropped**.

## 3. Traceability

- **Root:** `/traceability?from=strategy&id=<id>` renders Strategy at the top of
  a chain: Strategy → Goals (it pursues) → Objectives → Initiatives →
  Capabilities → Applications, reusing the existing Goal/Objective traversal.
  (The direct Strategy→Capability / →Value Stream / →Initiative impact links are
  surfaced on the detail page; folding them into the trace view is a follow-up.)
- **Affordances:** `View traceability →` on the Strategy detail page; on a Goal
  detail page, "Pursued by strategy *X*" linking to each strategy.
- **Visibility:** the root is gated by `canReadFederatedEntity`; a `proposed`
  strategy is not a viewer-visible root; pursued goals prune to published for
  viewers.

## 4. Boundary statements (Gate B)

- **Strategy vs. value-chain grouping (#694):** a value chain groups *value
  streams* (operating-model structure); a Strategy is a *chosen approach* that
  *references* the value streams it affects. Strategy links to value streams; it
  does not group them.
- **Strategy vs. service-product container (#791):** a service-product is a
  *delivery container* for what the org offers; a Strategy is the *approach* to
  achieve goals. A strategy may change the capabilities behind a product, but it
  does not contain products.

## 5. Capability mapping

No new capability doc. Strategy extends the **`cms/planning`** group: `pl-goals`
(goals gain pursuing strategies), `pl-strategic-objectives` / `pl-initiatives`
(unchanged), and `fd-traceability-views` / `rm-end-to-end-traceability`
(Strategy is a traceable root). A future `pl-strategy` sub-capability remains a
clean follow-up.

## 6. Build sequence

Implemented as rework slices under #805 (see ADR-0005): **R1** schema +
strategy CRUD + `strategy_goals` linking (this doc); **R2** detail/edit
surfacing of the capability/value-stream/initiative links; **R3** linking UI for
those three junctions; **R4** traceability polish; then executive surfaces and
import/export/seed on the new shape.
