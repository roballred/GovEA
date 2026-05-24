# Product Priority Shortlist

Last groomed: 2026-05-24 (rewritten end-to-end; the previous version had drifted — four of its five recommendations were either shipped, on hold, or decided won't-do).

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

## Current Signal

The post-audit gap pipeline is roughly half-drained. The most recent merges closed out the doc-hygiene class of bugs (a recurring source of audit findings) and continued the per-entity CSV beachhead:

- [#624](https://github.com/roballred/GovEA/pull/624) shipped STYLE.md compliance fixes across 58 capability/persona files **and** the CI `docs-lint` job that prevents future drift. Capability doc drift was the source of #530, #570, #573-rm-architecture-debt, and #575 — that class of bug is now structurally prevented.
- [#625](https://github.com/roballred/GovEA/pull/625) shipped CSV import/export for Personas and ADRs (continuing the pattern from [#604](https://github.com/roballred/GovEA/pull/604)). Shared CSV utilities now live in `@/lib/csv`, so each remaining entity is a small per-entity PR.
- [#623](https://github.com/roballred/GovEA/pull/623) reconciled the IAM/SSO capability doc with the env-var-only implementation reality ([#530](https://github.com/roballred/GovEA/issues/530)).
- [#626](https://github.com/roballred/GovEA/pull/626) (open) gates cross-tenant user PII on active break-glass — re-scoped Option 1 promotion of [#436](https://github.com/roballred/GovEA/issues/436) after architectural audit confirmed the original "content-read" scope was moot (no read path exists; act-as already gates mutations).
- [#392](https://github.com/roballred/GovEA/issues/392) closed as substantially shipped; instance-hardening tests cover the four acceptance criteria.

Persona-walk gap pipeline as of today: **13 open issues across 8 personas** (down from ~26 in mid-May).

## Top Five Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | **Slice the viewer-experience cluster** — start with role-tailored landing | Largest open cluster (6+ issues) and the most consistently surfaced gap in the persona walks. [#548](https://github.com/roballred/GovEA/issues/548) is the cheapest first slice: a Viewer signed into the system lands on a stakeholder-friendly entry page, not the admin dashboard. Same persona payoff as the broader [#547](https://github.com/roballred/GovEA/issues/547) (public-read) at a fraction of the cost, and it surfaces *what content viewers actually want* — useful input into the eventual #547 design. | [#548](https://github.com/roballred/GovEA/issues/548), [#547](https://github.com/roballred/GovEA/issues/547), [#556](https://github.com/roballred/GovEA/issues/556), [#538](https://github.com/roballred/GovEA/issues/538), [#537](https://github.com/roballred/GovEA/issues/537) |
| 2 | **ARB cleanup trio** — three small, well-defined items | Each is well-scoped and has been open since early April. Together they close roughly half the remaining `arb-finding` label. None requires design conversation. [#75](https://github.com/roballred/GovEA/issues/75): refactor portfolio capability docs to put roles in `Rules`/`Links` rather than `Personas` (lint now enforces the structural part). [#133](https://github.com/roballred/GovEA/issues/133): rename debt taxonomy labels (`decision-drift`, `known-shortcut`, `capability-gap`) to plain-language equivalents in the debt UI. [#7](https://github.com/roballred/GovEA/issues/7): add a Failover section to `iam-sso-authentication.md` plus the integration-boundary statement. | [#75](https://github.com/roballred/GovEA/issues/75), [#133](https://github.com/roballred/GovEA/issues/133), [#7](https://github.com/roballred/GovEA/issues/7) |
| 3 | **Next CSV per-entity slice (Initiatives + Objectives)** | The pattern is now mechanical thanks to the shared `@/lib/csv` helpers. Initiatives + Objectives pair naturally in the Consultant / SI persona's handover bundle and follow the persona-validated order in the (now-closed) [#596](https://github.com/roballred/GovEA/issues/596). File a fresh issue first since #596 is closed. | (file a new issue) |
| 4 | **Add data-architecture quality cues and naming-standard hints** | Data Architecture is now a shipped module, and the remaining gaps are reviewer/operator quality loops: Data Vault physical-name hints, per-row quality cues. [#570](https://github.com/roballred/GovEA/issues/570) is the cheaper, more persona-validated slice — pick it before [#573](https://github.com/roballred/GovEA/issues/573)'s scorecard, which warrants the @nicholerip conversation in [#363](https://github.com/roballred/GovEA/issues/363) first. | [#570](https://github.com/roballred/GovEA/issues/570), [#573](https://github.com/roballred/GovEA/issues/573) |
| 5 | **Doc/capability backfill — #510 + #511** | Small documentation slices that close out the explicit triage-split parent [#10](https://github.com/roballred/GovEA/issues/10). [#510](https://github.com/roballred/GovEA/issues/510) adds Scope fields to capability files; [#511](https://github.com/roballred/GovEA/issues/511) creates the `cms/deployment-operations` capability group + README "what does it take to run this?" section. Both are now enforceable by the new docs-lint. | [#510](https://github.com/roballred/GovEA/issues/510), [#511](https://github.com/roballred/GovEA/issues/511) |

## On Hold

Items previously ranked that the product owner has paused:

- **SMTP transport ([#528](https://github.com/roballred/GovEA/issues/528) follow-up + [#581](https://github.com/roballred/GovEA/issues/581) + [#87](https://github.com/roballred/GovEA/issues/87))** — held until an outbound mail account is available. The subscriptions / inbox substrate ([#610](https://github.com/roballred/GovEA/pull/610)) and domain-owner attribution ([#611](https://github.com/roballred/GovEA/pull/611)) shipped, but sends still hit the stub. Resume when the account lands.
- **Release pipeline ([#504](https://github.com/roballred/GovEA/issues/504))** — held this session. Reason to revisit: every persona-facing feature now depends on the Azure demo being a known build, and manual deploys remain the largest operational risk. Promote back into the top five when ready to take it on.

## Won't-Do (recorded for future grooming)

- [#512](https://github.com/roballred/GovEA/issues/512) — **"Tools" stays as the user-facing term.** Do not propose Tools→Modules renames in future grooming. If "Modules" appears in capability docs, patch the drift toward "Tools," not the other way. Decision recorded 2026-05-22.

## Product Manager Notes

- [#436](https://github.com/roballred/GovEA/issues/436) was re-scoped from its original "Option 1" framing once the architectural audit confirmed there is no cross-tenant content-read path to gate (act-as gates mutations; reads always use `session.user.organizationId`). The remaining gate is user PII, and that work is now in PR #626.
- [#596](https://github.com/roballred/GovEA/issues/596) (parent CSV issue) was closed before the Personas + ADRs slice landed. Future per-entity CSV PRs should reference the persona-source rationale but file their own issue rather than reopening #596.
- [#363](https://github.com/roballred/GovEA/issues/363) is the right umbrella issue to ping @nicholerip on before deciding whether the next data-arch slice is conceptual/logical-layer support, Chen visualization, or the scorecard ([#573](https://github.com/roballred/GovEA/issues/573)). The answer materially changes priority 4.
- The **persona-walk audit** ([epic #515](https://github.com/roballred/GovEA/issues/515)) closed all 16 sub-issues. Remaining gap issues filed by the audit carry `journey:<persona>` labels — use those for any future "what's next for this persona" filtering.
- **Doc drift** is no longer a recurring class of bug: the CI `docs-lint` enforces STYLE.md compliance, and the persona-journey reports document expected reality. Pick docs-only slices opportunistically (they're cheap), not strategically.
- The **viewer cluster** (rank 1) is blocked on a design decision about what to expose publicly. Doing [#548](https://github.com/roballred/GovEA/issues/548) first generates the right design input for [#547](https://github.com/roballred/GovEA/issues/547) without forcing the decision up front.

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
| #436 - cross-tenant **user-PII** read gate (re-scoped from original) | Medium | In review (PR #626) |
