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
| R-001 | Manual demo deployment can obscure which commit, image, and runtime configuration are live | Operational / Release | High | Medium | Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear | Product / Engineering | Open | 2026-05-15 |
| R-002 | Data Architecture can keep expanding without a deliberate v1 boundary | Scope | Medium | Medium | Decide whether #363 is v1-complete or split conceptual/logical model expansion into focused follow-ups | Product | Open | 2026-05-15 |
| R-003 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Run #384 and activate #103 Phase 1 manual feedback logging before building more analysis surfaces | Product | Open | 2026-05-15 |
| R-004 | Glossary, tour, and navigation help can spread inconsistent product language if #446 and #499 are handled separately | Product / UX | Medium | Medium | Decide module/tool terminology in #446 before implementing inherited system glossary and menu definitions in #499 | Product | Open | 2026-05-15 |
| R-005 | First-class risk tracking can become too broad if implementation starts before validation | Product Scope | Medium | Medium | Treat #501 as capability definition only; validate risk-summary audiences through #384 before opening implementation slices | Product | Watching | 2026-05-15 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-15 |

## Risk Details

### R-001 - Manual demo deployment can obscure which commit, image, and runtime configuration are live

- **Category:** Operational / Release
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-15
- **Mitigation:** Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear.

#### Details

PRs #493 and #498 stabilized the Azure demo runtime and separated demo-mode shortcuts from `NODE_ENV`. That fixed the immediate runtime mismatch, but the process is still too manual for a demo environment that users and reviewers depend on. Without a traceable release pipeline, maintainers can lose time reconstructing which commit, image digest, and Container Apps revision are actually live.

### R-002 - Data Architecture can keep expanding without a deliberate v1 boundary

- **Category:** Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-15
- **Mitigation:** Decide whether #363 is v1-complete after the shipped schema, CRUD, relationships, docs, visualization, nav, and fixtures; if not, split conceptual/logical expansion into focused follow-up issues.

#### Details

The Data Architecture Metamodel is now a shipped module, not only a request. That increases the need for a product boundary. Leaving #363 open as a broad umbrella risks sliding from an enterprise-architecture support surface into a much larger data-modelling product without a deliberate sequence.

### R-003 - Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals

- **Category:** Product Fit
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-15
- **Mitigation:** Execute #384 and start #103 Phase 1 with a manual feedback log tied to recently shipped stakeholder-facing surfaces.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, guided-answer, Data Architecture, risk, and architecture-debt surfaces; what formats they trust; and whether they act on freshness or confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality.

### R-004 - Glossary, tour, and navigation help can spread inconsistent product language if #446 and #499 are handled separately

- **Category:** Product / UX
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-15
- **Mitigation:** Decide module/tool terminology in #446 before implementing inherited system glossary and menu definitions in #499.

#### Details

PRs #487 and #488 clarified instance-wide module availability and shipped group-level module toggles. Issue #499 now proposes glossary-backed menu definitions and reusable tour/contextual-help language. If #499 moves first, the product may encode terminology that #446 later changes, creating avoidable copy churn across onboarding, glossary, settings, and navigation surfaces.

### R-005 - First-class risk tracking can become too broad if implementation starts before validation

- **Category:** Product Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-15
- **Mitigation:** Treat #501 as a capability-definition PR only; validate risk-summary audiences through #384 before opening implementation slices.

#### Details

PR #501 defines `rm-risk-tracking` and a design note for architecture and delivery risk tracking. That is the right product direction, but risk tracking can easily become a full GRC platform if the first implementation slice is not tightly tied to GovEA's architecture repository, roadmap decisions, and validated stakeholder needs.

### R-006 - Documentation can drift behind shipped repo state during fast-moving backlog turns

- **Category:** Process
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-15
- **Mitigation:** Treat backlog grooming as the required checkpoint for refreshing `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this file when the live repo state changes materially.

#### Details

The latest grooming pass again found stale docs: the checked-in priority note still treated PRs #487 and #488 as active and #437 as open after those streams had moved on. The consequence is not just cosmetic; stale docs distort prioritization and make automation repeat work that should already be closed.
