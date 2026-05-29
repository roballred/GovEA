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
| R-002 | Manual demo deployment can obscure which commit, image, and runtime configuration are live | Operational / Release | High | Medium | #504 release pipeline shipped ([#645](https://github.com/roballred/GovEA/pull/645)) — see [`docs/release-pipeline.md`](./release-pipeline.md); main-branch merges build SHA-tagged immutable images, record commit/digest/revision, smoke-test the live URL, and expose one-click rollback. Public-repo topology-exposure concern resolved by removing the public Azure config ([#648](https://github.com/roballred/GovEA/pull/648)). | Product / Engineering | Mitigated | 2026-05-29 |
| R-003 | Data Architecture can keep expanding without quality loops or a deliberate v1 boundary | Scope | Medium | Medium | Prioritize #570 and #573 quality cues before expanding conceptual/logical modeling under #363 | Product | Open | 2026-05-21 |
| R-004 | Stakeholder-facing analytics are still driven by assumed personas and unvalidated trust signals | Product Fit | High | High | Validation infrastructure shipped (#384/#646) but no interview has happened; run the first Tier-1 interview (#668) and log results before building more analysis surfaces | Product | Open | 2026-05-29 |
| R-005 | Glossary, tour, and navigation help can drift back toward the rejected "Modules" term if the settled "Tools" language is not enforced | Product / UX | Low | Medium | Terminology decided: "Tools" is canonical; #512 closed won't-do. Enforce "Tools" when #499 adds inherited glossary/menu definitions; patch any "Modules" drift toward "Tools". | Product | Mitigated | 2026-05-29 |
| R-006 | Documentation can drift behind shipped repo state during fast-moving backlog turns | Process | Medium | Medium | Refresh `README.md`, `capabilities.md`, `docs/product-priorities.md`, and this register during backlog grooming when status materially changes | Product | Watching | 2026-05-21 |
| R-007 | Import/export can create a false portability story if only some entities round-trip cleanly | Product / Trust | Medium | Medium | Continue #596 as small per-entity PRs (six entities round-trip today); preserve export → unchanged import → zero-diff behavior. The #665 recipe-import work is the strategic path for the remainder. | Product / Engineering | Open | 2026-05-29 |

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
- **Status:** Mitigated
- **Last reviewed:** 2026-05-29
- **Mitigation:** #504 release pipeline shipped (#645); deploys are now traceable to a commit/image/revision with smoke-test and one-click rollback. The public-repo topology-exposure concern was resolved by removing the public Azure account deployment config (#648). See [`docs/release-pipeline.md`](./release-pipeline.md).

#### Details

PRs #493 and #498 stabilized the Azure demo runtime and separated demo-mode shortcuts from `NODE_ENV`. #504 then proved the desired release-record shape, shipped in [#645](https://github.com/roballred/GovEA/pull/645): main-branch merges build SHA-tagged immutable images, record commit/digest/revision in the run summary, smoke-test the live URL, and expose a one-click rollback workflow.

The remaining concern was that public GitHub Actions workflow files exposed operator-specific deployment topology. [#648](https://github.com/roballred/GovEA/pull/648) removed the public Azure account deployment config from the repo, closing that gap. Risk is now **Mitigated**. Residual operator step: the pipeline stays dormant until the one-time OIDC setup is completed in the operator-controlled environment; re-open only if topology-specific config is reintroduced to the public repo.

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
- **Last reviewed:** 2026-05-29
- **Mitigation:** Run the first Tier-1 interview (#668) and add the first `business-architecture/feedback-log.md` row. The plan and log substrate shipped (#384/#646), but #384 was closed before any interview happened — the gate is still down.

#### Details

The research artifacts already identify high-risk assumptions about who uses roadmap, confidence-summary, guided-answer, Data Architecture, risk, and architecture-debt surfaces; what formats they trust; and whether they act on freshness or confidence labels at all. If those assumptions are wrong, GovEA can continue shipping polished features that do not improve adoption or decision quality. **Status note (2026-05-29):** the likelihood stays High because, despite the infrastructure landing, zero personas have moved from Assumed to Validated and the feedback log is empty. #668 is the focused successor that carries the actual interview.

### R-005 - Glossary, tour, and navigation help can drift back toward the rejected "Modules" term if the settled "Tools" language is not enforced

- **Category:** Product / UX
- **Impact:** Low
- **Likelihood:** Medium
- **Owner:** Product
- **Status:** Mitigated
- **Last reviewed:** 2026-05-29
- **Mitigation:** Terminology is decided — **"Tools" is canonical and "Modules" is rejected** for the product-area concept. #512 is closed won't-do (recorded 2026-05-22). When #499 adds inherited glossary/menu definitions, enforce "Tools" and patch any "Modules" drift toward "Tools," never the reverse.

#### Details

This row previously stated the decision backwards. The settled outcome (#512, closed won't-do) is that **"Tools" stays as the user-facing term** and "Modules" is rejected. The gate on #499 is therefore lifted — there is no blocking cleanup issue to complete first. The residual, lower risk is drift in the other direction: glossary-backed menu definitions and reusable tour/contextual-help copy re-spreading the rejected "Modules" term. Mitigation is enforcement during #499, not a separate work item.

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
- **Last reviewed:** 2026-05-29
- **Mitigation:** Continue #596 as small per-entity PRs and preserve export → unchanged import → zero-diff behavior. Treat #665 recipe-backed import as the strategic mechanism for content/taxonomy portability beyond flat CSV.

#### Details

PR #604 proved the CSV round-trip pattern, and six entity types now round-trip (Applications, Capabilities, Personas, ADRs, Initiatives, Objectives). The broader Consultant / SI and Early-Maturity Practice Lead promise still requires Services, Value Streams, Principles, Glossary, and Data Architecture to follow. Until that happens, GovEA should describe export/import as partial, not as a full repository portability story. Separately, the operational archive backup/restore path (#660/#661) covers full-instance backup — a different guarantee from per-entity portability; don't conflate the two in product copy. The #665 recipe-import design should define how taxonomy and relationship data port by stable key, which is the missing piece for true repository portability.
