# Product Priority Shortlist

Last groomed: 2026-06-10 (the 2026-05-29 top five aged unevenly: rank 3 (#665) shipped nearly its whole implementation arc, ranks 2 and 5 didn't move, rank 4 (#518) closed into a recurring habit — and rank 1, the persona interview, is now unmoved across **three** grooming cycles. Re-ranked around what actually changed: a security/compliance wave with a real external review attached (#761–#769), a live demo bug that retires v0.9 (#759), and the 2026-06-10 integration roadmap decision (#775).)

This note summarizes the top next product moves from the current capability inventory, open issues, and recent pull requests. It is intentionally short so it can be reviewed during backlog planning without replacing GitHub issues as the source of execution detail.

Use this alongside [`docs/risk-register.md`](./risk-register.md) when a backlog item depends on unresolved product-fit, scope, operational, or documentation risks.

> **Maintenance note.** The in-product `/overview` page renders a `Coming next` tile that mirrors the top-five table below. When you change the top five (re-rank, add, remove, or rewrite an entry) **also update `PRIORITIES` and `PRIORITIES_LAST_GROOMED` in [`apps/govea/src/app/(admin)/overview/page.tsx`](../apps/govea/src/app/(admin)/overview/page.tsx)** so the in-app view stays honest. This doc is the source of truth; the page is a static reflection until a future slice reads the doc at build time.

## Current Signal

The 2026-05-29 top five, twelve days on:

- **Rank 1 — the persona-validation interview is *still* not done.** `business-architecture/feedback-log.md` is still `_(awaiting first conversation)_` and all 16 personas remain `Assumed`. This is the third consecutive grooming with [#668](https://github.com/roballred/GovEA/issues/668) (née #384) at rank 1 and zero movement. New angle this cycle: the OCIO design-review thread ([#768](https://github.com/roballred/GovEA/issues/768)) implies a real reviewer at a real agency — that contact is a concrete interview candidate. See the PM note on escalation.
- **Rank 3 — #665 TOGAF→recipe shipped its implementation arc**: recipe-install engine core ([#716](https://github.com/roballred/GovEA/pull/716)), TOGAF recipe + catalog ([#746](https://github.com/roballred/GovEA/pull/746), closes #672), group-by-taxonomy report engine + TOGAF presets ([#747](https://github.com/roballred/GovEA/pull/747), [#750](https://github.com/roballred/GovEA/pull/750), closes #673), framework-overlay/mappings decommission ([#751](https://github.com/roballred/GovEA/pull/751), [#752](https://github.com/roballred/GovEA/pull/752), [#755](https://github.com/roballred/GovEA/pull/755), closes #674/#675), and the TOGAF 10 Starter pack ([#753](https://github.com/roballred/GovEA/pull/753)). What remains is [#671](https://github.com/roballred/GovEA/issues/671)'s leftover engine scope and a **closure review** of #665 and #313 (rank 5).
- **Rank 2 — #71/#94 adoption** and **rank 5 — #499 glossary**: open, untouched. Both drop out this cycle (see below) — displaced, not demoted in importance.
- **Rank 4 — #518 dogfood**: closed; lives on as the grooming pre-flight habit, not a ranked item.

Big ships since 2026-05-29 that were *not* on the top five: multi-org membership slices 1–4b ([#704](https://github.com/roballred/GovEA/pull/704)–[#713](https://github.com/roballred/GovEA/pull/713)), instance audit telemetry ([#727](https://github.com/roballred/GovEA/pull/727), [#730](https://github.com/roballred/GovEA/pull/730), [#733](https://github.com/roballred/GovEA/pull/733), [#760](https://github.com/roballred/GovEA/pull/760), closes #720), glossary CSV round-trip ([#722](https://github.com/roballred/GovEA/pull/722), [#724](https://github.com/roballred/GovEA/pull/724)), automated WCAG 2.1 AA gates ([#770](https://github.com/roballred/GovEA/pull/770), closes #766) plus theme drift-guard and token single-sourcing ([#773](https://github.com/roballred/GovEA/pull/773), [#774](https://github.com/roballred/GovEA/pull/774)), value-stream direct capability mappings ([#757](https://github.com/roballred/GovEA/pull/757)), and a security-hardening burst ([#737](https://github.com/roballred/GovEA/pull/737), [#742](https://github.com/roballred/GovEA/pull/742)–[#745](https://github.com/roballred/GovEA/pull/745)).

New on the board this cycle:

- **The security/compliance wave (#759, #761–#769).** The security review that produced the shipped hardening also left an open wave citing the standards that gate government adoption: OCIO 141.10 (MFA, #761), RCW 40.14 (audit retention, #767), CSP enforcement (#765), CSV formula injection (#763), DB TLS (#764), CI scanning (#762), an OCIO compliance documentation pack (#768), and theme-value validation (#769). Triaged this grooming: all labeled and milestoned into v1.0 — for a state/local-government product these are adoption gates, not polish.
- **The integration roadmap decision (2026-06-10).** Integration with external systems of record is confirmed foundational. The REST API foundation ([#775](https://github.com/roballred/GovEA/issues/775)) was pulled forward into v1.0; ServiceNow ITSM/CMDB was chosen as the Tier-1 anchor; [#382](https://github.com/roballred/GovEA/issues/382) is re-scoped to that sync slice in v2.0.
- **[#759](https://github.com/roballred/GovEA/issues/759) logout reliability** — a live, user-visible auth bug captured on the demo on 2026-06-10, and the **only open issue left in v0.9** — fixing it retires the Foundation Cleanup milestone.

The practical implication: rank 1 stays the interview (third cycle — see the escalation note), and below it this cycle is **shipping-shaped, not design-shaped**: a live bug that closes a milestone, a compliance wave with a real external review attached, the integration API design slice, and closing out the recipe arc.

## Top Five Next Things To Do

| Rank | Recommended next thing | Why now | Primary issue(s) |
|---|---|---|---|
| 1 | **Run the first Tier-1 persona-validation interview** | The validation plan ([`docs/research/validation-plan.md`](./research/validation-plan.md)) and feedback-log substrate are in place; the missing step is one real conversation. Third consecutive grooming at rank 1 with zero movement — see the escalation note below. Concrete new candidate: the OCIO design-review contact behind [#768](https://github.com/roballred/GovEA/issues/768) — pair the compliance conversation with a 30-minute practice-fit interview. Until one Tier-1 conversation lands, #547/#573/#563/#88 stay parked. Still the cheapest unblock on the board. | [#668](https://github.com/roballred/GovEA/issues/668), gates [#547](https://github.com/roballred/GovEA/issues/547), [#573](https://github.com/roballred/GovEA/issues/573), [#563](https://github.com/roballred/GovEA/issues/563), [#88](https://github.com/roballred/GovEA/issues/88) |
| 2 | **#759 — make sign-out reliable from every URL (retires v0.9)** | A live auth bug observed by a real demo user on 2026-06-10, security-labeled, spanning three journeys. It is also the last open issue in v0.9 — Foundation Cleanup; landing it retires the milestone (after honestly checking the milestone's other DoD bullets). Bugs real users hit outrank new design work. | [#759](https://github.com/roballred/GovEA/issues/759) |
| 3 | **Security/compliance wave for the OCIO review** | Triaged into v1.0 this grooming with `security`/track labels. Sequence cheap-and-high-leverage first: CSV formula injection ([#763](https://github.com/roballred/GovEA/issues/763)), DB TLS ([#764](https://github.com/roballred/GovEA/issues/764)), theme-value validation ([#769](https://github.com/roballred/GovEA/issues/769)), CI scanning ([#762](https://github.com/roballred/GovEA/issues/762)); then the bigger CSP enforcement ([#765](https://github.com/roballred/GovEA/issues/765)) and MFA ([#761](https://github.com/roballred/GovEA/issues/761)). The compliance documentation pack ([#768](https://github.com/roballred/GovEA/issues/768)) and retention design ([#767](https://github.com/roballred/GovEA/issues/767)) feed the OCIO design review directly — treat that review's date as the deadline anchor. | [#768](https://github.com/roballred/GovEA/issues/768), [#761](https://github.com/roballred/GovEA/issues/761)–[#765](https://github.com/roballred/GovEA/issues/765), [#767](https://github.com/roballred/GovEA/issues/767), [#769](https://github.com/roballred/GovEA/issues/769) |
| 4 | **#775 — REST API foundation (design slice first)** | The 2026-06-10 roadmap decision made integration foundational and pulled the API layer into v1.0. Do the design slice first (endpoint inventory, token/RBAC/audit/rate-limit/versioning rules) per the issue's acceptance criteria; ServiceNow ITSM/CMDB ([#382](https://github.com/roballred/GovEA/issues/382), v2.0) is the known first consumer that keeps the contract honest. Serves the v1 bulk-population need, so it is **not** gated on the unvalidated integration personas. | [#775](https://github.com/roballred/GovEA/issues/775), [#382](https://github.com/roballred/GovEA/issues/382) |
| 5 | **Close out the recipe arc** | Finish [#671](https://github.com/roballred/GovEA/issues/671)'s remaining engine scope, then run a **closure review** of [#665](https://github.com/roballred/GovEA/issues/665) and [#313](https://github.com/roballred/GovEA/issues/313) against their acceptance criteria — close what's done, re-scope what isn't, explicitly. A shipped epic left open is the inverse of the #384 false-green: a *false-open* that hides real progress and pollutes every future grooming. [#754](https://github.com/roballred/GovEA/issues/754) (one-click starter-content removal) is the natural adjacent slice. | [#671](https://github.com/roballred/GovEA/issues/671), [#665](https://github.com/roballred/GovEA/issues/665), [#313](https://github.com/roballred/GovEA/issues/313), [#754](https://github.com/roballred/GovEA/issues/754) |

## What dropped out of the top five

- **#71 + #94 adoption capability** — still the right differentiator doc work, but displaced by a live bug, a compliance wave with an external review attached, and the integration mandate. Re-enters next cycle, and is stronger still after the rank-1 interview.
- **#499 inherited glossary** — unblocked and unchanged, but displaced for the same reasons. Codex-labeled; suitable as background automation work in the meantime. **Use "Tools," never reintroduce "Modules."**
- **#518 dogfood** — closed this cycle; converted to the grooming pre-flight habit (see PM notes), not a ranked item.
- **#665 TOGAF recipes** — graduated, not dropped: from "design slice first" to the rank-5 close-out.

## On Hold

Items the product owner has paused; revisit when noted blocker clears:

- **SMTP transport ([#528](https://github.com/roballred/GovEA/issues/528) follow-up) and dependent change-notification email delivery ([#581](https://github.com/roballred/GovEA/issues/581), [#87](https://github.com/roballred/GovEA/issues/87))** — held until an outbound mail account is available. The subscriptions/inbox substrate ([#610](https://github.com/roballred/GovEA/pull/610)), domain-owner attribution ([#611](https://github.com/roballred/GovEA/pull/611)), and non-owner overwrite notification ([#613](https://github.com/roballred/GovEA/pull/613)) all shipped, but sends still hit the stub. Resume when the mail account lands.

## Won't-Do (recorded for future grooming)

- [#512](https://github.com/roballred/GovEA/issues/512) — **"Tools" stays as the user-facing term.** Do not propose Tools→Modules renames in future grooming. If "Modules" appears in capability docs, patch the drift toward "Tools," not the other way. Decision recorded 2026-05-22.

## Product Manager Notes

- **Rank-1 escalation: three groomings, zero movement.** Keeping the interview at rank 1 while never doing it is becoming a decision by default. If no Tier-1 conversation lands by the next grooming, make the choice explicit: either (a) deliberately accept building the gated differentiators (#547/#573/#563/#88) on assumed personas and record that in risk register R-004, or (b) keep the gate and stop pretending the gated items are "coming next." Don't carry it at rank 1 as decoration a fourth time. The OCIO review contact (#768) is the lowest-friction candidate yet — one human, already engaged, already inside a state agency.
- **Don't close validation issues on infrastructure alone** (standing lesson from #384): a research issue whose acceptance criteria require *evidence* is not done until the evidence exists.
- **Closure reviews are part of shipping.** #665/#313 (rank 5) is the test case: when an epic's slices ship under their own issue numbers, someone must walk the epic's acceptance criteria and close or re-scope it. Add to grooming pre-flight alongside the dogfood habit.
- **Milestone hygiene has drifted.** "Every open issue carries exactly one `track:*` label and one milestone" is currently false: the #761–#769 wave was fixed this pass, but roughly a dozen others (#665, #668, #671, #680, #693–#697, #728, #731, #754) still lack milestones, and several lack track labels. Sweep them next pass or as a one-off hygiene action.
- **#759 retires v0.9 — verify before declaring.** Closing the last issue closes the milestone only if its DoD bullets (ARB findings, docs-match-reality, reproducible bootstrap, visual regression) are honestly checkable. Walk them when #759 lands.
- **#518 is a habit, not a feature.** Grooming pre-flight question: "did anything in this cycle change the canonical product story? If yes, update the GovEA Project seed." The recipe arc and the integration decision both qualify this cycle.
- **The viewer-experience epic [#556](https://github.com/roballred/GovEA/issues/556)** still tracks #547, which is still gated on #668. Unchanged.

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

**2026-06 security review wave.** Shipped from the review: Next.js middleware advisory upgrade ([#737](https://github.com/roballred/GovEA/pull/737)), impact-action auth/tenant scoping ([#742](https://github.com/roballred/GovEA/pull/742), closes #738), response headers + report-only CSP ([#743](https://github.com/roballred/GovEA/pull/743), closes #739), mermaid XSS upgrade ([#744](https://github.com/roballred/GovEA/pull/744), closes #740), vitest advisory ([#745](https://github.com/roballred/GovEA/pull/745), closes #741). Still open — triaged into v1.0 at the 2026-06-10 grooming, severity labels pending per-issue triage: [#759](https://github.com/roballred/GovEA/issues/759) (logout reliability, rank 2), [#761](https://github.com/roballred/GovEA/issues/761) (MFA, OCIO 141.10), [#762](https://github.com/roballred/GovEA/issues/762) (CI scanning), [#763](https://github.com/roballred/GovEA/issues/763) (CSV formula injection), [#764](https://github.com/roballred/GovEA/issues/764) (DB TLS), [#765](https://github.com/roballred/GovEA/issues/765) (CSP enforcing), [#767](https://github.com/roballred/GovEA/issues/767) (audit retention, RCW 40.14), [#768](https://github.com/roballred/GovEA/issues/768) (OCIO compliance pack), [#769](https://github.com/roballred/GovEA/issues/769) (theme-value validation).
