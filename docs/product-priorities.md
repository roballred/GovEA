# Product Priority Shortlist

Last groomed: 2026-05-14 (architecture-debt PR-4 and feature-management wording PR open)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

## Current Signal

The security hardening wave remains closed end-to-end. The remaining security-adjacent backlog is productized control work, not emergency remediation.

The repository-completeness and repository-confidence stream from [#380](https://github.com/roballred/GovEA/issues/380) has moved from "active build" to "shipped baseline":

- [#448](https://github.com/roballred/GovEA/pull/448) — snapshot foundation + indexes
- [#450](https://github.com/roballred/GovEA/pull/450) — settings model + admin config
- [#454](https://github.com/roballred/GovEA/pull/454) — drill-downs + ranked actions + RAG indicators
- [#457](https://github.com/roballred/GovEA/pull/457) — trend line + stakeholder surfaces + auto-suppression

The next repository-modelling stream, [#381](https://github.com/roballred/GovEA/issues/381), is now mostly implemented rather than merely planned. PRs [#459](https://github.com/roballred/GovEA/pull/459), [#466](https://github.com/roballred/GovEA/pull/466), and [#467](https://github.com/roballred/GovEA/pull/467) are merged. The final open step is [#486](https://github.com/roballred/GovEA/pull/486), which adds lifecycle-based auto-flagging and the system-detected debt badge.

The Data Architecture stream from [#363](https://github.com/roballred/GovEA/issues/363) has also become a real shipped module: schema and CRUD foundation, business-architecture docs, Chen Notation visualization, dedicated sidebar group, and representative demo fixtures have all landed. What remains is a product boundary decision: close the issue as v1-complete, or split conceptual/logical model expansion into explicit follow-up issues.

There are two open PRs at this grooming point:

- [#486](https://github.com/roballred/GovEA/pull/486) — final architecture-debt slice for #381
- [#487](https://github.com/roballred/GovEA/pull/487) — documentation and UI copy alignment for instance-wide module availability controls

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Review and merge PR #486, then close or narrow #381 | Architecture debt is now the strongest unfinished product stream. PR #486 completes the planned four-PR sequence by adding system-detected lifecycle debt, idempotent severity updates, and visible human-vs-system distinction. After merge, #381 should either close or explicitly list any residual ADR-decision-support gaps. | [#486](https://github.com/roballred/GovEA/pull/486), [#381](https://github.com/roballred/GovEA/issues/381) |
| 2 | Review and merge PR #487, then close #445 | This is a small clarity PR with high process value. It aligns docs and UI language around instance-wide module availability controls, reducing confusion between org-level settings and platform-wide controls. | [#487](https://github.com/roballred/GovEA/pull/487), [#445](https://github.com/roballred/GovEA/issues/445) |
| 3 | Decide the Data Architecture v1 boundary and split #363 if needed | Data Architecture is no longer speculative. With the v1 metamodel, diagram, nav, and fixtures shipped, the issue should not remain an open-ended request. Make the product call on conceptual/logical expansion and create focused follow-ups if that work remains in scope. | [#363](https://github.com/roballred/GovEA/issues/363) |
| 4 | Run the persona-validation and feedback-capture slice | GovEA is now shipping stakeholder-facing confidence, roadmap, reporting, Data Architecture, and architecture-debt surfaces based on assumed personas. Validate the highest-risk assumptions before adding more analysis workflows. | [#384](https://github.com/roballred/GovEA/issues/384), [#103](https://github.com/roballred/GovEA/issues/103) |
| 5 | Give break-glass a real production caller | Break-glass controls are implemented, but operational credibility depends on a real support/debugging flow that consults `requireBreakGlass`. Ship #437 before treating the control as proven in incident scenarios. | [#437](https://github.com/roballred/GovEA/issues/437) |

## Product Manager Notes

- #486 is the highest-leverage immediate action because it finishes an already-reviewed stream rather than starting a new one.
- #487 should stay ahead of broader terminology work in #446. First make the current "module availability" language clear; then decide whether "module" should become "tool" in user-facing copy.
- #479 remains a good follow-up once the two open PRs are cleared. The Data Architecture sidebar group makes collapsible navigation more valuable, but it is still a usability improvement rather than a product-risk reducer.
- #382 is the next major roadmap candidate after the current repository-modelling and validation items. It should not jump the queue until the team decides how much integration scope belongs in v1.
- #482 is important process work, but it has an explicit maintainer-review-first workflow. Do not bypass that by bundling an AI-session-start document into ordinary grooming PRs.

## Security Remediation Status

| Issue | Severity | Status |
|---|---|---|
| #411 — `getUsers` cross-tenant + secret exposure | High | Fixed (PR #424) |
| #412 — cross-org-link helpers reachable as RPC | High | Fixed (PR #425) |
| #413 — read actions trust caller `organizationId` | High | Fixed (PR #426) |
| #414 — read actions trust caller `role` | High | Fixed (PR #426) |
| #427 — entity-taxonomy helpers reachable as RPC | High | Fixed (PR #428) |
| #415 — junction writes skip target-entity org check | High | Fixed (PR #429) |
| #416 — audit writes not transactional with mutation | High | Fixed |
| #417 — `audit_log` has no DB-level append-only constraint | High | Fixed (PR #433) |
| #418 — break-glass TTL 24h; no dual control | High | Fixed (PR #438) |
| #421 — test: unauthenticated server-action POSTs blocked | Enhancement | Fixed (PR #440) |
| #422 — test: read actions ignore caller-supplied orgId/role | Enhancement | Fixed (PR #441) |
| #436 — promote break-glass to gate cross-tenant reads | Medium | Open (post-v1 per triage) |
| #437 — wire cross-tenant impersonation through break-glass | Medium | Open (recommended before relying on break-glass operationally) |
