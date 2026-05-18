# Persona Journey — CMS Administrator

**Persona file:** [`business-architecture/personas/cms-administrator.md`](../../business-architecture/personas/cms-administrator.md)
**Capability anchors:** [`admin-configuration`](../../business-architecture/capabilities/cms/admin-configuration/) group, [`iam-user-management`](../../business-architecture/capabilities/cms/iam/iam-user-management.md), [`iam-sso-authentication`](../../business-architecture/capabilities/cms/iam/iam-sso-authentication.md), [`iam-audit-trail`](../../business-architecture/capabilities/cms/iam/iam-audit-trail.md)
**Walk audited:** 2026-05-18 — second persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #526](https://github.com/roballred/GovEA/issues/526))
**Persona validation status:** Assumed (not yet validated with real government IT admins in 1–3 person shops).

## Method

Code-based audit of routes under `apps/govea/src/app/(admin)/**`, capability docs under `business-architecture/capabilities/cms/admin-configuration/`, and the dev seed. Browser walk not run; the audit explicitly distinguishes "capability documented but no UI" findings (which are confident without a browser) from runtime-behavior questions (which would benefit from one).

## Canonical journey

Grounded in the persona's stated goals (config without code, users/roles, org settings, SSO, audit, low-maintenance operation):

1. Sign in to the org.
2. Open the org dashboard (`/dashboard`).
3. Open Settings (`/settings`) — theme, modules, framework overlays, application custom fields, completeness, confidence.
4. Open Settings → Notices (`/settings/notices`).
5. Open Users (`/users`) — manage users + roles.
6. Open Taxonomy (`/taxonomy`) — classification types + values.
7. Open Audit (`/audit`) — review change log.
8. Configure SSO for the org (Microsoft Entra ID / OIDC).

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in (`alice@govea.dev`) | **Works** | Credential or Microsoft sign-in; lands on `/dashboard`. |
| 2 | Org dashboard (`/dashboard`) | **Partial** | Comprehensive: coverage tiles, RAG buckets, completeness trend, confidence summary, most-needed actions. The dashboard does **not** surface several capability-required signals: "email not configured" warning (`ac-email-configuration`), "last export timestamp" (`ac-backup-export`). Tracked indirectly via gap [#528](https://github.com/roballred/GovEA/issues/528) and [#529](https://github.com/roballred/GovEA/issues/529). |
| 3 | Settings (`/settings`) | **Partial** | Six sections present: Appearance (theme), Modules, Framework Overlays, Application Custom Fields, Repository Completeness, Repository Confidence. Missing sections that capabilities call for: **Security**, **Email**, **Backup & Export**, **SSO**. Gaps [#527](https://github.com/roballred/GovEA/issues/527), [#528](https://github.com/roballred/GovEA/issues/528), [#529](https://github.com/roballred/GovEA/issues/529), [#530](https://github.com/roballred/GovEA/issues/530). |
| 4 | Notices (`/settings/notices`) | **Works** | Recently shipped (PR #508). Org-wide notice authoring. |
| 5 | Users (`/users`) | **Works** | Create / edit / deactivate / delete; role selection (admin / contributor / viewer); last-admin guard enforced (`adminCount <= 1 → cannot deactivate or delete`). Search and role filter present. Matches the `iam-user-management` capability's v1 stated scope. |
| 6 | Taxonomy (`/taxonomy`) | **Works** | Classification types and values with usage-aware delete guards. Used by capabilities / glossary / personas / principles. |
| 7 | Audit (`/audit`) | **Partial** | Org-scoped audit list, limit 200, no filters (actor / action / time). Gap [#531](https://github.com/roballred/GovEA/issues/531) — parallel to [#523](https://github.com/roballred/GovEA/issues/523) which is the same problem at instance scope. |
| 8 | SSO config | **Missing UI** | SSO is configured via environment variables (`AUTH_MICROSOFT_ENTRA_ID_ID`), not via admin UI. The capability doc contradicts itself (Persona says "configures SSO via the admin UI"; Behaviors say "environment variables"). Gap [#530](https://github.com/roballred/GovEA/issues/530). |

**Tally:** 3 works · 4 partial · 1 missing · 0 blocked.

## Findings

### Gaps filed

| Issue | Severity | Summary |
|---|---|---|
| [#527](https://github.com/roballred/GovEA/issues/527) | High (capability not built) | No Security Settings UI — password policy, session timeout, account lockout all hard-coded. |
| [#528](https://github.com/roballred/GovEA/issues/528) | High (capability not built) | No Email Configuration UI — SMTP, test send, From identity, delivery log all missing. |
| [#529](https://github.com/roballred/GovEA/issues/529) | High (capability not built) | No operational Backup & Export UI. Distinct from [#86](https://github.com/roballred/GovEA/issues/86) (data portability). |
| [#530](https://github.com/roballred/GovEA/issues/530) | Medium (doc contradiction / decision) | `iam-sso-authentication.md` says both "configures SSO via the admin UI" and "configured via environment variables". Pick one. |
| [#531](https://github.com/roballred/GovEA/issues/531) | Medium (UX) | `/audit` has no filter controls (mirrors [#523](https://github.com/roballred/GovEA/issues/523) at instance scope). |

### Existing issues referenced

- [#86](https://github.com/roballred/GovEA/issues/86) — Data Export (data portability for external use). Distinct from `ac-backup-export` (operational restore); see #529 for the relationship.
- [#523](https://github.com/roballred/GovEA/issues/523) — instance audit filters. #531 is the org-scoped parallel.

### Capability-doc hygiene observation

Four `admin-configuration` capability files lack the `## Implementation Status` section that other capability docs use to distinguish built-and-shipped behavior from future scope:

- `ac-security-settings.md`
- `ac-email-configuration.md`
- `ac-backup-export.md`
- `ac-persona-tags.md` (not part of this walk — flagged for completeness)

Without Implementation Status, a reader cannot tell whether the documented behaviors are aspirational or shipped. Recommend the gap issues above add Implementation Status as part of their acceptance criteria, and that an `ac-persona-tags` doc patch be filed separately. Not filed here — defer the docs-hygiene issue until the user weighs in on the volume.

### Capability confirmations

- `iam-user-management` v1 scope (org-scoped user CRUD, role assignment, last-admin guard) is faithfully implemented at `/users`.
- `ac-feature-management` is implemented at `/settings` (Modules + Framework Overlays).
- `ac-site-settings` v1 scope (theme only) is implemented; broader site settings are explicitly future per the capability doc.
- `ac-admin-dashboard` is rich and operationally credible (coverage / RAG / completeness / confidence).
- `iam-audit-trail` is present but bare-bones at the UI layer.

### Persona-validation note

The persona is **Assumed**. Findings #527 / #528 / #530 are weighted on the assumption that a 1–3 person government IT shop genuinely needs admin-UI control over security policy, SMTP, and SSO binding rather than touching a config file at deploy time. That assumption holds for most agencies but not all (e.g. a managed-hosting scenario where the operator is a different person from the org admin and is happy to maintain env vars on their behalf). Re-prioritize after the persona is validated.

## Recommended follow-up

1. Decide on [#530](https://github.com/roballred/GovEA/issues/530) (SSO UI vs env vars) first — it's a documentation/decision question and gates whether the SSO UI work is in scope for v1 at all.
2. Prioritize among [#527](https://github.com/roballred/GovEA/issues/527), [#528](https://github.com/roballred/GovEA/issues/528), [#529](https://github.com/roballred/GovEA/issues/529) — Security Settings is the most likely deployment-blocker for an agency baseline; Email is the most user-visible (no password reset flow today); Backup is the most painful when missed but the least visible day to day.
3. [#531](https://github.com/roballred/GovEA/issues/531) and [#523](https://github.com/roballred/GovEA/issues/523) should land together — shared UI component, common backend filter parameters.
4. Continue the journey audit with the next persona. Recommended next: `enterprise-architect` (primary content-producer persona; will validate the model-and-evolve flows) or `cms-viewer` (smallest, fastest journey; confirms read-only paths work for non-authoring users).
