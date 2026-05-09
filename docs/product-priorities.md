# Product Priority Shortlist

Last groomed: 2026-05-08 (PM cadence refresh — afternoon)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

A security scan on 2026-05-07 surfaced nine high-severity findings. Six are now fixed (PRs #424–#426, #428, #429); three remain open (#416, #417, #418). The fixed cluster covered the entire server-action multi-tenant authority surface — auth gating, session-sourced `organizationId`/`role`, RPC exposure of internal helpers, and target-entity org checks on junction writes. The three open findings are a different category: they are about the integrity of what the platform records *after* a mutation succeeds (#416 transactional audit, #417 append-only audit table) and how break-glass access is governed (#418).

Significant merges since the last grooming pass (earlier today, PR #430):

- PR #428 closed #427 — entity-taxonomy helpers moved out of `'use server'`, removing an RPC-reachable surface.
- PR #429 closed #415 — junction-table inserts now verify the target entity belongs to the caller's org.

Earlier in this hardening wave (still relevant for context):

- PRs #424–#426 fixed unauthenticated `getUsers`, cross-org-link helpers reachable as RPC, and read actions trusting caller-supplied `organizationId`/`role`.
- PRs #397–#401 shipped richer tenant-governance controls and instance-level platform defaults (theme, module defaults, org provisioning stamps), fully closing the instance-config surface defined in #308.
- PR #410 and PR #423 landed the business-architecture STYLE.md standard and retrofitted all personas to match it.

What this means for prioritization:

- The "live" attack surface on tenant data through server actions is now closed. The remaining security work is about *post-mutation* trust (audit log) and *exceptional* access (break-glass) — important but no longer blocking normal feature work in the same way.
- Regression tests (#421, #422) become the priority cost-of-not-doing item: without them, a future widening of the middleware matcher or a reintroduced `organizationId` parameter will silently regress what was just fixed.
- The feature roadmap below the security work is unchanged: repository trust, debt tracking, integration freshness, and persona validation are still the right next moves.
- The instance admin surface is now solid enough to plan the deferred platform defaults (#402) as the next platform-management task.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Close the three remaining high-severity audit / break-glass findings | All server-action multi-tenant findings are fixed (PRs #428, #429 merged today, joining #424–#426). What remains is post-mutation integrity and exception access: #416 (non-transactional audit writes), #417 (mutable `audit_log`), and #418 (break-glass TTL 24h, no dual control). #416 and #417 can ship as a paired migration. For #418, ship the TTL cap (1h default) immediately as a one-line config change; plan dual control as a separate design issue linked to #391. | #416, #417, #418 |
| 2 | Add security regression tests for the hardened server actions | Issues #421 and #422 lock in the invariants fixed this week — six high-severity issues' worth. Without them, a developer who widens the middleware matcher or reintroduces a caller-supplied `organizationId`/`role` param will be uncaught in CI. With the live surface now closed (item 1 is no longer blocking), regression coverage is the highest-leverage way to keep it closed. Straightforward integration tests against existing auth machinery. | #421, #422 |
| 3 | Ship repository completeness drill-downs and a plain-language confidence summary | Reporting, heatmaps, impact views, and executive summaries now depend on users trusting the underlying repository. GovEA has early coverage signals but not yet the fuller completeness workflow or stakeholder-facing confidence cues. | `rm-repository-completeness`, `fd-repository-confidence-summary`, #380 |
| 4 | Add architecture debt tracking and make ADRs a stronger decision-support surface | Impact analysis surfaces consequences, but GovEA still lacks a first-class way to record persistent constraints and tradeoff accumulation. That is the gap between "what is affected" and "what should leadership worry about next." | `rm-architecture-debt`, `po-architecture-decisions`, #381 |
| 5 | Validate assumed personas and start a lightweight product feedback loop | Repository modelling and integration are still driven by assumed personas. With multi-tenant hardening done and executive-facing surfaces shipped, the cost of building the wrong next analytic feature has gone up. | Persona docs, `docs/research/`, #103, #384 |

## Product Manager Notes

- The two open-PR rows from this morning's note are now merged. The remaining three high-severity findings (#416, #417, #418) are still real, but they are no longer blocking feature PRs from merging — the live tenant-data surface is closed. Regression tests (#421, #422) deserve to move up in tempo.
- For #418 (break-glass): ship the TTL cap (1h default) immediately as a one-line config change; plan dual-control approval as a follow-on design issue linked to #391 (platform endpoint config). Do not block the TTL fix waiting for the full design.
- #402 (configurable platform defaults — deferred from #390) is the next concrete platform-admin task after security. Schema impact is small and well-defined in the issue.
- The feature roadmap (items 3–5) is unchanged from the 2026-05-06 grooming: repository trust → debt/decision capture → persona validation. Security did not make these wrong; it just moved ahead of them.
- Issue #363 (Data Architecture Metamodel) is now in active triage — the maintainer has replied with concrete design questions about how to model the conceptual / logical / physical layers, and the contributor has added a follow-up about capturing data domain (Master / Multi-Use Data Management). It still has no labels and no v1-vs-future scope decision; that decision is the next move on the issue, not another general reply.
- The ARB/research issues (90s, 130s, 300s) remain important but are capability-definition work. None are blocking the items above.

## Security Remediation Status (as of 2026-05-08)

| Issue | Severity | Status |
|---|---|---|
| #411 — `getUsers` cross-tenant + secret exposure | High | ✅ Fixed (PR #424) |
| #412 — cross-org-link helpers reachable as RPC | High | ✅ Fixed (PR #425) |
| #413 — read actions trust caller `organizationId` | High | ✅ Fixed (PR #426) |
| #414 — read actions trust caller `role` | High | ✅ Fixed (PR #426) |
| #427 — entity-taxonomy helpers reachable as RPC | High | ✅ Fixed (PR #428) |
| #415 — junction writes skip target-entity org check | High | ✅ Fixed (PR #429) |
| #416 — audit writes not transactional with mutation | High | Open |
| #417 — `audit_log` has no DB-level append-only constraint | High | Open |
| #418 — break-glass TTL 24h; no dual control | High | Open |
| #421 — test: unauthenticated server-action POSTs blocked | Enhancement | Open |
| #422 — test: read actions ignore caller-supplied orgId/role | Enhancement | Open |
