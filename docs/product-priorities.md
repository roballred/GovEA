# Product Priority Shortlist

Last groomed: 2026-05-08

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

## Current Signal

A security scan on 2026-05-07 surfaced nine high-severity findings. Four have already been fixed (PRs #424–#426); two have open PRs (#428, #429); three remain fully open (#416, #417, #418). This wave temporarily supersedes the feature roadmap — the hardening must close before feature work compounds on top of a vulnerable surface.

Other significant merges since the last grooming pass (2026-05-06):

- PRs #397–#401 shipped richer tenant-governance controls and instance-level platform defaults (theme, module defaults, org provisioning stamps), fully closing the instance-config surface defined in #308.
- PRs #424–#426 fixed four critical findings: unauthenticated `getUsers`, cross-org-link helpers reachable as RPC, and read actions trusting caller-supplied `organizationId`/`role`.
- PRs #428–#429 are open and awaiting review (entity-taxonomy RPC exposure, junction cross-tenant writes).
- PR #410 and PR #423 landed the business-architecture STYLE.md standard and retrofitted all personas to match it.

What this means for prioritization:

- Security hardening is the immediate unblocking concern. GovEA now supports multi-tenant data for real orgs. Three high-severity findings still leave meaningful attack surface open.
- The feature roadmap below the security work is unchanged: repository trust, debt tracking, integration freshness, and persona validation are still the right next moves once the surface is clean.
- The instance admin surface is now solid enough to plan the deferred platform defaults (#402) as the next platform-management task.

## Top 5 Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | Merge open security PRs and close the remaining high-severity findings | PRs #428 and #429 are ready to review. Issues #416 (non-transactional audit writes), #417 (mutable `audit_log`), and #418 (break-glass TTL, no dual control) remain fully open. #416 and #417 can ship as a paired migration. #418 has the most design complexity — ship the TTL reduction (1h default) as a quick patch first, then plan dual control separately. | #415 → PR #429, #427 → PR #428, #416, #417, #418 |
| 2 | Add security regression tests for the hardened server actions | Issues #421 and #422 lock in the invariants fixed this week. Without them, a developer who widens the middleware matcher or reintroduces a caller-supplied `organizationId` param will be uncaught in CI. Straightforward integration tests against existing auth machinery. | #421, #422 |
| 3 | Ship repository completeness drill-downs and a plain-language confidence summary | Reporting, heatmaps, impact views, and executive summaries now depend on users trusting the underlying repository. GovEA has early coverage signals but not yet the fuller completeness workflow or stakeholder-facing confidence cues. | `rm-repository-completeness`, `fd-repository-confidence-summary`, #380 |
| 4 | Add architecture debt tracking and make ADRs a stronger decision-support surface | Impact analysis surfaces consequences, but GovEA still lacks a first-class way to record persistent constraints and tradeoff accumulation. That is the gap between "what is affected" and "what should leadership worry about next." | `rm-architecture-debt`, `po-architecture-decisions`, #381 |
| 5 | Validate assumed personas and start a lightweight product feedback loop | Repository modelling and integration are still driven by assumed personas. With multi-tenant hardening done and executive-facing surfaces shipped, the cost of building the wrong next analytic feature has gone up. | Persona docs, `docs/research/`, #103, #384 |

## Product Manager Notes

- Security items 1 and 2 are not optional. Do not let feature PRs merge on top of open high-severity findings.
- For #418 (break-glass): ship the TTL cap (1h default) immediately as a one-line config change; plan dual-control approval as a follow-on design issue linked to #391 (platform endpoint config). Do not block the TTL fix waiting for the full design.
- #402 (configurable platform defaults — deferred from #390) is the next concrete platform-admin task after security. Schema impact is small and well-defined in the issue.
- The feature roadmap (items 3–5) is unchanged from the 2026-05-06 grooming: repository trust → debt/decision capture → persona validation. Security did not make these wrong; it just moved ahead of them.
- Issue #363 (Data Architecture Metamodel) is a community contribution request still without labels or a triage response. It deserves a reply clarifying whether it fits v1 scope before it builds expectations.
- The ARB/research issues (90s, 130s, 300s) remain important but are capability-definition work. None are blocking the items above.

## Security Remediation Status (as of 2026-05-08)

| Issue | Severity | Status |
|---|---|---|
| #411 — `getUsers` cross-tenant + secret exposure | High | ✅ Fixed (PR #424) |
| #412 — cross-org-link helpers reachable as RPC | High | ✅ Fixed (PR #425) |
| #413 — read actions trust caller `organizationId` | High | ✅ Fixed (PR #426) |
| #414 — read actions trust caller `role` | High | ✅ Fixed (PR #426) |
| #427 — entity-taxonomy helpers reachable as RPC | High | PR #428 open |
| #415 — junction writes skip target-entity org check | High | PR #429 open |
| #416 — audit writes not transactional with mutation | High | Open |
| #417 — `audit_log` has no DB-level append-only constraint | High | Open |
| #418 — break-glass TTL 24h; no dual control | High | Open |
| #421 — test: unauthenticated server-action POSTs blocked | Enhancement | Open |
| #422 — test: read actions ignore caller-supplied orgId/role | Enhancement | Open |
