# GovEA Risk Register

**Purpose:** Track active product, delivery, operational, and process risks that could materially change what GovEA should build next, how quickly it can ship, or how confidently the team can rely on the current product direction.

This register is intentionally lightweight:

- It captures **active, decision-relevant** risks, not every issue in the backlog.
- It complements [`docs/product-priorities.md`](./product-priorities.md), which ranks work; this file explains what could go wrong if key assumptions or dependencies do not hold.
- It complements [`docs/research/stakeholder-assumption-register.md`](./research/stakeholder-assumption-register.md), which is narrower and focused specifically on stakeholder-facing feature assumptions.

## How To Use

- Review during backlog grooming and before starting a major feature slice.
- Update `Status`, `Mitigation`, and `Last reviewed` when a risk meaningfully changes.
- Use the optional `Details` section only when the summary row is not enough.

## Scale

- **Impact:** `High`, `Medium`, `Low`
- **Likelihood:** `High`, `Medium`, `Low`
- **Status:** `Open`, `Watching`, `Mitigated`, `Closed`

## Summary Table

| ID | Risk | Category | Impact | Likelihood | Mitigation | Owner | Status | Last reviewed |
|---|---|---|---|---|---|---|---|---|
| R-001 | Module/settings changes can blur product boundaries if #487 and #488 are reviewed independently | Product / UX | Medium | Medium | Review #487 and #488 together for language, defaults, navigation semantics, and terminology follow-up to #446 | Product / Engineering | Open | 2026-05-14 |
| R-002 | Data Architecture can keep expanding without a deliberate v1 boundary | Scope | Medium | Medium | Decide whether #363 is v1-complete or split conceptual/logical model expansion into focused follow-ups | Product | Open | 2026-05-14 |
| R-003 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Run #384 and activate #103 Phase 1 manual feedback logging before building more analysis surfaces | Product | Open | 2026-05-14 |
| R-004 | Break-glass controls exist, but there is still no real cross-tenant operational caller proving they work in practice | Operational / Security | High | Medium | Ship #437 before treating break-glass as an operationally credible control | Product / Engineering | Open | 2026-05-14 |
| R-005 | Feature-management wording can confuse org-level settings with instance-wide availability controls | Documentation / Product Clarity | Medium | Low | Merge PR #487, close #445, then handle the broader "module" vs "tool" terminology decision in #446 | Product | Watching | 2026-05-14 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-14 |

## Risk Details

### R-001 — Module/settings changes can blur product boundaries if #487 and #488 are reviewed independently

- **Category:** Product / UX
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-14
- **Mitigation:** Review #487 and #488 together for language, defaults, navigation semantics, and terminology follow-up to #446.

#### Details

PR #487 aligns language around instance-wide module availability controls. PR #488 goes further by adding group-level module toggles, moving Principles into Business Architecture, and making framework overlay default-on. These changes touch the same mental model even though they are separate PRs. If reviewed independently, GovEA could end up with clear copy but surprising defaults, or useful defaults with terminology still unsettled.

### R-002 — Data Architecture can keep expanding without a deliberate v1 boundary

- **Category:** Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-14
- **Mitigation:** Decide whether #363 is v1-complete after the shipped schema, CRUD, docs, visualization, nav, and fixtures; if not, split conceptual/logical expansion into focused follow-up issues.

#### Details

The Data Architecture Metamodel is now a shipped module, not only a request. That increases the need for a product boundary. Leaving #363 open as a broad umbrella risks sliding from an enterprise-architecture support surface into a much larger data-modelling product without a deliberate sequence.

### R-003 — Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals

- **Category:** Product Fit
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-14
- **Mitigation:** Execute #384 and start #103 Phase 1 with a manual feedback log tied to recently shipped stakeholder-facing surfaces.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, guided-answer, Data Architecture, and architecture-debt surfaces; what formats they trust; and whether they act on freshness or confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality.

### R-004 — Break-glass controls exist, but there is still no real cross-tenant operational caller proving they work in practice

- **Category:** Operational / Security
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-14
- **Mitigation:** Ship #437 before treating break-glass as operationally credible. Defer #436 unless operator experience shows read-gating is immediately required.

#### Details

The hardening work for #418 shipped TTL reduction, dual control, approval flow, and the `requireBreakGlass` helper. The remaining risk is practical rather than theoretical: until GovEA uses that control in a real support/debugging flow, the control is only partially proven. That matters if the platform team expects to rely on break-glass under incident conditions.

### R-005 — Feature-management wording can confuse org-level settings with instance-wide availability controls

- **Category:** Documentation / Product Clarity
- **Impact:** Medium
- **Likelihood:** Low
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-14
- **Mitigation:** Merge PR #487, close #445, then decide the broader "module" vs "tool" terminology question in #446.

#### Details

The product already supports org-level module toggles and instance-wide availability controls. Uneven wording makes the operator boundary harder to explain: org admins choose what their organization uses, while instance admins decide which modules are available anywhere on the shared instance. This is not a behavior gap, but clear language matters for a multi-tenant government tool.

### R-006 — Documentation can drift behind shipped repo state during fast-moving backlog turns

- **Category:** Process
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-14
- **Mitigation:** Treat backlog grooming as the required checkpoint for refreshing `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this file when the live repo state changes materially.

#### Details

This risk showed up again on 2026-05-14: the checked-in priority note still described PR #457 as open even though main had moved through the architecture-debt and Data Architecture streams, and #486 merged during the grooming run. The consequence is not just cosmetic; stale docs distort prioritization.
