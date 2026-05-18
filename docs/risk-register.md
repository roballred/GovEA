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
| R-001 | Admin notices can remain half-shipped if the instance-wide scope does not follow #508 | Product / Operations | Medium | Medium | Treat #508 as PR 1 of #456 and ship the instance-admin notice management and rendering slice next | Product / Engineering | Open | 2026-05-16 |
| R-002 | Manual demo deployment can obscure which commit, image, and runtime configuration are live | Operational / Release | High | Medium | Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear | Product / Engineering | Open | 2026-05-16 |
| R-003 | Data Architecture can keep expanding without a deliberate v1 boundary | Scope | Medium | Medium | Decide whether #363 is v1-complete or split conceptual/logical model expansion into focused follow-ups | Product | Open | 2026-05-16 |
| R-004 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Run #384 and activate #103 Phase 1 manual feedback logging before building more analysis surfaces | Product | Open | 2026-05-16 |
| R-005 | Glossary, tour, and navigation help can spread inconsistent product language if #446 and #499 are handled separately | Product / UX | Medium | Medium | Decide module/tool terminology in #446 before implementing inherited system glossary and menu definitions in #499 | Product | Open | 2026-05-16 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-16 |

## Risk Details

### R-001 - Admin notices can remain half-shipped if the instance-wide scope does not follow #508

- **Category:** Product / Operations
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-16
- **Mitigation:** Treat #508 as PR 1 of #456 and ship the instance-admin notice management and rendering slice next.

#### Details

PR #508 shipped org-scoped admin notices and settled much of the shared behavior: severity, single active notice per scope, audit trail, authenticated-page rendering, and optional learn-more URLs. Issue #456 remains broader. If the instance-wide slice does not follow, GovEA will have agency-level operational messaging but still lack a shared-instance operator channel for maintenance windows, migrations, and platform-level warnings.

### R-002 - Manual demo deployment can obscure which commit, image, and runtime configuration are live

- **Category:** Operational / Release
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-16
- **Mitigation:** Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear.

#### Details

PRs #493 and #498 stabilized the Azure demo runtime and separated demo-mode shortcuts from `NODE_ENV`. That fixed the immediate runtime mismatch, but the process is still too manual for a demo environment that users and reviewers depend on. Without a traceable release pipeline, maintainers can lose time reconstructing which commit, image digest, and Container Apps revision are actually live.

### R-003 - Data Architecture can keep expanding without a deliberate v1 boundary

- **Category:** Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-16
- **Mitigation:** Decide whether #363 is v1-complete after the shipped schema, CRUD, relationships, docs, visualization, nav, fixtures, and settings alignment; if not, split conceptual/logical expansion into focused follow-up issues.

#### Details

The Data Architecture Metamodel is now a shipped module, not only a request. That increases the need for a product boundary. Leaving #363 open as a broad umbrella risks sliding from an enterprise-architecture support surface into a much larger data-modelling product without a deliberate sequence.

### R-004 - Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals

- **Category:** Product Fit
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-16
- **Mitigation:** Execute #384 and start #103 Phase 1 with a manual feedback log tied to recently shipped stakeholder-facing surfaces.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, guided-answer, Data Architecture, risk, and architecture-debt surfaces; what formats they trust; and whether they act on freshness or confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality.

### R-005 - Glossary, tour, and navigation help can spread inconsistent product language if #446 and #499 are handled separately

- **Category:** Product / UX
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-16
- **Mitigation:** Decide module/tool terminology in #446 before implementing inherited system glossary and menu definitions in #499.

#### Details

Issue #499 proposes glossary-backed menu definitions and reusable tour/contextual-help language. If #499 moves before #446, the product may encode terminology that #446 later changes, creating avoidable copy churn across onboarding, glossary, settings, and navigation surfaces. The #507 module-settings work makes this decision more visible, not less.

### R-006 - Documentation can drift behind shipped repo state during fast-moving backlog turns

- **Category:** Process
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-16
- **Mitigation:** Treat backlog grooming as the required checkpoint for refreshing `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this file when the live repo state changes materially.

#### Details

The current grooming pass found that the 2026-05-15 docs were correct when opened, but #505, #507, and #508 all merged before the next run completed. The consequence is not just cosmetic; stale docs distort prioritization and make automation repeat work that should already be closed.
