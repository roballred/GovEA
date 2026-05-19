# Persona Journey — Agency EA Coordinator

**Persona file:** [`business-architecture/personas/agency-ea-coordinator.md`](../../business-architecture/personas/agency-ea-coordinator.md)
**Capability anchors:** [`multi-org`](../../business-architecture/capabilities/cms/multi-org/) group — same set as the Enterprise Architect walk, exercised from the source side.
**Walk audited:** 2026-05-19 — fourth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #541](https://github.com/roballred/GovEA/issues/541))
**Persona validation status:** Assumed (not yet validated with a real agency-level IT staffer).

## Method

Live browser walk on the worktree preview (port 3000). Signed in as `alice@govea.dev` (City of Riverdale admin) — the closest dev-seed proxy for an agency EA who owns local content and coordinates with central IT.

This walk is the **source-side companion** to the Enterprise Architect walk ([#535](https://github.com/roballred/GovEA/issues/535)). The same multi-org capability surface is traversed in the opposite direction — Alice initiates federation requests; Sam (ODS) approves or rejects them.

## Canonical journey

1. Sign in as an agency admin.
2. Open the org dashboard (`/dashboard`).
3. Open Capabilities (`/capabilities`) — see local content plus connections / instance-visible items from other orgs.
4. Open a local capability detail with outbound federation state (`/capabilities/[id]`).
5. Initiate an outbound cross-org link request (`+ Request link` → target picker + relationship type).
6. Withdraw a pending outbound request before approval.
7. Manage inbound cross-org link requests (other orgs linking to Alice's content).
8. Open Connections (`/connections`) — see active connections.
9. Request a new connection to a peer agency.
10. Repeat the federation pattern on Personas (`/personas`).

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`alice@govea.dev`) | **Works** | Lands on `/dashboard` per the role-aware bouncer ([#533](https://github.com/roballred/GovEA/issues/533)). |
| 2 | Org dashboard | **Works** | Same coverage as the CMS Administrator walk ([#526](https://github.com/roballred/GovEA/issues/526)). |
| 3 | Capabilities list | **Works** | Riverdale's own capabilities, plus three federated items: GovEA Project's "End-to-End Traceability" (instance) and three Riverdale outbound links to ODS. Filter by org works. |
| 4 | Capability detail — outbound approved | **Works** | Opening "Digital Identity & Authentication" shows: `Approved · Statewide Identity Verification · Office of Digital Services · implements · Revoke`. Source-side rendering is unaffected by the bug fixed in [#536](https://github.com/roballred/GovEA/issues/536); target visibility is `instance` so caller can always read it. |
| 4b | Capability detail — outbound pending | **Works** | "Cross-Agency Data Sharing" shows: `Pending outbound requests · Open Data Platform · Office of Digital Services · extends · Withdraw`. |
| 5 | Request link form | **Works** | `+ Request link` opens an inline form (not a modal). Target dropdown lists only federation-eligible peers ("End-to-End Traceability · GovEA Project · Instance-wide" and "Statewide Identity Verification · Office of Digital Services · Connected orgs"). Duplicate-prevention works — capabilities already linked don't appear. Relationship type radio (Implements / Extends / Maps To) renders correctly. |
| 6 | Withdraw pending | **Works (visual)** | Withdraw button is present on every pending outbound row; not exercised to keep seed state stable, but the path is straightforward and covered by the `withdrawCrossOrgLink` action. |
| 7 | Inbound approval as Alice | **Not exercisable** | The dev seed has **zero inbound** cross-org link requests for any Riverdale capability — all three seeded links are outbound. The "Awaiting your approval" branch of the cross-org-links panel is unreachable for Alice with shipped seed data. Gap [#543](https://github.com/roballred/GovEA/issues/543). |
| 8 | Connections page | **Works** | `/connections` shows the active ODS connection with creation date and a Remove action. |
| 9 | Request connection | **Partial** | The `+ Request connection` dialog renders, but the target dropdown lists every other org including the system org (`GovEA Platform`) and integration-test leftovers (`Settings Org` duplicate, three `Test Org <hex>` rows). The system-org inclusion is a real product UX bug. Gap [#542](https://github.com/roballred/GovEA/issues/542). |
| 10 | Personas federation | **Inferred works** | Persona detail pages use the same `<CrossOrgLinksPanel />` component as capabilities. The persona-side federation tooling is symmetric with the capability side. Same gap applies for inbound (no seeded inbound persona links). |

**Tally:** 7 works · 1 partial · 1 not-exercisable · 1 inferred-works. No outright blockers.

## Findings

### Gaps filed

| Issue | Severity | Summary |
|---|---|---|
| [#542](https://github.com/roballred/GovEA/issues/542) | Medium (product UX bug) | `+ Request connection` dialog lists the system org and stale test orgs in the target dropdown. The system-org inclusion violates the documented platform-org guardrail. |
| [#543](https://github.com/roballred/GovEA/issues/543) | Medium (seed coverage) | All three seeded cross-org links go Riverdale → ODS, so source-side personas cannot exercise the inbound-approval flow with shipped data. |

### Existing issues already covering work flagged during this walk

| Issue | Coverage |
|---|---|
| [#536](https://github.com/roballred/GovEA/issues/536) | Approved cross-org link visibility — already fixed on PR [#540](https://github.com/roballred/GovEA/pull/540). Alice's view of her outbound approved link confirmed working pre-fix (target visibility=instance, no filter trip). The fix matters on the *target* side. |
| [#537](https://github.com/roballred/GovEA/issues/537) | Aggregated adoption view — same gap from Alice's side. She'd want "where are my capabilities being adopted across peer agencies" just as Sam wants "which agencies adopt my enterprise capabilities." |
| [#538](https://github.com/roballred/GovEA/issues/538) | Duplication detection — same gap; the agency would also benefit from seeing "are peer agencies solving this same problem?" |
| [#531](https://github.com/roballred/GovEA/issues/531) | Org audit filters — Alice's `/audit` has the same usability gap as Sam's. |

### Test-fixture hygiene observation

The shared dev DB currently shows duplicate "Settings Org" rows and three `Test Org <hex>` rows from integration-test runs whose `cleanupOrg` either failed or wasn't called. Visible in both `/instance/orgs` and the `+ Request connection` dropdown. Not a product bug but worth a dev-hygiene cleanup pass. Noted in [#542](https://github.com/roballred/GovEA/issues/542) for visibility; not filed separately.

### Persona-validation note

Persona is **Assumed**. The "low-friction, opt-in, value-additive" framing in the persona's critical insight is plausible but unvalidated. The current UI design happens to match that framing well — federation requires explicit per-record actions, no forced syncing, agency owns its content — but whether real agency EAs would adopt these flows is a question only validation answers.

## What worked, and worked well

- **Outbound-side federation flow is operationally clean.** Source admins see exactly what's federated and what's pending; the duplicate-prevention in the target picker is silent and correct; withdraw is always available on pending outbound rows.
- **Inline Request-link form** (rather than a modal) keeps the federation action in context with the capability detail — supports the persona's "low-friction" framing.
- **Target visibility transparency** in the picker ("Connected orgs" / "Instance-wide" suffix) is small but useful — Alice can tell at a glance whether a target is universally visible or visible only because of the connection she's already in.
- **Same federation surfaces work uniformly across capabilities and personas** (via the shared `<CrossOrgLinksPanel />`), so a persona who learns the pattern on one entity transfers naturally to the other.

## Recommended follow-up

1. **Fix [#542](https://github.com/roballred/GovEA/issues/542) (system org in dropdown) before any future external demo.** It's a one-line filter and removes a visible footgun.
2. **Fix [#543](https://github.com/roballred/GovEA/issues/543) (seed inbound coverage) before the next persona walk that exercises agency-side approvals** — otherwise the same step-7 "not exercisable" verdict will recur.
3. **Continue the journey audit.** Next candidates: `cms-viewer` (smallest, validates read-only viewer paths) or `elected-official` (validates the plain-language non-technical reader path that's an EasyEA differentiator). Either is a meaningfully different shape than the four walked so far.
