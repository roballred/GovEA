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
| R-001 | Email-dependent features can appear ready while the SMTP transport is still stubbed | Product / Operations | High | Medium | Finish the real SMTP send path under #528 before starting notification, password-reset, or digest features | Product / Engineering | Open | 2026-05-21 |
| R-002 | Manual demo deployment can obscure which commit, image, and runtime configuration are live | Operational / Release | High | Medium | Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear | Product / Engineering | Open | 2026-05-21 |
| R-003 | Data Architecture can keep expanding without quality loops or a deliberate v1 boundary | Scope | Medium | Medium | Prioritize #570 and #573 quality cues before expanding conceptual/logical modeling under #363 | Product | Open | 2026-05-21 |
| R-004 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Run #384 and activate #103 Phase 1 manual feedback logging before building more analysis surfaces | Product | Open | 2026-05-21 |
| R-005 | Glossary, tour, and navigation help can drift if the settled "Modules" language is not enforced | Product / UX | Medium | Medium | Complete #512 before expanding inherited glossary/menu definitions in #499 | Product | Open | 2026-05-21 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-21 |
| R-007 | Import/export can create a false portability story if only two entities round-trip cleanly | Product / Trust | Medium | Medium | Continue #596 as small per-entity PRs and preserve export -> unchanged import -> zero-diff behavior | Product / Engineering | Open | 2026-05-21 |

## Risk Details

### R-001 - Email-dependent features can appear ready while the SMTP transport is still stubbed

- **Category:** Product / Operations
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Finish the real SMTP send path under #528 before starting notification, password-reset, or digest features.

#### Details

PR #606 shipped the Email Configuration UI, encrypted SMTP settings, delivery log, and dashboard warning. That is a useful foundation, but the send path still returns an explicit stub failure until nodemailer or equivalent transport work lands. Change notifications (#581 and #87), password reset flows, and email digests should not be treated as implementation-ready until the transport is real and tested.

### R-002 - Manual demo deployment can obscure which commit, image, and runtime configuration are live

- **Category:** Operational / Release
- **Impact:** High
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Ship #504 so main-branch releases build immutable images, record deployment metadata, smoke test after deploy, and keep rollback clear.

#### Details

PRs #493 and #498 stabilized the Azure demo runtime and separated demo-mode shortcuts from `NODE_ENV`. That fixed the immediate runtime mismatch, but the process is still too manual for a demo environment that users and reviewers depend on. Without a traceable release pipeline, maintainers can lose time reconstructing which commit, image digest, and Container Apps revision are actually live.

### R-003 - Data Architecture can keep expanding without quality loops or a deliberate v1 boundary

- **Category:** Scope
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Prioritize #570 and #573 quality cues before expanding conceptual/logical modeling under #363.

#### Details

The Data Architecture Metamodel is now a shipped module, not only a request. The next risk is not lack of modeling breadth; it is lack of quality feedback for the people who author and review the model. Data Vault naming hints (#570), per-row quality cues, and a `/data` scorecard roll-up (#573) should come before expanding #363 into broader conceptual/logical modeling.

### R-004 - Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals

- **Category:** Product Fit
- **Impact:** High
- **Likelihood:** High
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Execute #384 and start #103 Phase 1 with a manual feedback log tied to recently shipped stakeholder-facing surfaces.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, guided-answer, Data Architecture, risk, and architecture-debt surfaces; what formats they trust; and whether they act on freshness or confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality.

### R-005 - Glossary, tour, and navigation help can drift if the settled "Modules" language is not enforced

- **Category:** Product / UX
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Complete #512 before expanding inherited glossary/menu definitions in #499.

#### Details

The terminology decision is now made: "Modules" is canonical and "Tools" is rejected for the product-area concept. Issue #512 covers the cleanup and CI guard. If #499 moves before #512, glossary-backed menu definitions and reusable tour/contextual-help language can re-spread terms the project has already rejected.

### R-006 - Documentation can drift behind shipped repo state during fast-moving backlog turns

- **Category:** Process
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Watching
- **Last reviewed:** 2026-05-21
- **Mitigation:** Treat backlog grooming as the required checkpoint for refreshing `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this file when the live repo state changes materially.

#### Details

The current grooming pass found that the local checkout lagged behind the live GitHub mainline, where PRs #603 through #608 had already merged. The consequence is not just cosmetic; stale docs distort prioritization and make automation repeat work that should already be closed.

### R-007 - Import/export can create a false portability story if only two entities round-trip cleanly

- **Category:** Product / Trust
- **Impact:** Medium
- **Likelihood:** Medium
- **Owner:** Product / Engineering
- **Status:** Open
- **Last reviewed:** 2026-05-21
- **Mitigation:** Continue #596 as small per-entity PRs and preserve export -> unchanged import -> zero-diff behavior.

#### Details

PR #604 proved the CSV round-trip pattern for Capabilities, adding quote-aware parsing and org-scoped export. Applications and Capabilities now have useful tactical portability, but the broader Consultant / SI and Early-Maturity Practice Lead promise requires Personas, ADRs, Initiatives, Objectives, Services, Value Streams, Principles, Glossary, and Data Architecture to follow. Until that happens, GovEA should describe export/import as partial, not as a full repository portability story.
