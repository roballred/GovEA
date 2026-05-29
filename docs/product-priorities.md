# Product Priority Shortlist

Last groomed: 2026-05-29 (the 2026-05-26 top five aged fast: ranks 2 (#10), 3 (#34), and 5 (#518) all shipped, and rank 1's issue #384 was closed with its interview acceptance criteria unmet — so the gate it represents is still down. Re-ranked around the surviving differentiator work plus the new TOGAF-recipe direction (#665), and repointed rank 1 at the focused successor issue #668).

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

> **Maintenance note.** The in-product `/overview` page renders a `Coming next` tile that mirrors the top-five table below. When you change the top five (re-rank, add, remove, or rewrite an entry) **also update `PRIORITIES` and `PRIORITIES_LAST_GROOMED` in [`apps/govea/src/app/(admin)/overview/page.tsx`](../apps/govea/src/app/(admin)/overview/page.tsx)** so the in-app view stays honest. This doc is the source of truth; the page is a static reflection until a future slice reads the doc at build time.

## Current Signal

Three of the prior five top items shipped in the three days since the last grooming:

- **Rank 2 — #10 v1/v2 scope signals.** ✅ Shipped ([#653](https://github.com/roballred/GovEA/pull/653)). The only open High-severity ARB finding is now closed.
- **Rank 3 — #34 RBAC consolidation.** ✅ Shipped ([#651](https://github.com/roballred/GovEA/pull/651)). RBAC now lives in `@govea/core`.
- **Rank 5 — #518 GovEA Project dogfood.** ✅ Refreshed ([#650](https://github.com/roballred/GovEA/pull/650)). Treated as a recurring habit, so it stays on the radar but not the ranking.

Two prior items remain genuinely open, and one is mistracked:

- **Rank 1 — the persona-validation interview is still not done.** #384 was *closed* on 2026-05-26 when the validation **infrastructure** landed ([#646](https://github.com/roballred/GovEA/pull/646)), but its own acceptance criteria are unmet: `business-architecture/feedback-log.md` is still `_(awaiting first conversation)_` and all 16 personas remain `Assumed`. Closing the issue created a false-green signal that validation is handled. This grooming opens a focused successor — **[#668](https://github.com/roballred/GovEA/issues/668)** — scoped to the one human action (run one interview) and repoints rank 1 there.
- **Rank 4 — #71 + #94 adoption capability** stayed open; it moves up.

Other ships worth noting since last grooming (not from the top five): operational backup export/import ([#660](https://github.com/roballred/GovEA/pull/660), [#661](https://github.com/roballred/GovEA/pull/661)), instance-wide notices ([#659](https://github.com/roballred/GovEA/pull/659)), single-open accordion nav ([#664](https://github.com/roballred/GovEA/pull/664)), `pnpm verify` ([#654](https://github.com/roballred/GovEA/pull/654)), and the README simplification ([#667](https://github.com/roballred/GovEA/pull/667)). New on the board: **#665** (replace the TOGAF overlay with recipe-backed taxonomy/data import) — a large, strategically significant design that also advances the import/export portability story (R-007).

The practical implication: rank 1 stays the interview (now #668) because it gates four differentiator items; below it, the ranking is **differentiator design work that doesn't need interviews** (#71/#94, #665) plus the recurring dogfood habit and a now-unblocked glossary item.

## Top Five Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | **Run the first Tier-1 persona-validation interview** | The validation plan ([`docs/research/validation-plan.md`](./research/validation-plan.md)) and feedback-log substrate are in place; the missing step is one real conversation. Recommended first candidate: an Elected Official or chief of staff testing the staff-proxy hypothesis (GA-1, RT-1). #384 was closed with this criterion unmet, so a focused successor (#668) now carries it. Until one Tier-1 conversation lands, #547/#573/#563/#88 stay parked. The cheapest unblock on the board. | [#668](https://github.com/roballred/GovEA/issues/668), [#547](https://github.com/roballred/GovEA/issues/547), [#573](https://github.com/roballred/GovEA/issues/573), [#563](https://github.com/roballred/GovEA/issues/563), [#88](https://github.com/roballred/GovEA/issues/88) |
| 2 | **#71 + #94 — EA Adoption & Engagement capability area** | Differentiator capability-doc work pairing the feat ([#71](https://github.com/roballred/GovEA/issues/71)) with the ARB finding ([#94](https://github.com/roballred/GovEA/issues/94)) that named the same gap. The 2026 EA market research called out adoption as the single most persistent cross-tool weakness, and GovEA's persona thesis explicitly targets non-EA stakeholders. Designing the capability group first (sub-capabilities, persona links) is a docs slice that does not need interviews and seeds implementation issues for the next quarter. | [#71](https://github.com/roballred/GovEA/issues/71), [#94](https://github.com/roballred/GovEA/issues/94) |
| 3 | **#665 — replace the TOGAF overlay with recipe-backed import (design slice first)** | Turns framework support from a hard-coded overlay into the recipe/taxonomy system, keeps EasyEA the default, and makes future frameworks "one recipe, not a fork." The recipe *data-import* requirement also advances the broader portability story (R-007). It's large — the issue lists five slices — so do **design slice 1 only** (recipe import schema + idempotency rules) before committing to implementation, and **reconcile with the existing TOGAF-taxonomy design issue [#313](https://github.com/roballred/GovEA/issues/313)** rather than running both in parallel. Not gated on personas. | [#665](https://github.com/roballred/GovEA/issues/665), [#313](https://github.com/roballred/GovEA/issues/313) |
| 4 | **#518 — GovEA Project as continuous product documentation** | The seeded GovEA Project organisation should model the actual product as it evolves: strategy, goals, objectives, value streams, initiatives, principles, ADRs, services, applications, capabilities, personas. Cheap to maintain incrementally; compounds into a much more credible demo and a real dogfood loop with every grooming cycle. Differentiator. Treat as recurring rather than one-shot — re-confirm it every grooming pass. | [#518](https://github.com/roballred/GovEA/issues/518) |
| 5 | **#499 — inherited system glossary (now unblocked)** | Was gated behind the "Modules vs Tools" terminology decision (risk R-005). That decision is settled — #512 closed won't-do, "Tools" is canonical — so the gate is gone. Authoring inherited glossary/menu definitions now (using "Tools") removes a long-standing UX ambiguity and supports the viewer-experience epic #556. Doc/config-shaped; not gated on personas. **Use "Tools," never reintroduce "Modules."** | [#499](https://github.com/roballred/GovEA/issues/499) |

## What dropped out of the top five

- **#10, #34** — shipped this cycle ([#653](https://github.com/roballred/GovEA/pull/653), [#651](https://github.com/roballred/GovEA/pull/651)); see Current Signal.
- **#547 public-read access**, **#573 + #363 data architecture quality next slice**, **#563 budget dimensions**, **#88 maturity assessment** — explicitly gated on the rank-1 interview (#668) per the validation plan. They re-enter the top five the same week a Tier-1 conversation lands and either confirms or disconfirms the underlying assumptions.
- **#518** — refreshed this cycle ([#650](https://github.com/roballred/GovEA/pull/650)); demoted to rank 4 as the recurring dogfood habit rather than dropped.

## On Hold

Items the product owner has paused; revisit when noted blocker clears:

- **SMTP transport ([#528](https://github.com/roballred/GovEA/issues/528) follow-up) and dependent change-notification email delivery ([#581](https://github.com/roballred/GovEA/issues/581), [#87](https://github.com/roballred/GovEA/issues/87))** — held until an outbound mail account is available. The subscriptions/inbox substrate ([#610](https://github.com/roballred/GovEA/pull/610)), domain-owner attribution ([#611](https://github.com/roballred/GovEA/pull/611)), and non-owner overwrite notification ([#613](https://github.com/roballred/GovEA/pull/613)) all shipped, but sends still hit the stub. Resume when the mail account lands.

## Won't-Do (recorded for future grooming)

- [#512](https://github.com/roballred/GovEA/issues/512) — **"Tools" stays as the user-facing term.** Do not propose Tools→Modules renames in future grooming. If "Modules" appears in capability docs, patch the drift toward "Tools," not the other way. Decision recorded 2026-05-22.

## Product Manager Notes

- **Rank 1 is interview-shaped, not implementation-shaped.** Don't treat #668 as "more docs to write." The validation plan is written; what's missing is one real human conversation. A 30-minute call beats another doc pass.
- **Don't close validation issues on infrastructure alone.** #384 was closed when the plan/log shipped, even though no interview happened — which hid the live gate for three days. Lesson for grooming: a research issue whose acceptance criteria require *evidence* (a validated/disconfirmed assumption, a feedback-log row) is not "done" until that evidence exists. #668 is scoped tightly to that evidence so it can't be closed prematurely again.
- **The viewer-experience epic [#556](https://github.com/roballred/GovEA/issues/556)** can likely close once #547 lands; for now it stays open since the gating relationship is real, and #547 is itself gated on #668.
- **Pair #71 and #94.** They describe the same problem from product-design and ARB angles; landing them as one capability-doc slice avoids duplicated edits and clarifies which sub-capability ideas survive ARB review.
- **#665 is a design issue, not an implementation green-light.** It overlaps #313 (TOGAF taxonomy/ADM design). Reconcile the two before writing code — decide whether #313 is subsumed by #665 or scopes a distinct slice. Land the recipe-import schema + idempotency rules first; implementation slices follow.
- **#518 is a habit, not a feature.** Add it to grooming pre-flight: "did anything in this cycle change the canonical product story? If yes, update the GovEA Project seed." Don't try to make it a one-shot deliverable.
- **#499 unblocked by the terminology decision.** With #512 closed won't-do ("Tools" canonical), risk R-005's gate is gone — but the temptation to reintroduce "Modules" lives on in glossary/menu copy. When #499 moves, enforce "Tools."

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
