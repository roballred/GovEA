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
| R-001 | Repository confidence rollout is only partially finished until PR #457 lands | Delivery / Product | High | Medium | Merge PR #457, verify stakeholder surfaces, then close #455 and revisit #380 scope | Product / Engineering | Open | 2026-05-10 |
| R-002 | GovEA can show impact and quality signals but still cannot track architecture debt as a first-class object | Product | High | High | Start #381 after #457 and keep the first slice tightly scoped to debt model + ADR linkage | Product | Open | 2026-05-10 |
| R-003 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Run #384 and activate #103 Phase 1 manual feedback logging before building more analysis surfaces | Product | Open | 2026-05-10 |
| R-004 | Break-glass controls exist, but there is still no real cross-tenant operational caller proving they work in practice | Operational / Security | High | Medium | Ship #437 before treating break-glass as an operationally credible control | Product / Engineering | Open | 2026-05-10 |
| R-005 | The Data Architecture Metamodel request could pull v1 scope into a broad adjacent domain without a product boundary decision | Scope | Medium | Medium | Make an explicit v1-vs-future decision on #363 before design or implementation expands | Product | Open | 2026-05-10 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-10 |

## Risk Details

### R-001 — Repository confidence rollout is only partially finished until PR #457 lands

- **Category:** Delivery / Product
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-10
- **Mitigation:** Merge PR #457, verify `/dashboard`, `/roadmap`, and `/executive`, then close #455 and reduce or close #380 based on what remains.

#### Details

PRs #448, #450, and #454 are already merged, which means most of the repository-confidence slice is shipped. The remaining risk is not "whether to start" but "whether the final stakeholder-facing rollout lands cleanly." Until PR #457 merges, the confidence story is still incomplete across the roadmap and executive surfaces, and the suppression/trend behavior is not fully in place.

### R-002 — GovEA can show impact and quality signals but still cannot track architecture debt as a first-class object

- **Category:** Product
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-10
- **Mitigation:** Start #381 after #457. Keep the first slice small: debt item model, status/severity rules, ADR linkage, and dashboard hooks.

#### Details

This is now the largest product gap in the repository-modelling story. GovEA can surface affected applications and incomplete repository areas, but it still cannot represent durable constraints, known shortcuts, decision drift, or remediation intent. That limits how well the product supports actual prioritization and governance conversations.

### R-003 — Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals

- **Category:** Product Fit
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-10
- **Mitigation:** Execute #384 and start #103 Phase 1 with a manual feedback log tied to recently shipped stakeholder-facing surfaces.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, and guided-answer surfaces, what formats they trust, and whether they act on freshness/confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality.

### R-004 — Break-glass controls exist, but there is still no real cross-tenant operational caller proving they work in practice

- **Category:** Operational / Security
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-10
- **Mitigation:** Ship #437 before treating break-glass as operationally credible. Defer #436 unless operator experience shows read-gating is immediately required.

#### Details

The hardening work for #418 shipped TTL reduction, dual control, approval flow, and the `requireBreakGlass` helper. The remaining risk is practical rather than theoretical: until GovEA uses that control in a real support/debugging flow, the control is only partially proven. That matters if the platform team expects to rely on break-glass under incident conditions.

### R-005 — The Data Architecture Metamodel request could pull v1 scope into a broad adjacent domain without a product boundary decision

- **Category:** Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-10
- **Mitigation:** Decide on #363 whether this is a v1 concern, a post-v1 expansion area, or a separate capability stream with explicit constraints.

#### Details

The request is valid and externally visible, but it reaches beyond the current GovEA center of gravity. Without a firm scope call, the team risks sliding from enterprise architecture repository work into a much larger data-architecture and data-modelling product surface without deliberate sequencing.

### R-006 — Documentation can drift behind shipped repo state during fast-moving backlog turns

- **Category:** Process
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-10
- **Mitigation:** Treat backlog grooming as the required checkpoint for refreshing `README.md`, `docs/product-priorities.md`, and this file when the live repo state changes materially.

#### Details

This risk showed up directly on 2026-05-10: the checked-in priority note still described the completeness work as largely unstarted even though PRs #448, #450, and #454 had already merged and only PR #457 remained open. The consequence is not just cosmetic; stale docs distort prioritization.
