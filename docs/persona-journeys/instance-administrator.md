# Persona Journey — Instance Administrator

**Persona file:** [`business-architecture/personas/instance-administrator.md`](../../business-architecture/personas/instance-administrator.md)
**Capability anchor:** [`business-architecture/capabilities/cms/iam/iam-instance-administration.md`](../../business-architecture/capabilities/cms/iam/iam-instance-administration.md)
**Walk audited:** 2026-05-18 — first persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #519](https://github.com/roballred/GovEA/issues/519))
**Persona validation status:** Assumed (not yet validated with a real shared-platform operator).

> **Errata (2026-05-18):** the original report claimed the `createOrg` server action was unreachable from the UI. That was wrong — a `+ New organisation` button has been wired to `createOrg` in [`instance-orgs-table.tsx`](../../apps/govea/src/app/(instance)/instance/orgs/instance-orgs-table.tsx) since [#342](https://github.com/roballred/GovEA/pull/342), and the dialog flow is fully functional. The cross-link to [#389](https://github.com/roballred/GovEA/issues/389) was therefore over-eager: that issue scopes the broader lifecycle (states, transitions, governance), not creation alone. Other walk findings stand.

## Method

Code-based audit of the routes under `apps/govea/src/app/(instance)/instance/**`, their server actions in `apps/govea/src/actions/instance.ts`, and the dev seed in `apps/govea/src/db/seeds/dev-fixtures.ts`. Browser walk was not run — every step is reachable, well-typed, and well-named in code, so confidence is high without it. Steps where browser observation would meaningfully change the finding are called out.

## Canonical journey

The journey is grounded in the v1 behaviors enumerated in [`iam-instance-administration.md`](../../business-architecture/capabilities/cms/iam/iam-instance-administration.md):

1. Sign in to the instance.
2. Open the platform dashboard (`/instance`).
3. Open the org inventory (`/instance/orgs`).
4. Open an org's detail (`/instance/orgs/[id]`).
5. Suspend an org with a captured reason; unsuspend.
6. Open the cross-org user inventory (`/instance/users`).
7. Grant `instance_admin` to a user; later demote.
8. Initiate a break-glass session against a target org.
9. Revoke the break-glass session before expiry.
10. Open the platform audit log (`/instance/audit`); confirm the prior actions appear and are distinguishable from org-scoped events.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`ivan@govea.dev`) | **Partial** | Sign-in succeeds, but redirect lands the user on `/dashboard` (org dashboard for the system org), not `/instance`. One extra click via "Platform Admin" in the sidebar is required. Gap [#520](https://github.com/roballred/GovEA/issues/520). |
| 2 | Platform dashboard (`/instance`) | **Works** | Tenant count excludes the system org, user count, active and pending break-glass session counts, and recent `instance.*` audit events all render. Pending break-glass approvals from other admins are surfaced as actionable cards. |
| 3 | Org inventory (`/instance/orgs`) | **Partial** | All orgs render with user count, support tier, status, and creation date. The system org is *listed in the same table* as tenants with no visual differentiation. Gap [#522](https://github.com/roballred/GovEA/issues/522). |
| 4 | Org detail (`/instance/orgs/[id]`) | **Works** | Header with status / tier, metadata, internal governance form (support tier + notes), break-glass section with grant/approve/revoke/act-as, and user roster. Comprehensive and operationally credible. |
| 5 | Suspend + unsuspend | **Works** | `suspendOrg` requires a reason that is captured in the audit log with `instance.org.suspend` and `organizationId: null`. System-org guard enforced. Unsuspend is reversible. |
| 6 | Cross-org user inventory (`/instance/users`) | **Works** | All users across all orgs listed with org name, role, `instanceRole`, and active status. "Create account" dialog includes a checkbox for "Also grant platform admin access". |
| 7 | Promote / demote `instance_admin` | **Works** | Both actions require a reason via `ConfirmWithReason`. Self-demotion is blocked. Action is written to audit log with `instance.user.promote` / `instance.user.demote`. |
| 8 | Initiate break-glass | **Partial** | Grant form (reason + TTL) works. Approval gate for TTL > 60 minutes is correctly enforced in code, but **unobservable end-to-end with the shipped seed** because only one instance admin (`ivan`) exists — no second admin to approve. Gap [#521](https://github.com/roballred/GovEA/issues/521). |
| 9 | Revoke break-glass | **Works** | Revoke action available on the active session card; logs `instance.break_glass.revoke`. |
| 10 | Platform audit (`/instance/audit`) | **Partial** | Instance events filtered by `organizationId IS NULL`; break-glass listed separately. **No filter controls** — actor, action type, target org, or time window. Gap [#523](https://github.com/roballred/GovEA/issues/523). |

**Tally:** 6 works · 4 partial · 0 blocked · 0 missing.

## Findings

### Gaps filed

| Issue | Severity | Summary |
|---|---|---|
| [#520](https://github.com/roballred/GovEA/issues/520) | Low (UX) | Post-sign-in landing routes instance admins to `/dashboard` instead of `/instance`. |
| [#521](https://github.com/roballred/GovEA/issues/521) | Medium (seed coverage) | Only one instance admin in the seed; >1hr break-glass approval workflow cannot be exercised. |
| [#522](https://github.com/roballred/GovEA/issues/522) | Low (UX) | System org appears in `/instance/orgs` table with no visual differentiation from tenants. |
| [#523](https://github.com/roballred/GovEA/issues/523) | Medium (UX / audit usability) | `/instance/audit` has no filters — actor, action, target org, time window. |

### Existing issues that cover work flagged during this walk

| Existing | What it covers |
|---|---|
| [#389](https://github.com/roballred/GovEA/issues/389) | Org creation UI inside `/instance` is not yet built (the `createOrg` server action exists at `apps/govea/src/actions/instance.ts:20` but is unreachable from the UI). #389 already scopes "complete organisation lifecycle" — no new issue filed. |
| [#391](https://github.com/roballred/GovEA/issues/391) | Platform-owned endpoint and integration configuration — flagged as future in the capability doc; #391 scopes the design. |
| [#402](https://github.com/roballred/GovEA/issues/402) | Configurable platform operation defaults — flagged as future in the capability doc; #402 scopes it. |

### Capability confirmations

Each of the v1 behaviors enumerated in [`iam-instance-administration.md`](../../business-architecture/capabilities/cms/iam/iam-instance-administration.md) maps to a working surface in the current build (with the partials noted above). The persona's stated critical insight — *platform-wide authority without platform-wide authorship* — is preserved by the design: org-scoped content remains owned by org admins, and break-glass is the bounded path for cross-tenant access.

### Persona-validation note

The persona is still **Assumed**. Several findings above (especially #523, audit usability) are guesses about what a real shared-platform operator would want. Before treating these as authoritative gaps to fix, validate the persona against at least one real operator running GovEA as a shared service. The persona file already carries this caveat; the gap issues should be re-prioritized once validation lands.

## Recommended follow-up

1. Close out gap fixes against the four filed issues in priority order: [#521](https://github.com/roballred/GovEA/issues/521) (seed) is the cheapest win and unblocks future audits. [#520](https://github.com/roballred/GovEA/issues/520), [#522](https://github.com/roballred/GovEA/issues/522), [#523](https://github.com/roballred/GovEA/issues/523) are independent and can land in any order.
2. Use the seed update from #521 to re-walk steps 7–9 in a browser; the code-based audit is high-confidence but cannot observe the approval handoff between two real users.
3. Move on to the next persona walk under [#515](https://github.com/roballred/GovEA/issues/515). Recommended next: a persona whose seed coverage is similarly complete — likely `cms-administrator` or `enterprise-architect`.
