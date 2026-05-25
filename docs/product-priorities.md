# Product Priority Shortlist

Last groomed: 2026-05-25 (rewritten end-to-end; the prior 2026-05-24 version's entire top-five shipped within ~24 hours of grooming and is no longer actionable).

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

> **Maintenance note.** The in-product `/overview` page renders a `Coming next` tile that mirrors the top-five table below. When you change the top five (re-rank, add, remove, or rewrite an entry) **also update `PRIORITIES` and `PRIORITIES_LAST_GROOMED` in [`apps/govea/src/app/(admin)/overview/page.tsx`](../apps/govea/src/app/(admin)/overview/page.tsx)** so the in-app view stays honest. This doc is the source of truth; the page is a static reflection until a future slice reads the doc at build time.

## Current Signal

A nine-PR ship on 2026-05-24 took out the prior top-five in one window:

- [#628](https://github.com/roballred/GovEA/pull/628) closed the ARB cleanup trio ([#75](https://github.com/roballred/GovEA/issues/75) + [#7](https://github.com/roballred/GovEA/issues/7) closed; [#133](https://github.com/roballred/GovEA/issues/133) addressed but not auto-closed).
- [#630](https://github.com/roballred/GovEA/pull/630) shipped CSV import/export for Initiatives + Objectives.
- [#632](https://github.com/roballred/GovEA/pull/632) shipped Data Vault naming hints ([#570](https://github.com/roballred/GovEA/issues/570)).
- [#633](https://github.com/roballred/GovEA/pull/633) shipped the role-tailored viewer landing ([#548](https://github.com/roballred/GovEA/issues/548)), and same-day siblings [#618](https://github.com/roballred/GovEA/pull/618), plus the earlier closure of #549/#550/#553/#554/#559, brought the viewer-experience epic ([#556](https://github.com/roballred/GovEA/issues/556)) down to a single remaining sub-issue ([#547](https://github.com/roballred/GovEA/issues/547) public-read).
- [#634](https://github.com/roballred/GovEA/pull/634) closed the Scope-field backfill ([#510](https://github.com/roballred/GovEA/issues/510)) and the `cms/deployment-operations` group ([#511](https://github.com/roballred/GovEA/issues/511) addressed but not auto-closed).
- [#626](https://github.com/roballred/GovEA/pull/626) merged: cross-tenant user PII is now gated on break-glass.
- [#637](https://github.com/roballred/GovEA/pull/637) shipped the enterprise-view capability-adoption + duplicate-candidate reports ([#537](https://github.com/roballred/GovEA/issues/537), [#538](https://github.com/roballred/GovEA/issues/538) — also not auto-closed).

The practical implication: differentiator backlog has shifted from "many small persona-walk gaps" to "a smaller set of larger, persona-validation-sensitive items." The next ranking reflects that shift.

## Top Five Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | **In-app stakeholder product overview — slice A: static `/overview` route** | First-time reviewers now land on a richer set of surfaces than they can quickly orient to. The viewer-experience epic delivered better *destinations*; this delivers the *entry page* that explains what GovEA is, what is shipped vs. maturing, and where to click first. Keep the first slice deliberately small: static content, role-aware visibility, no priorities-doc sync, no full CTA matrix. Slices B (CTAs) and C (priorities tile) follow in their own PRs. | [#614](https://github.com/roballred/GovEA/issues/614) |
| 2 | **Traceable release pipeline for the Azure demo** | Promoted off On Hold. The 9-PR same-day ship raised the cost of not having this: every persona-facing feature now depends on the demo being a known build, and reviewers cannot pin what they see to a commit, image digest, or runtime configuration. Operational risk is now larger than the work to close it. | [#504](https://github.com/roballred/GovEA/issues/504) |
| 3 | **Persona validation pass** | Standards.md §"Persona Validation Status" explicitly gates differentiator implementation on validated personas: *"Implementation work that depends solely on assumed personas carries elevated risk and should be noted in the relevant issues."* Several near-term differentiator candidates ([#547](https://github.com/roballred/GovEA/issues/547), [#573](https://github.com/roballred/GovEA/issues/573), [#88](https://github.com/roballred/GovEA/issues/88), [#563](https://github.com/roballred/GovEA/issues/563), [#614](https://github.com/roballred/GovEA/issues/614)) all depend on personas whose validation status has not been audited. A focused sweep through `business-architecture/personas/` tagging each as Assumed or Validated unlocks honest prioritization downstream. | [#384](https://github.com/roballred/GovEA/issues/384) |
| 4 | **Public-read access — last viewer-experience sub-issue** | Six of seven [#556](https://github.com/roballred/GovEA/issues/556) sub-issues are closed; this is the remaining one and the largest. The epic explicitly flags a persona-validation prerequisite: *"deserves at least one real interview before this lands."* Sequence after rank 3 so the implementation is grounded in validated persona input rather than assumed need. | [#547](https://github.com/roballred/GovEA/issues/547) |
| 5 | **Data architecture quality — next slice, scoped on [#363](https://github.com/roballred/GovEA/issues/363) conversation** | The cheap, persona-validated half ([#570](https://github.com/roballred/GovEA/issues/570)) is shipped. The remaining DA Layer 1/2 quality cues and scorecard summary need a product/persona conversation with @nicholerip before scoping. Park here as a placeholder so it does not slip through grooming, and ping [#363](https://github.com/roballred/GovEA/issues/363) before opening implementation issues. | [#573](https://github.com/roballred/GovEA/issues/573), [#363](https://github.com/roballred/GovEA/issues/363) |

## On Hold

Items the product owner has paused; revisit when noted blocker clears:

- **SMTP transport ([#528](https://github.com/roballred/GovEA/issues/528) follow-up) and dependent change-notification email delivery ([#581](https://github.com/roballred/GovEA/issues/581), [#87](https://github.com/roballred/GovEA/issues/87))** — held until an outbound mail account is available. The subscriptions/inbox substrate ([#610](https://github.com/roballred/GovEA/pull/610)), domain-owner attribution ([#611](https://github.com/roballred/GovEA/pull/611)), and non-owner overwrite notification ([#613](https://github.com/roballred/GovEA/pull/613)) all shipped, but sends still hit the stub. Resume when the mail account lands.

## Won't-Do (recorded for future grooming)

- [#512](https://github.com/roballred/GovEA/issues/512) — **"Tools" stays as the user-facing term.** Do not propose Tools→Modules renames in future grooming. If "Modules" appears in capability docs, patch the drift toward "Tools," not the other way. Decision recorded 2026-05-22.

## Product Manager Notes

- **Backlog hygiene — close-keyword drift.** Several recent PRs landed work but did not auto-close their named issues: [#133](https://github.com/roballred/GovEA/issues/133), [#366](https://github.com/roballred/GovEA/issues/366), [#511](https://github.com/roballred/GovEA/issues/511), [#538](https://github.com/roballred/GovEA/issues/538), [#543](https://github.com/roballred/GovEA/issues/543) all remain open despite being referenced by merged PR titles. Worth a one-pass cleanup before the next grooming so the open-issue count reflects reality.
- **Persona validation (rank 3) should precede ranks 4 and 5.** Without it, #547 and #573 implementation will repeat the "designed against an assumed persona" risk the standards flag.
- **#614 (rank 1) is the cheapest differentiator on the board right now** and has the largest stakeholder-comprehension payoff. The issue body lists six page sections — slice them across at least three PRs; do not attempt the whole spec in one.
- **#504 (rank 2) was held in the prior grooming with the explicit note "Promote back into the top five when ready to take it on."** That moment is now: nothing else in flight is gated on it, and every feature ship from here forward inherits the same opacity problem until it lands.
- The **viewer-experience epic [#556](https://github.com/roballred/GovEA/issues/556)** can likely close once #547 lands and the close-keyword hygiene sweep above runs.

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
