# Persona Journey — Enterprise Architect (Central IT)

**Persona file:** [`business-architecture/personas/enterprise-architect.md`](../../business-architecture/personas/enterprise-architect.md)
**Capability anchors:** [`multi-org`](../../business-architecture/capabilities/cms/multi-org/) group — [`mo-org-connections`](../../business-architecture/capabilities/cms/multi-org/mo-org-connections.md), [`mo-content-visibility`](../../business-architecture/capabilities/cms/multi-org/mo-content-visibility.md), [`mo-cross-org-linking`](../../business-architecture/capabilities/cms/multi-org/mo-cross-org-linking.md), [`mo-connection-approval`](../../business-architecture/capabilities/cms/multi-org/mo-connection-approval.md)
**Walk audited:** 2026-05-18 — third persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #535](https://github.com/roballred/GovEA/issues/535))
**Persona validation status:** Assumed (not yet validated with a real central-IT enterprise architect).

## Method

**First walk done in a real browser** (preview on port 3001 with reseeded dev DB). The prior two walks ([#519](https://github.com/roballred/GovEA/issues/519), [#526](https://github.com/roballred/GovEA/issues/526)) were code-only. Doing this one live caught a bug that a code-only audit would have missed — see Finding 1.

Signed in as `sam@state.govea.dev` (Office of Digital Services admin) as the closest dev-seed proxy for a state-level central-IT EA. There is no dedicated "central IT" persona-user mapping in the dev seed — every admin can walk this journey; the persona is about *what they do*, not which role they hold.

## Canonical journey

Grounded in the persona's relevant capabilities (publishing enterprise capabilities, agency adoption visibility, cross-org linking and approval, connections management):

1. Sign in as a central-IT admin.
2. Open the org dashboard (`/dashboard`).
3. Open Capabilities (`/capabilities`) — see own + cross-org-visible capabilities; filter by org.
4. Open a capability detail (`/capabilities/[id]`) with inbound cross-org links — review pending requests.
5. Approve a pending inbound cross-org link.
6. Verify the approved link surfaces correctly on the target capability page.
7. Open Connections (`/connections`) — review and manage org connections.
8. Look for an aggregated enterprise adoption view (which agencies link to which capabilities).
9. Look for capability duplication detection across connected orgs.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`sam@state.govea.dev`) | **Works** | Lands on `/dashboard`. The [#533](https://github.com/roballred/GovEA/issues/533) role-aware bouncer correctly routes non-instance-admins here. |
| 2 | Org dashboard | **Works** | Same admin-dashboard as covered in the CMS Administrator walk ([#526](https://github.com/roballred/GovEA/issues/526)). |
| 3 | Capabilities list with org filter | **Works** | `/capabilities` displays the org's own capabilities plus cross-org-visible items from connected orgs and instance-wide. "All organizations" filter is exposed. Cross-org items render with their owning-org name appended (e.g. "Cross-Agency Data Sharing · City of Riverdale"). |
| 4 | Capability detail — inbound pending | **Works** | The Cross-Org Links panel renders the inbound pending request with the source capability name, source org, link type, and Approve / Reject buttons. |
| 5 | Approve | **Works (server side)** | `approveCrossOrgLink` flips status to `active`, writes an audit log entry, and revalidates paths. |
| 6 | Verify approved link surfaces | **Blocked (BUG)** | After approval, the Cross-Org Links panel renders "No cross-org links yet." The DB record is still active; the rendering path filters it out because the source capability has `visibility: 'org'`. Gap [#536](https://github.com/roballred/GovEA/issues/536). |
| 7 | Connections page | **Works** | `/connections` shows active connections (1 in seed: City of Riverdale) and an explicit "+ Request connection" path. Remove action is present. |
| 8 | Aggregated adoption view | **Missing** | There is no surface aggregating cross-org links across the caller's enterprise capabilities. The EA must walk every detail page individually. Gap [#537](https://github.com/roballred/GovEA/issues/537). |
| 9 | Duplication detection | **Missing** | `/capabilities` with org filter shows a flat list across orgs but no overlap signal. Gap [#538](https://github.com/roballred/GovEA/issues/538). |

**Tally:** 5 works · 0 partial · 1 blocked · 2 missing · 1 works-with-bug.

## Findings

### Gaps filed

| Issue | Severity | Summary |
|---|---|---|
| [#536](https://github.com/roballred/GovEA/issues/536) | **High (functional bug)** | Approved cross-org link disappears from the target's view when the source capability has `visibility: 'org'`. Breaks the federation-approval feedback loop end to end. |
| [#537](https://github.com/roballred/GovEA/issues/537) | High (persona-blocking feature gap) | No aggregated adoption view — the EA cannot see "which agencies are implementing which of my enterprise capabilities" without walking every detail page. |
| [#538](https://github.com/roballred/GovEA/issues/538) | Medium (persona-blocking feature gap, future scope) | No capability duplication detection across connected orgs. Persona's stated goal; not addressed by any current surface. |

### Capability-doc consistency notes

[`mo-connection-approval.md`](../../business-architecture/capabilities/cms/multi-org/mo-connection-approval.md) and [`mo-cross-org-linking.md`](../../business-architecture/capabilities/cms/multi-org/mo-cross-org-linking.md) describe the approval flow as if approved links remain visible on both source and target. The shipped implementation matches that intent on the source side (where the target's content is typically `instance` or `connections` visibility and stays readable) but breaks it on the target side when the source is `org`-private (Gap #536). The capability docs do not specify what should happen when source visibility is below the federation threshold — that ambiguity is the upstream cause of the bug. Worth tightening the capability rule as part of the #536 fix.

### Seed-correction observation

The dev seed creates three cross-org links *from* Riverdale capabilities that all have `visibility: 'org'`. This is the scenario that triggers the bug above. If the seed is corrected (source visibility lifted to `connections` for those three capabilities), the bug becomes invisible during a code-based audit and the only way to catch it is the validation path proposed in #536 (reject the request at creation time). Both fixes — bug correction and seed correction — are needed. The #536 issue scopes both.

### Persona-validation note

Persona is still **Assumed**. Findings #537 and #538 weight heavily on the assumption that a real central-IT EA in a state or local government context would value adoption-tracking and duplication-detection as their primary daily-driver surfaces. That assumption is plausible but unvalidated. Re-prioritise once the persona is validated against at least one real central-IT architect.

## What worked, and worked well

- **Cross-org capabilities filtering in `/capabilities`** is well-designed. Sam sees his org's capabilities plus cross-org-visible items with a clear org-name affordance. The "All organizations" filter is intuitive.
- **The inbound-pending approval flow** has a thoughtful design — the pending link is special-cased to be visible to the approver even when the source is otherwise unreadable (`isInboundPending` exemption at [`apps/govea/src/actions/cross-org-links.ts:188`](../../apps/govea/src/actions/cross-org-links.ts)). The bug is only that the exemption stops after approval.
- **Server-side guardrails** (write-protection, content-ownership separation) are clean and well-documented in the capability files.

## Recommended follow-up

1. **Fix [#536](https://github.com/roballred/GovEA/issues/536) before promoting the multi-org federation prototype to v1**. The bug breaks the persona's primary workflow end-to-end and silently produces broken state in the dev seed.
2. **[#537](https://github.com/roballred/GovEA/issues/537) is the highest-value enterprise-architect feature work.** It's the surface the persona was designed around. Suggest scoping a small first cut (per-capability adoption table) and iterating once the persona is validated.
3. **[#538](https://github.com/roballred/GovEA/issues/538) is differentiator-track work** — duplication detection across agencies is what would make GovEA actively useful to a central EA, not just a passive repository.
4. **Continue the journey audit with `agency-ea-coordinator`** as the next persona. That persona is the *source side* of the same federation flow Sam exercised today and will surface complementary findings (especially around link withdrawal, rejection handling, and cross-org content discoverability).
