# Multi-Org Membership — Identity & Tenancy Design Slice

**Issue:** [#693](https://github.com/roballred/GovEA/issues/693)
**Status:** Design proposed, awaiting decision before code
**Capability:** `iam-user-management`, `iam-role-based-access-control` (group: `cms/multi-org`)
**Persona:** CMS Administrator, Instance Administrator

---

## Why this is a design note, not a PR

#693 changes the shape of identity itself: a GovEA user currently belongs to **exactly one** organization (`users.organization_id`) with **one** role (`users.role`). Real users don't — a central EA staffer supports several agencies, a consultant serves several clients, a shared-services user needs different rights in different orgs. Today the only workaround is *separate accounts per org with separate emails*, which `users.ts` calls out explicitly. That workaround fragments identity and audit history.

This is a `track:core` foundational change. It is far cheaper to land **now**, in pre-production with no real tenant data (the `db:push` policy confirms there's nothing to preserve), than after multi-org users and per-org duplicate accounts accumulate. The main risk is doing it badly — turning multi-membership into *implicit federation* or instance-wide access. This note exists to lock the model and the isolation guarantees before any code.

## Current state (what we're changing)

- `apps/govea/src/db/schema/users.ts` — `organizationId` (NOT NULL FK, `onDelete: cascade`) and `role` live directly on the user row. `email` is globally unique.
- **The single chokepoint:** `apps/govea/src/lib/auth.ts` is the *only* place org/role enter the session — the JWT callback sets `token.role`/`token.organizationId` from the `users` row (lines ~147-148), and the session callback copies them to `session.user` (lines ~210-211).
- **Everything else reads, never sets:** ~95 files read `session.user.organizationId`, ~47 read `session.user.role`. They authorize against those trusted session fields.

The blast radius looks enormous (1,300+ `organizationId` references) but is structurally narrow: those 95+47 files are *consumers* of one value produced in one place.

## Core decision: session carries the **active** context; membership is the source of truth

Keep `session.user.organizationId` and `session.user.role` exactly as they are — but redefine their meaning from *"the user's only org/role"* to *"the user's currently-active org/role."* Resolve them in `auth.ts` from a new membership table instead of the `users` row.

**Consequence:** every one of the 95+47 downstream files keeps working unchanged. They already ask "what is my org/role?" and get a server-authoritative answer; they neither know nor care that the answer now comes from a membership. This turns #693 from a sprawling rewrite into a **schema + auth-resolution change with a UI add-on.**

This is the central design commitment and the reason the work is tractable.

## Schema

```
user_organization_memberships
  id                uuid pk
  user_id           uuid not null  -> users.id            (on delete cascade)
  organization_id   uuid not null  -> organizations.id    (on delete cascade)
  role              user_role not null            -- admin | contributor | viewer (reuses existing enum)
  is_active         boolean not null default true -- soft-deactivate, never hard-delete (audit)
  is_primary        boolean not null default false
  created_at        timestamp not null default now()
  updated_at        timestamp not null default now()

  unique (user_id, organization_id)               -- one membership row per user per org
```

Notes:
- Reuses the existing `user_role` enum — role semantics are unchanged, only *where they're stored* and *that there can be more than one*.
- `is_primary` backs the default-active-org choice (see Q2).
- `is_active` lets a membership be revoked while preserving the historical row for audit (see Q3).
- `users.instance_role` is **untouched** and stays orthogonal (see Q4).

## Decisions on the four open questions

**Q1 — Keep `users.organization_id` / `users.role`, or remove after migration?**
**Keep them** as denormalized "active/home" pointers, during and after this slice. They are what insulate the 95+47 files: `auth.ts` can fall back to them, and nothing downstream has to change in lockstep. Removing the columns is a *separate, optional* future cleanup — explicitly out of scope here. Do not couple a risky 95-file column removal to this change.

**Q2 — Which org is active at sign-in?**
Resolution order: **last-selected** (persist the user's last active org) → **`is_primary` membership** → **sole membership**. A user with exactly one active membership is never prompted — single-org sign-in UX is byte-for-byte unchanged. A multi-membership user with no stored last-selected lands on their primary.

**Q3 — Can a deactivated user keep inactive historical memberships?**
**Yes.** Membership revocation sets `is_active = false`; the row persists. This matches GovEA's audit-immutable posture (`audit-immutable.sql`) — membership history is part of the tenancy record and shouldn't be erased.

**Q4 — How do instance-admin / break-glass flows interact with ordinary membership?**
**They stay orthogonal.** `users.instance_role` (and break-glass per `docs/design/break-glass-real-enforcement.md`) governs *instance-wide* operations and cross-tenant access; ordinary memberships govern *per-org* content rights and never grant instance reach. The instance console manages memberships across orgs; an Admin manages memberships only within their own org. This separation is the firewall against the headline risk — multi-membership must never become implicit federation.

## Isolation guarantees (the non-negotiables)

- **One active org at a time.** The session holds a single active `organizationId`; all reads/writes scope to it exactly as today. Holding three memberships grants access to *one* org's content at a time — the active one.
- **Server-authoritative.** Active org/role are derived in `auth.ts` from membership rows and carried in the JWT/session. The client never asserts org or role; switching orgs re-issues the token server-side.
- **No implicit cross-org exposure.** Cross-org visibility remains *only* via the existing explicit federation model (#44). Membership ≠ federation. A query in active org A cannot see org B's private content even if the user is a member of B.
- **Identity stays unified.** `email` remains globally unique — one person, one identity, many memberships. This *removes* the separate-account-per-email workaround rather than extending it.

## Implementation slices (each ships green)

Because of the denormalized-fallback + single-chokepoint design, these land incrementally without breaking consumers:

1. **Schema + backfill.** Add `user_organization_memberships`; seed one membership per existing user from `users.organization_id`/`role`, `is_primary = true`. Keep the user columns. (No behavior change yet.)
2. **Auth resolution.** In `auth.ts`, resolve the active membership → set `token`/`session` org+role from it, falling back to the user row. Single-membership users: identical behavior.
3. **Org switcher.** A server action that changes the active org (re-issues the JWT) + a UI control; persists last-selected for Q2.
4. **Management surfaces.** Org-scoped Admin membership management (own org only); Instance console cross-org membership CRUD; per-**membership** last-admin guard; audit events on membership create/update/deactivate/reactivate/delete.
5. **Hardening + tests** (see below).

## What is NOT in this slice

- Removing `users.organization_id` / `users.role` (Q1 — future, optional).
- Simultaneous multi-org views or cross-org dashboards (would violate "one active org").
- Any change to the federation model (#44) or break-glass (#418).
- SCIM / automated membership provisioning.

## Tests (acceptance)

- Single-org user behavior is unchanged (no chooser, same session shape).
- Multi-org sign-in selects the correct active org (last-selected → primary → sole).
- Org switching re-scopes reads/writes and re-issues role.
- Per-org role enforcement (Admin in org A, Viewer in org B).
- Last-admin guard fires per **org membership**, not per user row.
- Cross-org denial: a member of A and B cannot read B's private content while active in A.
- Local-credential and SSO sign-in resolve the same identity and membership set.

## Open questions for review

- Backfill: do any current accounts already use the separate-email-per-org workaround that should be *merged* into one identity? (Expected: none, pre-production — confirm before backfill.)
- Should `is_primary` be user-editable, or admin-assigned at membership creation?
- Org switcher placement — global header vs. account menu (UX, not blocking).
