# Product Priority Shortlist

Last groomed: 2026-05-10 (security regression coverage merged; repository-completeness slice 1-3 merged; PR-4 open)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

## Current Signal

The 2026-05-07 security hardening wave is closed end-to-end. The production fixes merged via PRs #424, #425, #426, #428, #429, #433, and #438, and the two regression-test follow-ups are also merged:

- [#421](https://github.com/roballred/GovEA/issues/421) — closed by PR #440
- [#422](https://github.com/roballred/GovEA/issues/422) — closed by PR #441

That means security is no longer the immediate planning bottleneck. The bottleneck has shifted back to repository trust and product fit.

The repository-completeness slice in [#380](https://github.com/roballred/GovEA/issues/380) is also no longer merely "planned":

- PR-1 merged: [#448](https://github.com/roballred/GovEA/pull/448) — snapshot foundation + indexes
- PR-2 merged: [#450](https://github.com/roballred/GovEA/pull/450) — settings model + admin config
- PR-3 merged: [#454](https://github.com/roballred/GovEA/pull/454) — drill-downs + ranked actions + RAG indicators
- PR-4 open: [#457](https://github.com/roballred/GovEA/pull/457) — trend line + stakeholder surfaces + auto-suppression, tracking [#455](https://github.com/roballred/GovEA/issues/455)

Only one PR is currently open in the repo: **#457**. So the highest-leverage next move is to finish that slice cleanly, close #455, and then either close #380 or reduce it to whatever remains after PR-4 merges.

Two break-glass follow-up issues remain open from #418:

- [#437](https://github.com/roballred/GovEA/issues/437) — wire a real cross-tenant mutation/impersonation caller through `requireBreakGlass`
- [#436](https://github.com/roballred/GovEA/issues/436) — later Option 1 promotion to gate cross-tenant reads

These are not new vulnerabilities, but they do matter for operational credibility. #437 is the earlier one because it gives the new break-glass control an actual caller; #436 is stricter follow-on hardening and reads as post-v1 unless operator experience says otherwise.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Merge PR #457 and close out the repository-confidence slice | PRs #448, #450, and #454 already landed, so #457 is the last open step in the highest-value current feature stream. It puts the confidence summary onto `/roadmap` and `/executive`, adds the trend line, and finishes the suppression loop. That closes #455 and likely most or all of #380. | [#457](https://github.com/roballred/GovEA/pull/457), [#455](https://github.com/roballred/GovEA/issues/455), [#380](https://github.com/roballred/GovEA/issues/380) |
| 2 | Start architecture debt tracking and ADR decision support | The product can now show impact and repository quality, but it still cannot record durable constraints, debt severity, or remediation paths. This is the clean next step in the repository-modelling roadmap, and PR-3 already laid groundwork for a future unified priority queue. | `rm-architecture-debt`, `po-architecture-decisions`, [#381](https://github.com/roballred/GovEA/issues/381) |
| 3 | Run the persona-validation and feedback-capture slice | The riskiest product assumption is now fit, not infrastructure. The research materials already exist in `docs/research/`, and #103's manual feedback log is still unstarted. Before building more stakeholder-facing analytics, validate who actually uses these views and what they trust. | [#384](https://github.com/roballred/GovEA/issues/384), [#103](https://github.com/roballred/GovEA/issues/103) |
| 4 | Give break-glass a real production caller via #437 | #418 shipped the control machinery, but today it is still mostly governance scaffolding. If GovEA expects instance admins to rely on break-glass in real support/debugging scenarios, #437 is the issue that turns it into a functional control. | [#437](https://github.com/roballred/GovEA/issues/437) |
| 5 | Make the v1-vs-future scope decision on the Data Architecture Metamodel | #363 is active, externally visible, and now has enough discussion to require a product call. The next move is not engineering; it is deciding whether GovEA should absorb conceptual/logical/physical data-model concerns in v1 scope or explicitly defer them. | [#363](https://github.com/roballred/GovEA/issues/363) |

## Product Manager Notes

- The hardening wave is fully closed, including regression coverage. The remaining security-labeled backlog is productized control work, not emergency remediation.
- #457 is now the natural "finish what is already 75% shipped" priority. It has the best effort-to-value ratio in the repo because it completes an existing four-PR sequence instead of starting a new stream.
- #381 is the next major implementation stream after #457. It is the cleanest continuation of the trust story: repository confidence tells users whether to trust the repository; architecture debt tells them what to worry about inside it.
- #384 and #103 should run as a product-management workstream, not wait until after more analytics are built. The interview guide and assumption register are already good enough to execute.
- [#402](https://github.com/roballred/GovEA/issues/402) is still a good opportunistic one-PR win, but it no longer belongs in the top five ahead of #437 or #363.

## Security Remediation Status (as of 2026-05-10)

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
| #421 — test: unauthenticated server-action POSTs blocked | Enhancement | ✅ Fixed (PR #440) |
| #422 — test: read actions ignore caller-supplied orgId/role | Enhancement | ✅ Fixed (PR #441) |
| #436 — promote break-glass to gate cross-tenant reads | Medium | Open (post-v1 per triage) |
| #437 — wire cross-tenant impersonation through break-glass | Medium | Open (recommended before relying on break-glass operationally) |
