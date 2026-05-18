# Product Priority Shortlist

Last groomed: 2026-05-16 (no open PRs; #507 and #508 merged after the prior grooming pass)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

## Current Signal

The security hardening wave remains closed end-to-end. The remaining security-adjacent backlog is productized control work, not emergency remediation.

The repository-completeness, repository-confidence, and architecture-debt streams are now shipped baselines rather than active build streams:

- [#380](https://github.com/roballred/GovEA/issues/380) shipped snapshot foundations, settings, drill-downs, ranked cleanup actions, RAG indicators, trend history, stakeholder surfaces, and auto-suppression through PRs [#448](https://github.com/roballred/GovEA/pull/448), [#450](https://github.com/roballred/GovEA/pull/450), [#454](https://github.com/roballred/GovEA/pull/454), and [#457](https://github.com/roballred/GovEA/pull/457).
- [#381](https://github.com/roballred/GovEA/issues/381) shipped architecture debt CRUD, linked-debt panels, dashboard priority signals, publish-time acknowledgement, and lifecycle-based system-detected debt through PRs [#459](https://github.com/roballred/GovEA/pull/459), [#466](https://github.com/roballred/GovEA/pull/466), [#467](https://github.com/roballred/GovEA/pull/467), and [#486](https://github.com/roballred/GovEA/pull/486).
- [#437](https://github.com/roballred/GovEA/issues/437) is complete through [#502](https://github.com/roballred/GovEA/pull/502), which added scoped act-as sessions gated by break-glass and a first cross-tenant support action.

The Data Architecture stream from [#363](https://github.com/roballred/GovEA/issues/363) is also a real shipped module: schema and CRUD foundation, relationship editing, business-architecture docs, Chen notation visualization, dedicated sidebar group, and representative demo fixtures have all landed. What remains is a product boundary decision: close the issue as v1-complete, or split conceptual/logical model expansion into explicit follow-up issues.

Recent merged PRs changed the next-work queue:

- [#503](https://github.com/roballred/GovEA/pull/503) recovered the seed cleanup and GovEA Project value-chain enrichment from [#496](https://github.com/roballred/GovEA/pull/496) and [#497](https://github.com/roballred/GovEA/pull/497) onto `main`, closing [#492](https://github.com/roballred/GovEA/issues/492) and adding a PR base-check workflow.
- [#501](https://github.com/roballred/GovEA/pull/501) documented first-class risk tracking and closed [#500](https://github.com/roballred/GovEA/issues/500) as a design/capability-definition slice.
- [#505](https://github.com/roballred/GovEA/pull/505) merged the 2026-05-15 backlog-grooming refresh into `main`.
- [#507](https://github.com/roballred/GovEA/pull/507) aligned module group controls with the sidebar group model and closed [#506](https://github.com/roballred/GovEA/issues/506).
- [#508](https://github.com/roballred/GovEA/pull/508) shipped the org-scoped half of admin notices from [#456](https://github.com/roballred/GovEA/issues/456). Instance-wide notices remain the planned second slice.
- There are no open pull requests at this grooming point.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Finish admin notices with the instance-wide slice | #508 shipped org-scoped notices, but #456 is only complete when instance admins can post distinct instance-wide notices and the UI handles both scopes clearly. | [#456](https://github.com/roballred/GovEA/issues/456) |
| 2 | Build a traceable release pipeline for the Azure demo | Demo stability is now good enough to protect. Manual deploys still make it too hard to know which commit, image digest, and runtime configuration are live. | [#504](https://github.com/roballred/GovEA/issues/504) |
| 3 | Decide module/tool terminology, then implement inherited glossary/menu definitions | Glossary-backed menu definitions and product tours will spread language across the app. Make the #446 wording decision first, then use #499 to seed shared definitions. | [#446](https://github.com/roballred/GovEA/issues/446), [#499](https://github.com/roballred/GovEA/issues/499) |
| 4 | Decide the Data Architecture v1 boundary and split #363 if needed | Data Architecture is no longer speculative. With the v1 metamodel, relationships, diagram, nav, fixtures, and settings alignment shipped, the remaining conceptual/logical scope needs a deliberate follow-up shape. | [#363](https://github.com/roballred/GovEA/issues/363) |
| 5 | Run the persona-validation and feedback-capture slice | GovEA is shipping stakeholder-facing confidence, roadmap, reporting, Data Architecture, risk, and architecture-debt concepts based on assumed personas. Validate before adding more analysis workflows. | [#384](https://github.com/roballred/GovEA/issues/384), [#103](https://github.com/roballred/GovEA/issues/103) |

## Product Manager Notes

- #456 should now be split into an instance-notice PR rather than reopened as another broad design pass. #508 already settled most of the shared notice semantics.
- #504 should be treated as operational product work, not infrastructure polish. The demo is how many users will first understand GovEA.
- #507 reduces the settings/navigation mismatch, so #479 can move when the team wants a usability-focused navigation-density slice. It sits just outside the top five because the current top items reduce broader product and operating risk.
- #500/#501 created the risk-tracking capability definition. Do not jump straight to implementation until persona validation clarifies which risk summaries leadership and practitioners actually trust.
- #482 is important process work, but it has an explicit maintainer-review-first workflow. Do not bypass that by bundling an AI-session-start document into ordinary grooming PRs.
- #436 remains a future security hardening option after enough operational experience with #502's act-as flow. It is not the next security item unless read-surface risk becomes urgent.

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
| #436 - promote break-glass to gate cross-tenant reads | Medium | Open (post-v1 / after act-as operating experience) |
