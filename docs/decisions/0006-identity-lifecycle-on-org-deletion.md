# ADR-0006: Identity Lifecycle on Org Deletion

**Status:** Accepted  
**Date:** 2026-06-18  
**Issue:** [#797](https://github.com/roballred/GovEA/issues/797)

## Context

`users.organization_id` was `NOT NULL` with `ON DELETE CASCADE`. This had two consequences:

1. **No org-less identities.** A platform operator (instance admin with no tenant membership) could not exist. Every identity had to be homed in an org, which blocked the #796 use-case of a pure platform admin who manages orgs from `/instance` but belongs to none of them.

2. **Org deletion destroyed identities.** Deleting an organisation cascaded to `users`, which deleted the identity row. For a user who belonged to multiple orgs (via `user_organization_memberships`, introduced in #693), deleting their *home* org wiped their identity even though their memberships in other orgs were still valid — a data-loss bug latent in the multi-org model.

With `user_organization_memberships` now the canonical org-access store (#693, #796), `users.organization_id` is a legacy denormalized home pointer, not the sole authority on whether a user belongs anywhere.

## Decision

Relax `users.organization_id` to **nullable** with **`ON DELETE SET NULL`** instead of `CASCADE`.

**Identity lifecycle on org deletion:**
- `users.organization_id` is set to `NULL` (not deleted).
- The application deactivates the user (`is_active = 'false'`) as a follow-on step when the deletion of the last active membership is detected, rather than at the DB layer via cascade.
- Memberships in `user_organization_memberships` for the deleted org are removed by their own `ON DELETE CASCADE` on `organization_id`.
- The identity row survives for audit purposes (the `audit_log` immutability constraint applies; deleting the identity would orphan those rows).

**Platform-only instance admins:**
- An instance admin may be provisioned with `organization_id = NULL` — they sign in and are redirected exclusively to `/instance`.
- The SSO guard (`sso-guard.ts`) allows `instance_admin` users with no org through; all other org-less users receive `no_org_binding` (blocked).
- The `events.createUser` safety net in `auth.ts` exempts `instance_admin` users from the deactivation path.
- The edge middleware redirects platform-only operators away from org-scoped routes to `/instance`.

## Alternatives considered

**Keep `CASCADE` and add a separate platform-admin identity type.** This would require a separate table or a different identity path entirely. Adds complexity; nullable column on the existing table is simpler and models the reality that org membership is optional for platform roles.

**`ON DELETE RESTRICT`.** Prevents org deletion if users are still homed there. Pushes the problem to the caller (admin UI must deactivate/reassign users before deleting an org). Possible future hardening, but blocks common admin workflows today.

## Consequences

- The application layer is now responsible for deactivating users whose last active org is deleted. This must be wired into the org-deletion action.
- TypeScript: `users.organizationId` is now `string | null` everywhere drizzle infers the type. All `session.user.organizationId!` assertions in org-scoped pages remain safe because those pages are only reachable by org-bound sessions (the middleware guard and `(admin)` layout both check `organizationId`).
- Pre-production only — enforced by `db:push`. When the switch to migrations lands, the first migration must include `ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL` and a matching `ON DELETE SET NULL` on the FK.
