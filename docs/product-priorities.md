# Product Priority Shortlist

Last groomed: 2026-05-26 (rewritten end-to-end; the prior 2026-05-25 version's ranks 1 and 2 both shipped within ~24 hours of grooming. Ranks 4 and 5 are now formally gated on rank 3 outcomes per the new validation plan, so they leave the top five until the gate lifts).

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

> **Maintenance note.** The in-product `/overview` page renders a `Coming next` tile that mirrors the top-five table below. When you change the top five (re-rank, add, remove, or rewrite an entry) **also update `PRIORITIES` and `PRIORITIES_LAST_GROOMED` in [`apps/govea/src/app/(admin)/overview/page.tsx`](../apps/govea/src/app/(admin)/overview/page.tsx)** so the in-app view stays honest. This doc is the source of truth; the page is a static reflection until a future slice reads the doc at build time.

## Current Signal

The prior top five worked through quickly:

- **Rank 1 — #614 in-app stakeholder product overview.** Sliced A/B/C, all three PRs merged ([#640](https://github.com/roballred/GovEA/pull/640), [#641](https://github.com/roballred/GovEA/pull/641), [#642](https://github.com/roballred/GovEA/pull/642)) + the CI fix ([#643](https://github.com/roballred/GovEA/pull/643)) so the new role-gating tests actually run. The `/overview` route now ships role-aware CTAs and a Coming-next priorities tile.
- **Rank 2 — #504 traceable release pipeline.** Shipped in [#645](https://github.com/roballred/GovEA/pull/645). Two new workflows (`deploy-azure-dev.yml`, `rollback-azure-dev.yml`) plus [`docs/release-pipeline.md`](./release-pipeline.md). Pipeline is dormant until the maintainer completes the one-time OIDC setup but the code is in. Risk-register R-002 moved Open → Mitigated.
- **Rank 3 — #384 persona validation.** Documentation infrastructure landed in [#646](https://github.com/roballred/GovEA/pull/646): a validation plan, the assumption-register extension (Repository Modelling + Integration sections), and the Phase 1 `business-architecture/feedback-log.md`. The interviews themselves remain the human task — no persona moved from Assumed to Validated yet.
- **Ranks 4 (#547) and 5 (#573)** stayed parked behind rank 3, exactly as the prior grooming sequenced.

Plus a clean backlog-hygiene sweep this pass: [#133](https://github.com/roballred/GovEA/issues/133), [#366](https://github.com/roballred/GovEA/issues/366), [#511](https://github.com/roballred/GovEA/issues/511), [#538](https://github.com/roballred/GovEA/issues/538), [#543](https://github.com/roballred/GovEA/issues/543) all closed retrospectively with PR back-references.

The practical implication: the next ranking has to balance **gate-lifting** (the rank-1 interview), **deferred-but-not-gone** foundation hygiene (ARB findings that have aged), and **differentiator design work that doesn't need interviews**.

## Top Five Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | **Run the first #384 Tier-1 interview** | The validation plan ([`docs/research/validation-plan.md`](./research/validation-plan.md)) is in place; the next move is one real conversation. Recommended first candidate: an Elected Official or chief of staff testing the staff-proxy hypothesis (GA-1, RT-1). Until one Tier-1 conversation lands, ranks 4-5 of the prior list stay parked. This is the cheapest unblock on the board. | [#384](https://github.com/roballred/GovEA/issues/384), [#547](https://github.com/roballred/GovEA/issues/547), [#573](https://github.com/roballred/GovEA/issues/573), [#563](https://github.com/roballred/GovEA/issues/563), [#88](https://github.com/roballred/GovEA/issues/88) |
| 2 | **#10 — close the only open High-severity ARB finding (v1/v2 scope signals)** | Filed 2026-04-04, still open. The deployment-operations capability group ship ([#634](https://github.com/roballred/GovEA/pull/634)) closed half of #10's intent; the residual v1/v2 scope-signal work on capability files remains. Director-persona reading of "what do I get day one vs later" is genuinely opaque without it, and it's a doc-shaped task that doesn't need an interview. High-severity ARB findings shouldn't age past two grooming cycles. | [#10](https://github.com/roballred/GovEA/issues/10) |
| 3 | **#34 — consolidate RBAC into a single source of truth** | Medium-severity ARB finding, but RBAC duplication between `apps/govea/src/lib/rbac.ts` and `packages/core/src/rbac/index.ts` grows monotonically with every new route. Behaviour-drift risk is security-adjacent and silent — exactly the kind of debt that turns into a real incident if it ages further. Foundation work; not gated on personas. | [#34](https://github.com/roballred/GovEA/issues/34) |
| 4 | **#71 + #94 — EA Adoption & Engagement capability area** | Differentiator capability-doc work pairing the feat ([#71](https://github.com/roballred/GovEA/issues/71)) with the ARB finding ([#94](https://github.com/roballred/GovEA/issues/94)) that named the same gap. The 2026 EA market research called out adoption as the single most persistent cross-tool weakness, and GovEA's persona thesis explicitly targets non-EA stakeholders. Designing the capability group first (sub-capabilities, persona links) is a docs slice that does not need interviews and seeds implementation issues for the next quarter. | [#71](https://github.com/roballred/GovEA/issues/71), [#94](https://github.com/roballred/GovEA/issues/94) |
| 5 | **#518 — GovEA Project as continuous product documentation** | The seeded GovEA Project organisation should model the actual product as it evolves: strategy, goals, objectives, value streams, initiatives, principles, ADRs, services, applications, capabilities, personas. Cheap to maintain incrementally; compounds into a much more credible demo and a real dogfood loop with every grooming cycle. Differentiator. Treat as recurring rather than one-shot. | [#518](https://github.com/roballred/GovEA/issues/518) |

## What dropped out of the top five

- **#547 public-read access** and **#573 + #363 data architecture quality next slice** — explicitly gated on the rank-1 interview per the validation plan. They re-enter the top five the same week a Tier-1 conversation lands and either confirms or disconfirms the underlying assumptions.
- **#614 / #504** — closed this cycle (see Current Signal above).

## On Hold

Items the product owner has paused; revisit when noted blocker clears:

- **SMTP transport ([#528](https://github.com/roballred/GovEA/issues/528) follow-up) and dependent change-notification email delivery ([#581](https://github.com/roballred/GovEA/issues/581), [#87](https://github.com/roballred/GovEA/issues/87))** — held until an outbound mail account is available. The subscriptions/inbox substrate ([#610](https://github.com/roballred/GovEA/pull/610)), domain-owner attribution ([#611](https://github.com/roballred/GovEA/pull/611)), and non-owner overwrite notification ([#613](https://github.com/roballred/GovEA/pull/613)) all shipped, but sends still hit the stub. Resume when the mail account lands.

## Won't-Do (recorded for future grooming)

- [#512](https://github.com/roballred/GovEA/issues/512) — **"Tools" stays as the user-facing term.** Do not propose Tools→Modules renames in future grooming. If "Modules" appears in capability docs, patch the drift toward "Tools," not the other way. Decision recorded 2026-05-22.

## Product Manager Notes

- **Rank 1 is interview-shaped, not implementation-shaped.** Don't treat #384 as "more docs to write." The validation plan is written; what's missing is one real human conversation. A 30-minute call beats another doc pass.
- **The viewer-experience epic [#556](https://github.com/roballred/GovEA/issues/556)** can likely close once #547 lands; for now it stays open since the gating relationship is real.
- **High-severity ARB findings (#10) shouldn't keep aging.** Two grooming cycles is the soft limit; this one filed 2026-04-04 is now well past. Rank 2 here is partly an admission that we let it slip.
- **Pair #71 and #94.** They describe the same problem from product-design and ARB angles; landing them as one capability-doc slice avoids duplicated edits and clarifies which sub-capability ideas survive ARB review.
- **#518 is a habit, not a feature.** Add it to grooming pre-flight: "did anything in this cycle change the canonical product story? If yes, update the GovEA Project seed." Don't try to make it a one-shot deliverable.
- **Backlog hygiene actioned this cycle.** #133, #366, #511, #538, #543 closed retrospectively. The close-keyword-drift bullet stays out of the top five going forward unless a new batch accumulates.

## Security Remediation Status

| Issue | Severity | Status |
|---|---|---|
| #411 - `getUsers` cross-tenant + secret exposure | High | Fixed (PR #424) |
| #412 - cross-org-link helpers reachable as RPC | High | Fixed (PR #425) |
| #413 - read actions trust caller `organizationId` | High | Fixed (PR #426) |
| #414 - read actions trust caller `role` | High | Fixed (PR #426) |
| #427 - entity-taxonomy helpers reachable as RPC | High | Fixed (PR #428) |
| #415 - junction writes skip target-entity org check | High | Fixed (PR #429) |
| #416 - audit writes not transactional with mutation | High | Fixed |
| #417 - `audit_log` has no DB-level append-only constraint | High | Fixed (PR #433) |
| #418 - break-glass TTL 24h; no dual control | High | Fixed (PR #438) |
| #421 - test: unauthenticated server-action POSTs blocked | Enhancement | Fixed (PR #440) |
| #422 - test: read actions ignore caller-supplied orgId/role | Enhancement | Fixed (PR #441) |
| #437 - wire cross-tenant impersonation through break-glass | Medium | Fixed (PR #502) |
| #436 - cross-tenant **user-PII** read gate (re-scoped from original) | Medium | Fixed (PR #626) |
