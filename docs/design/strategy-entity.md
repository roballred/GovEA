# Design: First-class Strategy entity

**Status:** Proposed — design slice for #697; implementation gated on the tracker issue and #668 validation
**Issue:** [#697](https://github.com/roballred/GovEA/issues/697)
**Capabilities:** `pl-goals`, `pl-strategic-objectives`, `pl-initiatives`, `fd-traceability-views`, `rm-end-to-end-traceability` (capability group `cms/planning`)
**Personas:** Enterprise Architect, Agency EA Coordinator, Department Director, Budget & Performance Analyst
**Related:** [ADR-0004](../decisions/0004-strategy-as-planning-container.md), `docs/data-model.md` (planning entities), `docs/architect/data-and-traceability.md` (traceability chain)

---

## Why this doc exists

#697 asks us to add a missing **Strategy** container above the shipped
Goal → Objective → Initiative hierarchy — *without* blurring that hierarchy and
*without* turning Strategy into a static document upload. This doc makes the
product distinction, resolves the issue's open design questions, specifies the
data model and traceability behavior, and lists what stays gated.

> **Bottom line:** Add a lightweight, first-class **`strategies`** planning
> entity that acts as the *container and planning-period frame* for Goals. A
> Goal belongs to **at most one** Strategy (nullable many-to-one), Goals are
> the unit of strategic content (themes/priorities are Goals, not a new
> sub-type), and Strategy becomes a **traceability root** above Goals. Strategy
> uses a **planning-specific lifecycle** (`draft` → `adopted` → `superseded` →
> `retired`) with **at most one adopted strategy per org**, which is what the
> dashboard/executive surfaces read as "the current strategy." No change to the
> Goal/Objective/Initiative model other than an optional `strategy_id` on goals.

---

## 1. The product distinction (acceptance criterion #1)

| Entity | Question it answers | Shape | Shipped? |
|---|---|---|---|
| **Strategy** (proposed) | "What is our overall strategic direction for this planning period, and which goals belong to it?" | A named **container** with a planning horizon, owner, and lifecycle. Holds Goals; authors little content of its own beyond a summary. | No |
| **Goal** | "What broad outcome are we trying to achieve?" | Mission-level aim; the **unit of strategic content**. Themes/priorities are expressed as Goals. | Yes |
| **Strategic Objective** | "What measurable result advances a goal?" | Has a success metric + time horizon; links to capabilities and value streams. | Yes |
| **Initiative** | "What funded work delivers the objectives?" | Time-boxed effort; links to objectives, capabilities, applications. | Yes |
| **Roadmap** | "When does the work land, against the architecture?" | A **view** over initiatives, not an entity. | Yes (view) |

Strategy is the planning-period frame above Goals; it does not replace or
reshape anything below Goals. The clean Goal → Objective → Initiative chain that
GovEA recently established is preserved intact.

## 2. Resolved design questions

| # | Question | Decision | Why |
|---|---|---|---|
| Q1 | Multiple active strategies, or one current per horizon? | **At most one `adopted` strategy per org** (partial unique index). Multiple `draft`/`superseded`/`retired` records coexist for history and planning. | Gives "the current strategy" a single unambiguous answer for dashboard/executive surfaces; history is still first-class. |
| Q2 | Standard `draft/published/archived` workflow, or a planning lifecycle? | **Planning lifecycle: `draft` → `adopted` → `superseded` → `retired`.** | Adoption is a governance act, not a content publish. Matches the precedent that planning entities carry domain-specific statuses (initiatives: `proposed/active/on-hold/complete/cancelled`; ADRs: `proposed/accepted/deprecated/superseded`). |
| Q3 | Goal in exactly one Strategy, or many? | **At most one** — nullable `goals.strategy_id` (many-to-one). A Goal may have no Strategy (back-compat). | Single-answer "which strategy does this goal belong to?"; keeps the container concept and traceability unambiguous. A join table would invite many-to-many and blur the hierarchy. |
| Q4 | Themes/priorities on Strategy, or as Goals? | **As Goals.** Strategy holds only a summary + horizon + ownership; the strategic content *is* its Goals. | Avoids a parallel themes sub-entity and a second authoring surface; reuses everything Goals already do (objectives, traceability). |
| Q5 | Strategy-root traceability with draft/non-viewer-visible downstream? | Same rules as every existing root: the chain **prunes nodes the viewer can't see**. Viewers see only viewer-visible Strategy/Goal/Objective/Initiative records; editors see all. | Consistent with the #695 participation-panel scoping and the existing root loaders — no new visibility semantics. |
| Q6 | In main nav, or under Planning/Strategy module settings? | Under the existing **Strategy** module group as a new `strategies` module (`/strategies`), gated by module settings like Objectives/Initiatives/Roadmap. | No new top-level nav; respects the org's module toggles. |

## 3. Data model

### 3.1 `strategies` (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `organization_id` | uuid → organizations (cascade) | tenant scope |
| `name` | text not null | |
| `summary` | text | markdown, like other planning descriptions |
| `planning_horizon` | text | same shape as `goals.planning_horizon` (e.g. "FY26–FY28") |
| `owner_user_id` | uuid → users (set null) | nullable; the strategy's accountable owner |
| `status` | enum `strategy_status` | `draft` \| `adopted` \| `superseded` \| `retired`; default `draft` |
| `visibility` | enum (shared with content) | `org` \| `connections` \| `instance` |
| `start_date` / `end_date` | `date` | proper date columns — **do not** extend the free-text-date debt noted in `data-model.md` §4 |
| `created_at` / `updated_at` / `created_by` / `updated_by` | standard audit columns | |

**Constraint:** partial unique index `(organization_id) WHERE status = 'adopted'`
enforces "at most one adopted strategy per org" at the DB layer (a Postgres
partial unique index; no trigger needed). Adoption is a server action that flips
any currently-adopted strategy to `superseded` in the same transaction.

### 3.2 `goals.strategy_id` (new nullable column)

`uuid → strategies (set null)`, nullable. A Goal with `strategy_id = null` is a
valid, un-containered goal (back-compat for every existing goal). The link is
editable from both the Strategy detail page (manage member goals) and the Goal
edit flow (pick a strategy), per acceptance criteria.

> No new junction table: the many-to-one decision (Q3) makes a column the
> correct and simplest shape, and it keeps the uniqueness ("one strategy per
> goal") trivially enforced.

### 3.3 Derived chain (no new joins below Goals)

Strategy → Goals (FK) → Objectives (`goal_objectives`) → Initiatives
(`initiative_objectives`) → Capabilities / Value Streams / Services /
Applications, all through **existing** relationships. Strategy adds exactly one
new edge (Strategy→Goal); everything downstream is composed from what ships
today, mirroring how `data-and-traceability.md` already derives applications for
objectives through capabilities.

## 4. Traceability

- **New root:** `/traceability?from=strategy&id=<id>` renders Strategy at the top
  of the planning chain, then Strategy → Goals → Objectives → Initiatives →
  architecture, reusing the existing Goal/Objective/Initiative traversal.
- **Affordances:** a `View traceability →` link on the Strategy detail page, and
  on linked Goal detail pages a "part of strategy *X*" link into the strategy's
  trace (consistent with the #695 affordance pattern).
- **Visibility:** the trace prunes non-viewer-visible nodes exactly as the
  existing roots do (Q5). A draft Strategy is not a viewer-visible root.

## 5. Surfaces

- **List + detail** for Strategies using the same authoring conventions as other
  planning content (create/edit forms, status + visibility selects, markdown
  summary).
- **Read-only executive view** suitable for Department Directors / Budget &
  Performance: the adopted strategy, its goals, and a plain-language rollup of
  objectives/initiatives — no authoring chrome.
- **Current-strategy badge** on Dashboard / Roadmap / Executive surfaces, reading
  the single `adopted` strategy.
- **Import/export/backup** gain Strategy records and the `strategy_id` on goal
  rows once the entity ships (round-trip parity, per the export conventions).
- **Seed:** one `adopted` strategy linked to several goals, plus one
  `draft` and one `superseded` strategy, to demonstrate planning-period behavior.

## 6. What stays gated

This is a **design slice**. The current planning model is shipped and useful, so
the build proceeds deliberately:

- **Gate A — validation (#668).** The Department Director / Budget & Performance
  value of a Strategy container is an *assumed* persona need. The first Tier-1
  interview should confirm that a real Agency EA Coordinator or director wants a
  strategy *record* (vs. just goals with a horizon) before the schema lands.
- **Gate B — reconcile with adjacent design.** Confirm Strategy does not overlap
  the value-chains grouping (#694) or the service-product container (#791); each
  answers a different question, but the boundaries should be stated before build.
- **Implementation slices** (each its own issue under the tracker): (1) schema +
  `strategy_id` + adoption action; (2) list/detail/edit + module wiring; (3)
  Strategy↔Goal linking from both sides; (4) traceability root + affordances;
  (5) executive read view + current-strategy surfaces; (6) import/export/backup +
  seed. Tests per slice: CRUD, role enforcement, link integrity, single-adopted
  invariant, Strategy-root traceability, visibility pruning, seeded rendering.

## 7. Capability mapping

No new capability doc. Strategy extends the **`cms/planning`** group: `pl-goals`
(Goals gain a parent container), `pl-strategic-objectives` / `pl-initiatives`
(unchanged, reached via Goals), and `fd-traceability-views` /
`rm-end-to-end-traceability` (Strategy becomes a traceable root). If a future
maintainer wants Strategy modeled as its own sub-capability (`pl-strategy`),
that is a clean follow-up — flagged, not assumed.
