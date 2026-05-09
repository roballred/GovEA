# Product Priority Shortlist

Last groomed: 2026-05-09 (security wave fully closed; regression coverage in flight; feature roadmap unblocked)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

The 2026-05-07 security scan that surfaced nine high-severity findings is now fully closed. The last three open from yesterday — #416 (transactional audit), #417 (append-only `audit_log`), #418 (break-glass TTL + dual control) — all merged today (PRs #433, #438). The hardening wave is done; the live tenant-data attack surface, the post-mutation integrity surface, and the exception-access surface are all addressed.

Two follow-up issues opened off #418 — both are explicit deferrals of scope, not new findings:

- [#436](https://github.com/roballred/GovEA/issues/436) — promote break-glass to gate cross-tenant **reads** (Option 1 promotion of #418's Option 2)
- [#437](https://github.com/roballred/GovEA/issues/437) — wire cross-tenant **impersonation** through the break-glass gate

A triage pass posted on both today flagged that the `requireBreakGlass(orgId)` enforcement helper they assume *does not yet exist* — only `getActiveBreakGlass(adminId, orgId)` (returns row or undefined). Whichever issue lands first must add the enforcement helper as PR-A. Recommended sequence: helper → #437 (mutation caller, makes #418 a functional control) → operational soak → #436 (read-gating). My read is #436 is post-v1; happy to be overruled.

Regression test coverage for the hardening wave is in flight:

- [#440](https://github.com/roballred/GovEA/pull/440) — middleware unauth-POST regression test (#421) — re-PR'd against `main` after the original PR landed on a feature branch instead.
- [#441](https://github.com/roballred/GovEA/pull/441) — read-action tenant-isolation regression test (#422) — locks in the #411–#414 contract that read actions source `organizationId`/`role` from the session, never from caller input. Covers `getUsers`, `getCapabilities`, `getOtherOrganizations`, `getConnections`, `getTaxonomyTerms`.

What this means for prioritization:

- Security work is no longer the lead item. The two regression-test PRs (#440, #441) are the last items closing the wave; everything after is feature roadmap.
- The deferred break-glass extensions (#436, #437) are real but should not block v1. They become important once Option 2 has operational mileage.
- The feature roadmap below is now genuinely unblocked: repository trust → debt/decision capture → persona validation. None of these have been started in implementation.
- [#402](https://github.com/roballred/GovEA/issues/402) (configurable platform defaults, deferred from #390) remains the smallest concrete platform-admin task and is a good "one-PR win" candidate between security and the next feature slice.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Land #440 and #441 — regression coverage for the hardening wave | All nine high-severity findings are fixed in production code; without these tests, a future change that widens the middleware matcher or reintroduces a caller-supplied `organizationId`/`role` parameter will regress silently. Both PRs are open against `main`, tests passing locally (29/29 for #440, 12/12 for #441). | #421, #422 |
| 2 | Ship repository completeness drill-downs and a plain-language confidence summary | Reporting, heatmaps, impact analysis, and executive summaries now depend on users trusting the underlying repository. v0 (live-query coverage signals + admin-only `ConfidenceSummary` component) is in code; the issue scope adds snapshots, drill-downs, configurable targets, ranked-action list, and stakeholder-facing surfaces. Sliced into 4 PRs in the [issue plan](https://github.com/roballred/GovEA/issues/380#issuecomment-4412881773): snapshot foundation → settings model → drill-downs + ranked actions → trend line + stakeholder surfaces. | `rm-repository-completeness`, `fd-repository-confidence-summary`, [#380](https://github.com/roballred/GovEA/issues/380) |
| 3 | Add architecture debt tracking and make ADRs a stronger decision-support surface | Impact analysis surfaces consequences, but GovEA still lacks a first-class way to record persistent constraints and tradeoff accumulation. That is the gap between "what is affected" and "what should leadership worry about next." Pairs naturally with #380 PR-3 (the unified priority signal summary referenced in `rm-architecture-debt`). | `rm-architecture-debt`, `po-architecture-decisions`, [#381](https://github.com/roballred/GovEA/issues/381) |
| 4 | Validate assumed personas and start a lightweight product feedback loop | Repository modelling and integration are still driven by assumed personas. With multi-tenant hardening done and executive-facing surfaces shipped, the cost of building the wrong next analytic feature has gone up. | Persona docs, `docs/research/`, [#103](https://github.com/roballred/GovEA/issues/103), [#384](https://github.com/roballred/GovEA/issues/384) |
| 5 | Ship #402 — configurable platform operation defaults | Small, well-defined, deferred from #390. Good one-PR win to slot between feature slices when context-switching. Schema impact is minimal. | [#402](https://github.com/roballred/GovEA/issues/402) |

## Product Manager Notes

- The hardening wave is fully closed. The remaining "security" backlog (#436, #437) is feature work gated on operational experience with #418, not blockers.
- The break-glass machinery currently has no production caller for mutations — #418 is decorative until #437 (or a smaller "wire requireBreakGlass into one mutation surface" issue) lands. This is fine for v1 *only if* an operator never actually relies on break-glass to control an incident. For real cross-tenant ops, #437 should land before public launch.
- #380 is the next big feature slice and is genuinely sized — 4 PRs, sub-300 LoC each in product code, with the performance ADR (`rm-query-performance-decision.md`) already accepted. The first PR (snapshot foundation + indexes) has no UI changes and is risk-free to land.
- [#363](https://github.com/roballred/GovEA/issues/363) (Data Architecture Metamodel) remains in active triage — maintainer questions outstanding. Next move there is a v1-vs-future scope decision, not engineering. Worth a 15-minute pass.
- The ARB/research issues (90s, 130s, 300s) remain capability-definition work. None blocking the items above.

## Security Remediation Status (as of 2026-05-09)

| Issue | Severity | Status |
|---|---|---|
| #411 — `getUsers` cross-tenant + secret exposure | High | ✅ Fixed (PR #424) |
| #412 — cross-org-link helpers reachable as RPC | High | ✅ Fixed (PR #425) |
| #413 — read actions trust caller `organizationId` | High | ✅ Fixed (PR #426) |
| #414 — read actions trust caller `role` | High | ✅ Fixed (PR #426) |
| #427 — entity-taxonomy helpers reachable as RPC | High | ✅ Fixed (PR #428) |
| #415 — junction writes skip target-entity org check | High | ✅ Fixed (PR #429) |
| #416 — audit writes not transactional with mutation | High | ✅ Fixed |
| #417 — `audit_log` has no DB-level append-only constraint | High | ✅ Fixed (PR #433) |
| #418 — break-glass TTL 24h; no dual control | High | ✅ Fixed (PR #438) |
| #421 — test: unauthenticated server-action POSTs blocked | Enhancement | 🟡 PR #440 open against main |
| #422 — test: read actions ignore caller-supplied orgId/role | Enhancement | 🟡 PR #441 open against main |
| #436 — promote break-glass to gate cross-tenant reads | Medium | Open (post-v1 per triage) |
| #437 — wire cross-tenant impersonation through break-glass | Medium | Open (pre-v1 per triage) |
