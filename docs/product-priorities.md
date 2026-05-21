# Product Priority Shortlist

Last groomed: 2026-05-21 (no open PRs; reviewed recent merged PRs through #608)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

## Current Signal

The latest persona-journey and follow-up work shifted the backlog from broad foundation building toward specific adoption blockers:

- [#603](https://github.com/roballred/GovEA/pull/603) made the audit log readable by Contributors, scoped to architecture content.
- [#604](https://github.com/roballred/GovEA/pull/604) shipped the first CSV import/export beachhead for Capabilities under [#596](https://github.com/roballred/GovEA/issues/596).
- [#605](https://github.com/roballred/GovEA/pull/605) shipped EasyEA starter content and empty-state CTAs for new practices under [#587](https://github.com/roballred/GovEA/issues/587).
- [#606](https://github.com/roballred/GovEA/pull/606) shipped the Email Configuration UI, encrypted SMTP settings, delivery log, and dashboard warning under [#528](https://github.com/roballred/GovEA/issues/528). Actual SMTP sending remains the follow-up.
- [#607](https://github.com/roballred/GovEA/pull/607) closed a batch of small persona-audit quality issues: connection target filtering, traceability hub behavior, guided-answer prompt chips, detail-page freshness lines, and taxonomy deduplication.
- [#608](https://github.com/roballred/GovEA/pull/608) shipped the self-service application dependency-impact view under [#578](https://github.com/roballred/GovEA/issues/578).
- There are no open pull requests at this grooming point.

The practical implication: several previously ranked items are now done or partially done. The next best work should build on those shipped surfaces instead of opening another broad exploratory stream.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Finish email transport, then start the change-notification substrate | #606 made email configurable, but sends still return the stub failure. Real SMTP is the prerequisite for password reset, object/domain subscriptions, and the change-notification needs now repeated by Programme Director, Domain Architect, Consultant, and Agency EA Coordinator personas. | [#528](https://github.com/roballred/GovEA/issues/528), [#581](https://github.com/roballred/GovEA/issues/581), [#87](https://github.com/roballred/GovEA/issues/87) |
| 2 | Continue CSV import/export across the next high-value entity types | #604 proved the pattern for Capabilities. The Consultant / SI and Early-Maturity Practice Lead personas still need reusable starter libraries and handoff exports beyond Applications and Capabilities. Prioritize Personas and ADRs next, then Initiatives, Objectives, Services, Value Streams, Principles, Glossary, and Data Architecture. | [#596](https://github.com/roballred/GovEA/issues/596), [#86](https://github.com/roballred/GovEA/issues/86) |
| 3 | Add data-architecture quality cues and naming-standard hints | Data Architecture is now a shipped module, and the remaining gaps are reviewer/operator quality loops: Data Vault physical-name hints, per-row quality cues, and a roll-up scorecard summary. These are cheaper and safer than expanding conceptual/logical modeling. | [#570](https://github.com/roballred/GovEA/issues/570), [#573](https://github.com/roballred/GovEA/issues/573) |
| 4 | Add authoring guardrails for duplicate names, unsaved changes, and publish-readiness guidance | Persona walks keep finding the same authoring failure mode across entities: easy duplicate creation, silent discard, and weak required-field guidance. A shared guardrail pattern would improve quality across the repository without inventing a new product area. | [#566](https://github.com/roballred/GovEA/issues/566), [#567](https://github.com/roballred/GovEA/issues/567) |
| 5 | Build a traceable release pipeline for the Azure demo | The demo is now product-critical: starter content, impact analysis, email configuration, and persona-facing reports all depend on reviewers seeing the expected build. Manual deploys still make it too hard to prove which commit, image digest, and runtime configuration are live. | [#504](https://github.com/roballred/GovEA/issues/504) |

## Product Manager Notes

- Treat #528 as unfinished until a real SMTP transport lands. The configuration UI unblocks downstream work, but notification features cannot ship on a stub sender.
- #581 is too broad to build in one pass. Split it into an event/subscription foundation, domain-owner attribution, non-owner edit warning, and email digest delivery.
- #596 should keep moving in small per-entity PRs. Preserve the export -> unchanged import -> zero-diff property from #604.
- #573 Layer 1 and Layer 2 are the right near-term data-architecture scope. A full Hoberman-style scorecard should wait for persona validation.
- #512 should be handled before expanding #499 glossary-backed menu definitions. "Modules" is now the settled term; cleanup and a CI guard are process hygiene, but they sit just outside the top five.
- #510 and #511 remain worthwhile documentation/capability-definition work for operating GovEA, especially for non-technical decision-makers. They are good candidates when the team wants a docs-only or capability-only slice.

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
