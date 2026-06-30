# Platform Core Extraction — Reusable Multi-Tenant Foundation

**Initiative:** GovCore — a standalone platform-core initiative (its own repo, backlog, versioning, and release lifecycle), independent of GovEA's roadmap. GovEA is the first consumer, not the owner.
**Status:** Proposal — core decisions locked; Phase 0–1 work breakdown in §12
**Author:** AI-assisted · drafted 2026-06-19 · last updated 2026-06-21
**Audience:** Maintainer + architecture reviewers
**License:** MIT (§11.7)
**Supersedes:** the skeletal `packages/core` (`@govea/core`) as the long-term home for platform-plane code

> **Single planning record.** Because GovCore is a separate initiative whose repository does not
> exist yet, *this document is the one and only place the work is tracked* — design, decisions, and
> work breakdown all live here. Nothing is filed as a GovEA issue, milestone, or ADR.
>
> **What's settled:** the decisions in the table below are locked, including the code-review
> hardening (§13) — database-enforced tenant isolation (RLS + two-role DB), a generic `createRbac`,
> and (2026-06-21) building the full content engine (Appendix B). §11's open list is now effectively
> closed. Binding decisions are recorded here; they can graduate into the GovCore repo's own ADRs
> once it exists.

---

## 1. Summary

GovEA already contains a production-grade, multi-tenant **platform plane** — identity, organizations, memberships + active-org resolution, RBAC, audit, federation, and support-access (break-glass / act-as) sessions. Today that machinery is fused into `apps/govea/src`, and the only shared package (`@govea/core`) holds thin pure-function stubs (role tables, an audit-event shape, a content-type registry, a workflow state machine).

This document proposes extracting the platform plane into a **separate, versioned repository** so GovEA and future multi-tenant apps consume it as published packages rather than re-implementing tenancy, auth, and audit each time.

The design is deliberately **opinionated**: it assumes the GovEA stack (Next.js App Router + Drizzle + PostgreSQL + Auth.js). That trades portability for batteries-included reuse — a new same-stack app should be able to stand up a secure multi-tenant skeleton in well under a day.

### Decisions locked for this proposal

These were chosen explicitly and frame everything below:

| Decision | Choice | Consequence |
|---|---|---|
| **Distribution** | Separate dedicated repo, now | Published, semver'd packages; cross-repo release discipline |
| **Scope** | Platform plane **+ content engine** | Identity, tenancy, RBAC, audit, federation, support sessions — *plus* a comprehensive content engine (Appendix B). An app's specific entity *definitions* still live app-side, as configuration on top of the engine |
| **Content modeling** | Build the **full content engine**, aiming to **model every content type** | `@govcore/content` compiles type definitions → real Drizzle tables + migrations, with relationships, computed fields, and per-type code hooks as first-class; generated actions/UI; recipes. Built **after** the platform-plane v1 as GovCore's second milestone. Decided 2026-06-21 — see Appendix B |
| **Stack coupling** | Opinionated — assume the stack | Core ships ready-to-use Drizzle schema, Auth.js config, server actions, middleware |
| **DB ownership** | Core owns the **platform tables *and* their migrations** | Core ships versioned migrations + a migrate runner for the platform schema; the app owns only its domain tables and their migrations. Removes the cross-app drift class |
| **Tenant data portability** | Core owns **backup / restore to file** | Core ships the whole-tenant export/restore engine; the app registers which of its domain tables participate |
| **Tenant isolation** | **Database-enforced (Postgres RLS) + two DB roles**, adopted at the Phase 1 cutover | Org boundary enforced by RLS policies + a transaction-local org GUC, not by app convention; owner/DDL role vs. non-owner runtime role. Commits all tenant DB access to run inside a tenant transaction. See §13.1–13.2 |
| **RBAC shape** | **Generic `createRbac`** over an app-supplied role/permission map | Core ships the role machinery parameterized by the app's types; GovEA's `admin/contributor/viewer` map is the default export. See §13.3 |

---

## 1a. Architecture at a glance

### Layering — what sits on what

GovCore is the foundation layer; each app is a thin domain + UI layer composed on top. The app never re-implements the platform plane — it *configures* it.

```text
┌──────────────────────────────────────────────────────────────────┐
│  CONSUMER APP  (e.g. GovEA) — owns domain + UI                     │
│                                                                    │
│   UI / pages          Domain entities         Domain actions       │
│   (brand theme)       capabilities, goals…     (tenantAction)       │
│        │                    │                       │              │
│        └──────────►  Composition layer  ◄───────────┘              │
│              schema compose · createAuth() · createMiddleware()    │
└────────────────────────────┬─────────────────────────────────────┘
                             │  depends on / configures (never reimplements)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  GOVCORE   @govcore/*   — platform plane (reusable)                │
│                                                                    │
│   auth    middleware   tenancy   rbac   audit   federation         │
│   support     backup      nextkit       theme (WCAG-AA)            │
│                              │                                      │
│       @govcore/schema  (table defs + platform migrations)          │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
                  ┌─────────────────────────┐
                  │      PostgreSQL         │
                  │  platform tables +      │
                  │  app domain tables      │
                  └─────────────────────────┘
```

### Package dependency graph (no cycles)

The DB-free packages (`schema`, `rbac`, `theme`, and `middleware`'s runtime) stay edge-safe so they can be imported into Next middleware without dragging in a DB client — this is what protects ADR-0003.

```text
EDGE-SAFE / DB-FREE  (importable in Next middleware, no DB client):
   @govcore/schema       →  (no deps)
   @govcore/rbac         →  (no deps)
   @govcore/theme        →  (no deps)

DB-TOUCHING:
   @govcore/audit        →  schema
   @govcore/tenancy      →  schema, rbac
   @govcore/auth         →  schema, tenancy, rbac, audit
   @govcore/federation   →  schema, tenancy, audit
   @govcore/support      →  schema, tenancy, audit
   @govcore/backup       →  schema, tenancy, audit

NEXT.JS GLUE:
   @govcore/middleware   →  auth, tenancy        (TYPES ONLY — stays edge-safe)
   @govcore/nextkit      →  auth, tenancy, rbac, audit, federation, support, theme

Arrows = "depends on". No cycles. The three edge-safe packages never import a
DB client, which is what keeps middleware ADR-0003-compliant.
```

### Request lifecycle — the enforced tenant boundary

Every authenticated mutation flows through the same gates, all owned by GovCore. The app supplies only the domain logic in the middle.

```text
Browser
  │  request + session cookie
  ▼
@govcore/middleware ─────────────────────────────────────────────────
  • read-only token decode (ADR-0003 — never writes session cookies)
  • resurrection guard (#782) · maintenance · password-expiry routing
  │
  ├─ blocked / unauthenticated ──►  redirect to /login
  │
  └─ allowed ▼
Server action (app)  ── wrapped in @govcore/nextkit tenantAction ─────
  │
  ├─►  @govcore/tenancy: resolveActiveMembership
  │        └─ DB ──►  { organizationId, role }   (NEVER from caller input)
  │
  ├─►  @govcore/rbac gate:  hasPermission(role, 'content:edit')
  │
  ├─►  DB query/mutate   WHERE id = ?  AND organization_id = ?
  │        └─ cross-org rows are invisible
  │
  └─►  @govcore/audit:  append-only INSERT
           └─ Postgres trigger blocks UPDATE/DELETE (#417)
  │
  ▼
Result ──►  Browser
```

---

## 2. The core / app boundary

The cleanest way to think about this: **the platform plane knows about *tenants, identity, and trust*. It knows nothing about *enterprise architecture*.** The boundary is a "who can do what, in which org, and how do we prove it" line.

### In core (extract)

Mapped to the real GovEA modules that move:

| Capability | Today in GovEA | Notes for extraction |
|---|---|---|
| **Identity & auth** | `lib/auth.ts`, `lib/auth.config.ts`, `lib/sso-guard.ts`, `lib/password.ts`, `schema/users.ts` (`users`, `accounts`, `sessions`, `verificationTokens`) | Local credentials + OIDC SSO. Provider must be **configurable** — today it hard-imports `microsoft-entra-id`; core takes providers as input |
| **Multi-tenancy** | `schema/organizations.ts`, `userOrganizationMemberships`, `lib/active-membership.ts`, `lib/membership-guards.ts`, `lib/membership-sync.ts`, `actions/active-org.ts`, `actions/memberships.ts` | The membership model + active-org resolution (#693) is the heart of tenancy. This is the highest-value extraction |
| **RBAC** | `@govea/core/rbac` (already shared) + `lib/rbac.ts` wrappers | Role math is already in the package — but it **hardcodes GovEA's `admin/contributor/viewer` roles and 7-permission map.** "Promote it" is not enough: core must ship the machinery *generic over an app-supplied role/permission map* so a second app can define its own roles. See §13.3 |
| **Audit** | `@govea/core/audit` (shape) + `lib/audit.ts` (writer), `lib/audit-view.ts`, `schema/audit.ts`, `db/sql/audit-immutable.sql` | Ship the writer **and** the append-only Postgres trigger SQL. Append-only at the DB layer (#417) is a security property, not an app detail |
| **Federation** | `lib/federation.ts`, `lib/cross-org-link-helpers.ts`, `schema/federation.ts` (`org_connections`, `cross_org_links`), `actions/connections.ts`, `actions/cross-org-links.ts` | Visibility enum (`org` / `connections` / `instance`) and cross-org link rules |
| **Support access** | `lib/break-glass.ts`, `lib/act-as.ts`, `schema/break-glass-sessions.ts`, `schema/act-as-sessions.ts`, `actions/act-as.ts`, `lib/instance-admin.ts` | Break-glass + act-as, instance-admin separation |
| **Route protection** | `middleware.ts`, `lib/logout-marker.ts`, `lib/auth-redirect.ts`, `lib/request-context.ts`, `lib/security-policy.ts`; security response headers in `next.config.ts` (#743) | The hard-won security edge cases (ADR-0003 read-only token decode, #782 resurrection guard, #720 XFF anti-spoofing, #807 bind-address leak) are *exactly* what you don't want re-derived per app. CSP is **report-only** today; extract it as enforced + nonce-based (§13.6) |
| **Instance console primitives** | `schema/instance-settings.ts`, `schema/platform-config.ts`, parts of `actions/instance.ts` | Maintenance mode, instance-level settings |
| **Accessible base theme** | `lib/themes.ts` base tokens (the `globals.css` `:root`/`.dark` layer), the org-theme value allowlisting (#769), the theme/globals drift guard (#766/#770) | Core ships a **WCAG-AA base theme as the accessibility floor**; apps layer brand add-ons on top but cannot drop below it. See §6.7 |
| **Tenant backup / restore to file** | `lib/backup-export.ts`, `lib/backup-import.ts`, `actions/backup.ts` | Core owns the whole-tenant **export/restore engine** (archive format, org-scoped extraction, integrity, audit, transactional restore). It walks both core tables and the **app's registered domain tables**. See §6.8 |

### Stays in the app (do not extract)

- **All EA domain entities and their tables**: capabilities, goals, objectives, initiatives, applications, services, personas, principles, ADRs, glossary, data-architecture, value-streams, strategies, architecture-debt.
- **Domain logic** built on the traceability chain (`completeness-*`, `trace-participants`, `capability-tree`, `impact-analysis`, `duplicate-*`, `debt-*`).
- **Entity *definitions* (but not the engine that runs them)**: *which* fields a Capability or a Permit has, its relationships, computed fields, and lifecycle hooks live app-side as **configuration** passed to the content engine. The engine itself — content-type registry, the definition→table compiler, workflow/lifecycle, taxonomy, recipes — is **core** (`@govcore/content`, Appendix B), a decision reversed on 2026-06-21. So GovEA still owns *what a Capability is*; GovCore owns *the machinery that turns that definition into tables, validation, actions, and UI*.
- **Reports, and per-entity CSV import/export** (domain spreadsheet round-trips, `lib/csv.ts`). Distinct from whole-tenant backup/restore, which *is* core (§6.8): CSV import/export is "edit this entity type in a spreadsheet"; backup is "snapshot/move an entire organization." The app does register its domain tables into core's backup engine, but owns its own CSV mappings.
- **Brand theme add-ons** — an app's own palette/logo/header treatment (GovEA's `govea` and `servicenow` theme defs are app-level add-ons). These *layer on top of* the core base theme and may only override brand vars, never weaken the accessibility floor (§6.7).

### The litmus test

> If a record carries `organization_id` because it is **EA content**, it stays in the app. If a table exists so the platform can answer *"is this actor allowed to act in this org, and did we record it,"* it goes to core.

---

## 3. Repository and package layout

A single new repo, multiple published packages, so consumers depend only on what they use.

**Repo name:** `GovCore`. Packages are published under the **`@govcore/*`** scope. The name deliberately signals "the core that GovEA (and the next gov app) is built on" — it is the foundation, not a GovEA sub-component.

```
GovCore/                      (new repo)
├── packages/
│   ├── schema/        @govcore/schema     table defs + enums + platform MIGRATIONS + migrate runner + trigger SQL
│   ├── tenancy/       @govcore/tenancy    memberships, active-org resolution, org guards
│   ├── rbac/          @govcore/rbac       roles, permissions, hierarchy (promote current @govea/core/rbac)
│   ├── auth/          @govcore/auth       Auth.js config factory, SSO guard, password, session lifecycle
│   ├── audit/         @govcore/audit      audit writer + view + append-only trigger contract
│   ├── federation/    @govcore/federation org connections + cross-org links + visibility
│   ├── support/       @govcore/support    break-glass + act-as + instance-admin
│   ├── backup/        @govcore/backup     whole-tenant export/restore engine + domain-table registry
│   ├── middleware/    @govcore/middleware Next middleware factory + logout marker + request context
│   ├── theme/         @govcore/theme      WCAG-AA base tokens + Tailwind preset + safe theme-var injection
│   ├── server/        @govcore/server     tenantAction + action context + tenant transaction (see §13.4)
│   ├── testing/       @govcore/testing    test factories (createTestOrg/User, withActiveMembership) (see §13.4)
│   ├── nextkit/       @govcore/nextkit    UI primitives + route guards + reusable instance-console React (§11.6) (tenantAction moved to @govcore/server)
│   └── content/       @govcore/content    content engine: type-def → Drizzle compiler, lifecycle, taxonomy, recipes, generated actions/UI (Appendix B — second milestone)
├── examples/
│   └── minimal-app/                          reference consumer; doubles as an e2e fixture
├── docs/
└── .changeset/
```

**Dependency direction (no cycles):**

```
schema  ──>  (none)        # table defs are dep-free; the migrate runner is a separate entrypoint
rbac    ──>  (none)
audit   ──>  schema
tenancy ──>  schema, rbac
auth    ──>  schema, tenancy, rbac, audit
federation ─> schema, tenancy, audit
support ──>  schema, tenancy, audit
backup  ──>  schema, tenancy, audit
middleware ─> auth (types only), tenancy (types only)
theme   ──>  (none)
server  ──>  tenancy, rbac, audit              # the lean tenantAction seam (§13.4)
testing ──>  schema, tenancy, auth             # test factories
nextkit ──>  server, theme, federation, support, … (UI layer)
content ──>  schema, tenancy, rbac, audit, server, nextkit   # content engine (Appendix B); built after platform-plane v1
```

> **Note:** the `@govcore/server` and `@govcore/testing` packages, and the `govcore.*` Postgres-schema namespacing, are refinements from the code-level review in **§13.4**. The §1a diagrams show the pre-§13 conceptual grouping; §3 and §13 are authoritative on final packaging.

Keep `schema`'s **table-definition** export and `rbac` dependency-free so they can be imported into edge/middleware contexts and pure unit tests without dragging in DB clients. `@govcore/schema`'s migrate runner is a **separate entrypoint** (`@govcore/schema/migrate`) that *does* touch the DB — it is never imported by the edge bundle.

### Why separate packages, not one `@govcore/core`

The current `@govea/core` barrel re-exports everything from one entry. That's fine for stubs but becomes a liability the moment middleware (edge-safe, no Node APIs) and the audit writer (needs a DB client) live behind the same import. Splitting lets the edge bundle stay edge-safe and keeps `db`-touching code out of the middleware bundle — which is what ADR-0003 is protecting.

---

## 4. The opinionated stack contract

Core assumes, and declares as **peer dependencies**, the host app provides:

- `next` (App Router), `react`, `react-dom`
- `next-auth@5` (+ `@auth/drizzle-adapter`)
- `drizzle-orm` + a `postgres` (or `pg`) client
- `zod`, `bcryptjs`

Core does **not** bundle these; it expects one resolved copy in the app. Peer deps avoid the "two copies of Auth.js" class of bug and let the app control versions.

What "opinionated" buys the consumer: they don't choose an auth library, an ORM, a tenancy model, or an audit format. They get GovEA's, already hardened. What it costs: an app that wants a different stack gets nothing reusable here — that is the accepted trade for the locked decision.

### Configuration is injected, never hard-coded

A non-negotiable carried over from GovEA's public-repo policy (operator-specific identifiers live in env, not source — see `lib/request-context.ts`'s `GOVEA_TRUSTED_PROXY_HOPS`). Core exposes **factories that take config**, not modules that read global env at import time:

```ts
// app: src/lib/auth.ts
import { createAuth } from '@govcore/auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import { db } from '@/db/client'
import * as schema from '@/db/schema'

export const { handlers, auth, signIn, signOut } = createAuth({
  db,
  schema,                       // app's composed schema (see §5)
  providers: [MicrosoftEntraID({ /* app-owned secrets */ })],
  trustedProxyHops: Number(process.env.TRUSTED_PROXY_HOPS ?? 1),
  ssoGuard: defaultSsoGuard,    // "must map to pre-provisioned active user"
})
```

The provider list is the clearest example of why this matters: GovEA's `lib/auth.ts` hard-imports `microsoft-entra-id`, but the *architecture* is "any OIDC provider + local credentials." The factory makes that real instead of aspirational.

---

## 5. Schema model — core owns the platform schema and its migrations

This is the decision that most shapes the DB story, so it gets its own section.

**Core owns the platform tables and their migrations end to end. The app owns its domain tables and their migrations. One database, two migration streams that never overlap.**

`@govcore/schema` ships three things:

1. **Table definitions** (Drizzle objects) — so the app writes type-safe queries and declares foreign keys *to* platform tables. Dependency-free, edge-safe.
2. **Versioned migrations** for those tables — the exact DDL that creates/alters `organizations`, `users`, `user_organization_memberships`, `audit_log`, `org_connections`, `cross_org_links`, `break_glass_sessions`, `act_as_sessions`, instance settings — plus the append-only audit trigger as a raw-SQL migration step.
3. **A migrate runner** (`@govcore/schema/migrate`, exposed as a `govcore-migrate` bin) that applies those migrations and records them in a core-owned tracking table (`__govcore_migrations`), kept separate from the app's own Drizzle journal.

```ts
// @govcore/schema — table definitions the app imports for queries + FKs
export const visibilityEnum = pgEnum('visibility', ['org', 'connections', 'instance'])
export const organizations = pgTable('organizations', { /* … */ })
export const users = pgTable('users', { /* organizationId FK, … */ })
// memberships, accounts, sessions, auditLog, orgConnections, crossOrgLinks, …
```

```ts
// app: src/db/schema/index.ts — re-export core tables, add domain tables that FK to them
export * from '@govcore/schema'             // organizations, users, memberships, audit_log, …
import { organizations } from '@govcore/schema'

export const capabilities = pgTable('capabilities', {
  ...orgScoped(organizations),              // organization_id FK → core's organizations
  name: text('name').notNull(),
})
```

The app's migration job runs **core's migrations first, then its own**:

```jsonc
// app package.json
"db:migrate": "govcore-migrate && drizzle-kit migrate"   // platform schema, then domain schema
```

Core emits the platform DDL; the app never writes or generates it. The app's Drizzle migrations only ever touch its *own* tables (they FK to core tables but don't create them). Because the platform DDL is authored once, in core, and shipped as immutable versioned files, **two consumer apps on the same `@govcore/schema` version have byte-identical platform schemas — the drift class is gone by construction, not by a test.**

### The tenancy column contract

Every tenant-scoped table — core's *and* the app's domain tables — must carry `organization_id uuid not null references organizations(id)`. Core publishes this as a documented contract plus a helper:

```ts
export const orgScoped = (orgs) => ({
  organizationId: uuid('organization_id').notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
})
```

So an app table becomes `pgTable('capabilities', { ...orgScoped(organizations), name: text(...) })`. Uniform tenant scoping is what makes the §7 query guards safe.

### What core-owned migrations buy — and the one wrinkle

- **No drift, and no conformance test to enforce it.** Because core authors the platform DDL, the app *can't* forget a column, weaken an FK, or skip the trigger — those statements live in core's migrations, not in app code. A lightweight `CORE_SCHEMA_VERSION` (written to `instance_settings` on boot) is still worth keeping for *observability* ("this instance runs platform schema vN"), but it is no longer load-bearing for correctness the way the earlier conformance test would have been.
- **The append-only audit trigger ships inside a core migration.** Drizzle doesn't manage triggers, but a raw-SQL migration step does. `audit-immutable.sql` (already idempotent in GovEA, #417) becomes a core migration, so immutability is guaranteed by the same mechanism as the tables — not a separate `apply-triggers` step the app might skip.
- **The pre-production wrinkle.** GovEA today runs `db:push --force` with *no* migration files (ADR-008) — its DB is throwaway pre-production. GovCore cannot work that way: a published library with external consumers and real tenant data is, by definition, past the throwaway stage, so **the platform layer is migration-based from day one.** An app may still `db:push` its *own domain* tables during its own pre-production phase, but it must run `govcore-migrate` for the platform tables. Put plainly: adopting GovCore is the event that trips AI-SESSION-START's "switch to migrations when the first real tenant exists" criterion — for the platform layer specifically. The extraction plan (§9) calls this out so it isn't a surprise.

---

## 6. The seams that make it reusable

The value isn't the tables — it's the **enforced patterns**. Each is exported as a factory or a typed helper so the app can't accidentally bypass it.

### 6.1 Active-organization resolution (the crown jewel)

`resolveActiveMembership` (GovEA `lib/active-membership.ts`) is the single server-side answer to "which org am I acting in right now," feeding the JWT and session. Its selection order (last-selected → primary → oldest active, ignoring revoked memberships) is exactly the kind of rule every multi-tenant app re-derives badly. Core owns it once.

### 6.2 The server-action tenant guard

GovEA's security model (security-and-tenancy.md §"Tenant Boundary") is a five-step pattern every mutating action must follow. Core ships it as a wrapper so it's the path of least resistance:

```ts
import { tenantAction } from '@govcore/nextkit'

export const renameCapability = tenantAction(
  { permission: 'content:edit' },
  async ({ ctx, db }, input) => {
    // ctx.organizationId + ctx.role already resolved from the ACTIVE membership,
    // never from caller-supplied values. Role gate already applied.
    const row = await db.query.capabilities.findFirst({
      where: and(eq(capabilities.id, input.id),
                 eq(capabilities.organizationId, ctx.organizationId)), // org filter enforced
    })
    // …mutate…
    await ctx.audit({ action: 'capability.rename', entityType: 'capability', entityId: input.id })
  },
)
```

This bakes in the four security design notes from GovEA: never trust caller-supplied `organizationId`/`role`, resolve role from active membership, load targets by `id` **and** `organization_id`, and write an audit event.

Two things to note about this wrapper:

- It **replaces real duplication.** Today each action file defines its own `requireContributor()` / `requireAdmin()` (e.g. `actions/capabilities.ts` lines 22–34) and repeats the `auth()` → redirect → role-check dance. `tenantAction` collapses ~40 copies into one.
- It is also the **transaction boundary** that makes database-enforced isolation possible: the wrapper opens the request transaction and sets the org GUC (`set_config('app.current_org', …, true)`) before invoking the handler, so the Row-Level Security policies in **§13.1** apply to every query inside. The `{ ctx, db }` handed to the handler is already scoped to the active org at the *database* level, not just by convention.

### 6.3 Middleware factory (edge-safe, ADR-0003 preserved)

```ts
// app: src/middleware.ts
import { createMiddleware } from '@govcore/middleware'
export default createMiddleware({
  publicPaths: ['/login', '/setup', '/error', '/maintenance'],
  instanceOnlyPaths: ['/instance'],
})
export const config = { matcher: [/* … */] }
```

Core's middleware is a **read-only token decode** (`getToken`, never `auth()`), never writes session cookies, and carries the resurrection guard (#782), maintenance redirect, and password-expiry routing. These are precisely the bugs ("rolled cookie overrides the logout deletion and loops") that you never want a second app to rediscover. The factory keeps the rules; the app only supplies its path config.

### 6.4 Auth.js config factory

Wraps the provider list, the Drizzle adapter, the SSO provisioning guard ("external identity must map to a pre-provisioned, active user with ≥1 active membership"), session lifecycle (rolling 24h JWT, login/logout audit events, logged-out marker), and the jwt/session callbacks that stamp `organizationId` + active `role`. Providers and secrets are injected by the app.

### 6.5 Audit writer + view

`ctx.audit(event)` from the action wrapper, plus a standalone `writeAuditLog(db, event)` for non-action paths and the instance audit telemetry view (IP/user-agent capture, failed-login aggregation, CSV export — #720). Cookie-clearing/security paths must never depend on the audit write succeeding (GovEA: "logout succeeds even if the audit write fails") — core preserves that.

### 6.6 Federation + support sessions

Federation: `org_connections`, `cross_org_links`, visibility resolution, and the rule that cross-org links must not become a back door around source visibility. Support: break-glass session issuance, act-as scoping (default 30-min TTL), and the guarantee that revoking a break-glass parent terminates dependent act-as behavior. Both ship with their schema definitions, migrations, and guard functions.

### 6.7 Accessible base theme (the WCAG floor)

Accessibility is a cross-cutting platform concern, not app branding, so the **base theme lives in core** and every consumer inherits a WCAG-AA-compliant starting point for free. Apps add brand themes *on top*; they cannot accidentally ship an inaccessible UI.

The model mirrors what GovEA already does (`lib/themes.ts` + `globals.css`), promoted into `@govcore/theme`:

- **Base layer (core, the floor).** A token set (CSS custom properties for `:root` light / `.dark`) chosen to meet **WCAG 2.x AA** contrast and focus-visibility, plus a Tailwind preset that maps to those tokens. This is the cascade base — anything an app omits inherits the accessible default.
- **Add-on layer (app, on top).** An app declares a theme that overrides **only brand vars** (header, primary, accent) — exactly GovEA's pattern, where the `govea`/`servicenow` themes override `--header-*` and let content tokens cascade from the base. Apps may not redefine the content/contrast tokens that hold the accessibility line.
- **Safe injection (security, from core).** Org/app theme values are **allowlisted before injection** into the inline `<style>` tag (#769), so a tenant-supplied color can't break out of the style context. This is a platform-security property and ships with the theme package, not the app.
- **Drift guard (core test).** Ship GovEA's theme/globals sync test (#766/#770) as `@govcore/theme/test`: it fails if an add-on theme silently re-declares a base token (which would let a stale copy negate later base fixes — including accessibility fixes).

```ts
// app: tailwind.config.ts
import { baseTheme } from '@govcore/theme'
export default { presets: [baseTheme], theme: { /* app brand extends, never lowers contrast */ } }
```

```ts
// app: register a brand add-on — overrides brand vars only
import { defineTheme } from '@govcore/theme'
export const acme = defineTheme({
  id: 'acme', name: 'Acme', extends: 'base',
  brandVars: { '--header-bg': '...', '--primary': '...' },  // validated against the allowlist
})
```

The contract in one line: **core owns the accessibility floor; apps decorate above it and can't dig below it.**

### 6.8 Tenant backup / restore to file

Whole-organization backup and restore is a platform concern, not a domain feature: it's about tenant data portability, public-records retention, and clean tenant export/import — the same for every app. So core owns the **engine**; the app owns only the **list of tables that participate**.

The subtlety: a full backup must include the app's *domain* data (capabilities, permits…), which core doesn't know about. Core solves this with a **registry**, consistent with the `orgScoped` contract — the app declares which of its tables are tenant data, and core's engine walks them filtered by `organization_id`:

```ts
// app: register domain tables into the backup engine (core tables are registered automatically)
import { registerBackupTables } from '@govcore/backup'
import { capabilities, goals, applications } from '@/db/schema'

registerBackupTables([capabilities, goals, applications])  // must be orgScoped
```

```ts
// produce / restore a portable, single-org archive
const archive = await exportOrganization({ db, organizationId, actor })   // → file (JSON/zip)
await importOrganization({ db, archive, actor, mode: 'new-org' | 'overwrite' })
```

What core guarantees, so the app doesn't reinvent it:

- **Org-scoped extraction** — only the target organization's rows leave; federation/cross-org links are exported as references, never as a back door around another org's visibility (§6.6 rule still holds). With RLS (§13.1) this stops being a hand-written `.filter()` per junction table (the current `lib/backup-export.ts` pattern) and becomes automatic.
- **Referential integrity + transactional restore** — restore runs in one transaction with FK ordering derived from the registry; a failed restore leaves nothing behind. *(Already true in GovEA today.)*
- **Audited** — restore already writes an audit event today; **export does not yet** (it only stamps `lastExportAt`). Core should audit both — see §13.5.
- **Versioned + integrity-checked format** — the archive should carry `CORE_SCHEMA_VERSION` (today it carries only `BACKUP_FORMAT_VERSION`), be **encrypted at rest**, and be **HMAC-signed** so a tampered archive can't be restored. These are hardening deltas, detailed in **§13.5** — not yet all present.

This is distinct from per-entity CSV import/export, which stays in the app (§2): CSV is "edit one entity type in a spreadsheet"; backup is "snapshot or move an entire tenant."

---

## 7. How a new app repo uses GovCore

This is the heart of the proposal: what does it actually look like for a brand-new app (call it **CivicTrack**) to be built on GovCore?

### The relationship between the repos

GovCore and the consumer app are **separate repos**. GovCore publishes versioned packages to a registry (npm, or a private GitHub Packages registry). The app declares them as dependencies — exactly like depending on `next` or `drizzle-orm`. There is no source coupling, no submodule, no copy-paste; the app pulls a pinned version and upgrades on its own cadence.

```text
┌──────────────────────────────────────────────────────┐
│  GovCore repo   github.com/roballred/GovCore           │
│                                                        │
│   packages/*  ──►  release (changesets, semver/pkg)    │
│   @govcore/schema, auth, tenancy, rbac, audit,         │
│   federation, support, middleware, theme, nextkit      │
│                                                        │
│   examples/minimal-app   (canary consumer, built in CI)│
└───────────────────────────┬────────────────────────────┘
                           │  publish
                           ▼
              ┌──────────────────────────────┐
              │   Package registry            │
              │   npm / GitHub Packages       │
              │   @govcore/*  @  x.y.z         │
              └───────┬───────────────┬───────┘
                      │ depends on    │ depends on
                      ▼               ▼
   ┌──────────────────────────┐   ┌──────────────────────────┐
   │  GovEA repo              │   │  CivicTrack repo         │
   │  (consumer zero)         │   │  (a future app)          │
   │                          │   │                          │
   │  @govcore/* : ^x.y.z     │   │  @govcore/* : ^x.y.z     │
   │  + EA domain             │   │  + permits / inspections │
   │    (capabilities, goals) │   │    domain                │
   └──────────────────────────┘   └──────────────────────────┘

Separate repos. The relationship is a normal pinned dependency —
no submodule, no copy-paste. Each app upgrades on its own cadence.
```

Both apps consume the *same* `@govcore/*` versions but own entirely different domains. GovEA models capabilities and goals; CivicTrack models permits and inspections — yet both get identical, hardened tenancy/auth/audit/accessibility for free.

### Schema composition — how core tables and app tables become one schema

Core **owns the platform tables and their migrations**; the app re-exports core's table definitions (for queries + FKs) and adds its own domain tables tenant-scoped via `orgScoped`. Two migration streams, one database (§5).

```text
  @govcore/schema                       CivicTrack: src/db/schema/index.ts
  ──────────────────────────            ──────────────────────────────────
  organizations  ───────────────────►  re-exported (core owns the DDL)
  users          ───────────────────►  re-exported
  memberships    ───────────────────►  re-exported
  audit_log      ───────────────────►  re-exported
  org_connections / cross_org_links ─►  re-exported

                                        + app's OWN domain tables:
                              ┌───────►  permits      ...orgScoped(organizations)
        organization_id FK ───┤
                              └───────►  inspections  ...orgScoped(organizations)

  MIGRATIONS (two streams, no overlap):
    govcore-migrate   ──►  creates/alters platform tables + audit trigger   (core owns)
    drizzle-kit migrate ►  creates/alters permits, inspections, …           (app owns)
                                                 │
                                                 ▼
                                        one PostgreSQL schema
```

### The wiring, end to end

```ts
// 1. package.json — depend on the published packages
//    "@govcore/schema": "^1.0.0", "@govcore/auth": "^1.0.0", … (peer: next, drizzle-orm, next-auth)

// 2. src/db/schema/index.ts — re-export core tables, add domain tables that FK to them
export * from '@govcore/schema'      // organizations, users, memberships, audit_log, …
import { organizations, orgScoped } from '@govcore/schema'
export const permits = pgTable('permits', { ...orgScoped(organizations), title: text('title') })

// 3. package.json — platform migrations (core-owned) run before domain migrations (app-owned)
//    "db:migrate": "govcore-migrate && drizzle-kit migrate"

// 4. src/lib/auth.ts — configure identity (inject providers + secrets)
export const { handlers, auth } = createAuth({ db, schema, providers: [/* OIDC */], ssoGuard })

// 5. middleware.ts — configure route protection
export default createMiddleware({ publicPaths: ['/login'], instanceOnlyPaths: ['/instance'] })

// 6. tailwind.config.ts — inherit the WCAG-AA floor, add brand on top
export default { presets: [baseTheme], theme: { extend: { /* CivicTrack brand */ } } }

// 7. src/lib/backup.ts — register domain tables into core's tenant backup engine
registerBackupTables([permits, inspections])

// 8. a domain action — tenancy + RBAC + audit enforced by the wrapper
export const createPermit = tenantAction({ permission: 'content:create' },
  async ({ ctx, db }, input) => { /* ctx.organizationId already resolved & trusted */ })
```

### What the app author writes vs. inherits

| The app **writes** | The app **inherits from GovCore** |
|---|---|
| Domain tables (permits, inspections…) + their migrations | orgs, users, memberships, audit, federation, support tables **+ their migrations** |
| Domain server actions & UI | Identity (local + OIDC), org switching, session lifecycle |
| Brand theme (palette, logo) | WCAG-AA accessibility floor, safe theme injection |
| The list of domain tables to back up (`registerBackupTables`) | Tenant backup/restore-to-file engine (org-scoped, transactional, audited) |
| Provider secrets + path config | RBAC, active-org resolution, audit (append-only), middleware, break-glass/act-as |

Steps 2–8 are **configuration and composition, not reimplementation** — that is the entire value proposition. A secure multi-tenant skeleton stands up in well under a day; the app author spends their time on the domain, never on "how do I isolate tenants," "is my logout actually safe," or "did my tenant export leak another org's data."

### Upgrading

Because GovCore is semver'd, the app bumps `@govcore/*` like any dependency. A **minor/patch** bump is `pnpm up`. A **major** bump means a core schema changed (§8): the app bumps the version and runs `govcore-migrate`, which applies the new core-authored platform migrations (the app writes no DDL for them). The app upgrades when *it* chooses — GovEA and CivicTrack are never forced to move in lockstep, and because core owns the migrations there is no schema to reconcile by hand.

---

## 8. Versioning and release

- **Changesets** for independent semver per package.
- **Schema is the sharp edge.** Because core owns the platform migrations, any change to a core table's columns/constraints ships *as a migration* and is a **breaking change** for consumers. Encode this in policy: column add/remove/retype on a core table ⇒ **major** bump, with the migration included in the release; consumers apply it via `govcore-migrate`. The `CORE_SCHEMA_VERSION` constant moves with it. Backward-compatible, additive migrations (new nullable column, new table) may be **minor** — but anything that requires data backfill or breaks an existing query is **major**.
- **Edge-safety is a release gate.** CI must assert `@govcore/{schema,rbac,middleware}` import cleanly in an edge runtime (no `node:` builtins, no DB client). A regression here silently breaks every consumer's middleware.
- **The `examples/minimal-app` fixture** is the canary — it's built and e2e-tested in core's CI on every release, so "does a real consumer still compile and pass auth/tenancy smoke tests" is answered before publish, not after.

---

## 9. Extraction plan (phased, strangler-style)

GovEA stays shippable throughout; nothing is a big-bang rewrite. GovEA is consumer zero — it adopts each package as it lands, which validates the seam before any second app exists.

> **Local-env caveat (GovEA memory):** there's no local Postgres/Docker on the maintainer machine; DB-backed integration tests run in CI. So each phase's verification leans on CI, and the migration + edge-safety tests must run green in CI before a package is cut.

**Phase 0 — Stand up the repo (no behavior change).**
New `GovCore` repo, package skeletons, changesets, CI (typecheck/lint/edge-safety/example build). Promote the *already-shared* `@govea/core/rbac` into `@govcore/rbac` first — it's the lowest-risk move (pure, no DB, already a single source of truth with an enforcing test). Do the **`createRbac` parameterization (§13.3)** as part of this promotion: ship the generic factory with GovEA's map as the default, so the `rbac-single-source` test stays green and the package is reusable from day one rather than re-opened later.

**Phase 1 — Schema package + platform migrations.**
Move `schema/{organizations,users,audit,federation,break-glass-sessions,act-as-sessions}.ts` table definitions into `@govcore/schema`, and author the **initial platform migration** (`0000_platform_init`) plus the `audit-immutable.sql` trigger migration and the `govcore-migrate` runner. GovEA re-exports the core tables (§5) and switches its platform tables from `db:push` to `govcore-migrate`; its domain tables can stay on `db:push` for now. **This is the migration-cutover moment for the platform layer** — flag it against ADR-008's "switch when the first real tenant exists" criterion. **It is also where the §13 database hardening lands** (RLS policies, the `govcore.*` schema namespace, and the two-role owner/runtime split) — **decided 2026-06-21** (§1). The schema is authored from scratch here, so RLS + `FORCE ROW LEVEL SECURITY` go in now rather than as a retrofit. Verify: GovEA CI green, `govcore-migrate` builds the platform schema from clean, audit trigger present, RLS denies a cross-org read in an integration test.

**Phase 2 — Audit + tenancy.**
Move the audit writer/view and `resolveActiveMembership` + membership guards. GovEA's `lib/*` become thin re-export shims (same pattern as today's `lib/rbac.ts` → `@govea/core`). Verify: existing audit + multi-org integration tests pass unchanged.

**Phase 3 — Auth + middleware.**
The riskiest move (the security edge cases live here). Extract `createAuth` and `createMiddleware`, preserving ADR-0003, #782, #720, #759, #807 behaviors. Verify: full e2e auth/logout/resurrection/maintenance suites pass. Do this phase behind the highest review scrutiny — it carries the security edge cases.

**Phase 4 — Federation + support + backup + theme + nextkit.**
Extract federation, break-glass/act-as, the tenant **backup/restore engine** (`@govcore/backup`) with its domain-table registry, the `tenantAction` wrapper, and the WCAG-AA base theme (`@govcore/theme`) with the allowlist + drift-guard test. GovEA registers its EA entity tables into the backup engine and verifies an export/restore round-trip matches the pre-extraction behavior. Migrate GovEA's domain actions onto `tenantAction` incrementally (they keep working via shims until migrated). GovEA's `govea`/`servicenow` themes become app-level add-ons on the core base. Theme extraction is low-risk and could be pulled earlier (pure tokens + a security helper, no DB) if wanted as an early demonstrable win.

**Phase 5 — Cut 1.0 and stabilize.**
GovCore is a separate repo from Phase 0 (decision §11.5), so GovEA consumes `@govcore/*` from the registry throughout — as `0.x` prereleases during active extraction. Phase 5 is the point where the API has settled: publish `1.0.0`, move GovEA's dependency ranges from `0.x` prereleases to pinned `^1.0` versions, and retire the old `@govea/core`. No repo split happens here because there was never a temporary monorepo to split.

Each phase is independently shippable and reversible (revert the shim, keep the app code).

---

## 10. Risks and trade-offs

| Risk | Severity | Mitigation |
|---|---|---|
| **Core migration tooling forced on consumers** (the cost of "core owns migrations") | Medium (accepted) | `govcore-migrate` must coexist cleanly with the app's own Drizzle migrations — separate journal (`__govcore_migrations`), documented ordering (`govcore-migrate && drizzle-kit migrate`). This is the deliberately-chosen trade for zero drift |
| **A core platform migration breaks a consumer on upgrade** | Medium | Major-version gating for any non-additive change (§8); migrations tested against `examples/minimal-app` in core CI before publish; additive-only where possible |
| **Opinionated coupling** locks out non-stack apps | Medium (accepted) | Explicit, locked decision. Revisit only if a real non-Next consumer appears (§11) |
| **Edge-safety regressions** break all consumers' middleware silently | High | Edge-import CI gate; keep `schema` (defs), `rbac`, `middleware` DB-free; the migrate runner is a separate non-edge entrypoint |
| **Security edge cases lost in extraction** (#782/#720/#807, ADR-0003) | High | Phase 3 under the highest review scrutiny; port the existing e2e suites *with* the code; don't rewrite, relocate |
| **Backup engine leaks cross-org data** | High | Org-scoped extraction tested explicitly; federation links exported as references only (§6.8); restore round-trip test in Phase 4 |
| **Cross-repo release friction** slows GovEA (two repos from day 1, §11.5) | Medium (accepted) | Iterate without publish-per-change using a local registry (Verdaccio) or `pnpm` `link:` / `yalc` overrides during active extraction; cut `0.x` prereleases from GovCore CI so GovEA always consumes a registry version, not a working copy. The two-repo overhead is the accepted cost of treating GovCore as a standalone initiative |
| **Public-repo / operator-secret leakage** carried into a new repo | Medium | Keep config injected, never hard-coded (§4). Add the same "no operator identifiers in source" lint GovEA relies on |
| **Generality built before it's earned** (no second consumer yet) | Medium | Extract only proven code; `examples/minimal-app` is the only "second consumer" until a real one exists |

---

## 11. Open questions / decisions still needed

1. **~~Final package scope/name?~~ Resolved:** the initiative and repository are named **GovCore**, packages published under the **`@govcore/*`** scope. (Individual package names within that scope remain a tunable implementation detail, not an open question.)
2. **~~Reconsider DB ownership?~~ Resolved:** core owns the platform tables and their migrations (decision locked §1). The migrate-tooling cost is accepted.
3. **~~Backup archive format?~~ Resolved: JSON for now.** The archive is plain JSON to start (matching today's exporter). Encryption-at-rest, HMAC signing, and `CORE_SCHEMA_VERSION` binding (§13.5) are applied as *wrappers around* the JSON, not a different format; compression/zip can come later if size warrants. Still a Phase 4 design detail: how `registerBackupTables` orders app tables that reference *other* app tables for restore (FK ordering).
4. **~~Content engine later?~~ Resolved (2026-06-21): BUILD IT — full engine, comprehensive.** GovCore builds `@govcore/content` to compile type definitions into real Drizzle tables (not an EAV blob), with relationships, computed fields, and per-type code hooks as first-class, aiming to model every content type over time. Built as the **second milestone**, after the platform-plane v1, and proven on one rich entity (Capability) before migrating the rest. **See [Appendix B](#appendix-b--the-content-engine-committed-design) for the committed design and how it avoids the inner-platform-effect.**
5. **~~Monorepo-then-split vs. two repos from day one?~~ Resolved: split from day 1.** GovCore is its own repository from Phase 0 — no temporary monorepo. GovEA consumes `@govcore/*` from the registry (prereleases during active extraction) rather than via `workspace:*`. See the updated §9 Phase 5 and §10.
6. **~~Instance-console UI?~~ Resolved: reusable React.** Core ships the instance-admin surface (memberships, break-glass approval, audit telemetry) as **reusable React components** in `@govcore/nextkit`, not just headless logic — a consumer gets working instance-console screens out of the box and themes them via the §6.7 base theme.
7. **~~License?~~ Resolved: MIT.** GovCore is MIT-licensed, same as GovEA.
8. **~~Adopt RLS + two-role DB?~~ Resolved (2026-06-21): ADOPTED** at the Phase 1 cutover (§13.1–13.2, locked in §1). Remaining sub-decisions for Phase 1 design: exact RLS policy for the cross-org support paths (break-glass/act-as must bypass the org GUC at one audited choke point) and the connection-role wiring for `govcore-migrate` vs. runtime.
9. **~~Parameterize RBAC?~~ Resolved (2026-06-21): ADOPTED** — generic `createRbac` with GovEA's map as default (§13.3, locked in §1).

---

## 12. Next steps and Phase 0–1 work breakdown

GovCore is a **standalone initiative**: its own repository, backlog, versioning, and release lifecycle, independent of GovEA's milestones and issue tracker. GovEA is the *first consumer* and the source the platform code is extracted from — it is not the owner, and GovCore work is **not** filed on GovEA's roadmap. Until the GovCore repository is stood up, **this document is the single planning record**: the work breakdown below lives here, not as issues or milestones elsewhere.

Binding decisions are recorded in this document (the §1 decisions table and the §13 resolutions). References to existing GovEA ADRs (ADR-0003, ADR-008, ADR-0002) are **provenance** — behavior the extraction must preserve — not new artifacts; GovCore will keep its own ADRs once its repo exists.

### Phase 0 — repo skeleton + generic RBAC

- [ ] Stand up the GovCore repository: package skeletons, changesets, CI (typecheck, lint, edge-safety import gate, `examples/minimal-app` build).
- [ ] Ship `@govcore/rbac` as a **generic `createRbac`** factory (§13.3); GovEA's `admin/contributor/viewer` map is the default export.
- [ ] GovEA consumes `@govcore/rbac`; the `rbac-single-source` test stays green (one definition, now produced by `createRbac(...)`).

**Done when:** `@govcore/rbac` is generic, GovEA builds on it with no behavior change, and `examples/minimal-app` compiles in CI.

### Phase 1 — platform schema + migrations + RLS + two-role DB

- [ ] `@govcore/schema`: platform table defs in a dedicated `govcore` Postgres schema namespace (§13.4); dependency-free / edge-safe export.
- [ ] `0000_platform_init` migration, the `audit-immutable` trigger as a raw-SQL migration step, and a `govcore-migrate` runner with a `__govcore_migrations` tracking table.
- [ ] **RLS** policies + `FORCE ROW LEVEL SECURITY` on platform tables; transaction-local org GUC plumbed through the tenant transaction (§13.1).
- [ ] **Two-role DB**: owner/DDL role for `govcore-migrate`, non-owner runtime role for the app (§13.2).
- [ ] GovEA re-exports core tables and switches its **platform** tables from `db:push` to `govcore-migrate` — the ADR-008 cutover for the platform layer (§5). Domain tables may stay on `db:push` for now.

**Done when (verified in CI — no local Postgres):** `govcore-migrate` builds the platform schema from a clean database; the audit trigger blocks `UPDATE`/`DELETE`; an integration test proves **RLS denies a cross-org read**; GovEA CI stays green.

### Provenance (where the Phase 0–1 code comes from)

The extracted code derives from GovEA's IAM and Multi-Org capability areas — `iam-role-based-access-control`, `iam-audit-trail`, `iam-local-authentication`, `iam-instance-administration`, `mo-org-connections`, `mo-content-visibility`. This is recorded as provenance for the extraction, **not** as GovEA-issue traceability; GovCore carries its own capability/traceability model once its repo exists.

### Later phases

Phases 3–4 (auth + middleware; federation, support, backup, theme) and Phase 5 (publish `1.0`, stabilize the API) are outlined in §9; each gets its own work breakdown **in this document** when its turn comes.

**GovCore's second milestone — the content engine (`@govcore/content`)** — begins only after the platform-plane v1 (Phases 0–5) is stable, since it depends on `schema`/`tenancy`/`rbac`/`audit`/`server`. Its committed design, de-risking rules, and validated sequencing (spike on one rich entity first) are in Appendix B. It is **not** folded into the platform phases above.

---

## 13. Hardening the design — elegance upgrades

These upgrades came out of a **code-level** review (not just the doc). Each is grounded in something the current GovEA code actually does, and each is written as a *method* — how to build it — not just a principle. Listed in priority order.

### 13.1 Database-enforced tenant isolation (Postgres Row-Level Security)

**The problem, grounded in real code.** Today the organization boundary is enforced in *application logic*, not in the query. Two verified examples:

- `actions/capabilities.ts → getCapability` loads `db.query.capabilities.findFirst({ where: eq(capabilities.id, id) })` — **no `organization_id` filter** — and only afterward calls `canReadFederatedEntity(...)` to decide visibility. The row crosses the tenant boundary into app memory; a human-written follow-up check is what keeps it safe.
- `lib/backup-export.ts → collectContent` fetches junction tables with `db.query.<junction>.findMany({})` — **every org's rows** — then removes other orgs' rows with a hand-written `.filter(r => capIds.has(...))`. Forget one filter and the export leaks cross-org links.

These are correct *today* only because someone remembered the second step. That is exactly the class of bug a reusable framework should make structurally impossible.

**The method.**

- Put core tables (and every `orgScoped` app table) behind an RLS policy:
  `USING (organization_id = current_setting('app.current_org')::uuid)`.
- `tenantAction` (§6.2) opens a transaction and sets the org as a **transaction-local** GUC before running the handler:
  `select set_config('app.current_org', $orgId, true)` — the `true` scopes it to the transaction. Every DB op in the handler then runs under that setting, so a query that *forgets* the `WHERE organization_id = ?` still returns only the active org's rows.
- **Why transaction-local, specifically:** verified that GovEA connects via `postgres-js` with a small direct pool (`max: 5`), not a transaction-mode pooler. A session-level `SET` would bleed across pooled requests sharing a connection — so the GUC **must** be `SET LOCAL` / `set_config(..., true)` inside the request's transaction. This is why tenant DB access routes through the action's transaction.

**The honest cost.** This commits the codebase to a rule: *all tenant-scoped DB access happens inside a tenant transaction.* Reads done outside a transaction today (`db.query…findFirst`) must move onto the request transaction to be protected. It is a real architectural commitment, not a free toggle — which is why adoption is a decision, not a default (see end of section).

### 13.2 Two Postgres roles — the thing that makes RLS *and* the audit trigger real

**The problem.** GovEA connects with a single role (one `DATABASE_URL`). Two consequences: RLS does **not** apply to a table's owner, and the audit-immutability trigger (#417) can be **dropped** by the owner. A single all-powerful role undercuts both protections.

**The method.** Split into two Postgres roles:

| Role | Used by | Privileges |
|---|---|---|
| **Owner / DDL** | `govcore-migrate` (the migration runner) | Owns `govcore.*`, creates/alters tables, installs the audit trigger and RLS policies |
| **Runtime / DML** | the app at request time | Non-owner; `ALTER TABLE … FORCE ROW LEVEL SECURITY` makes RLS bind to it; can INSERT/SELECT (and UPDATE/DELETE where allowed) but **cannot** drop the audit trigger or bypass RLS |

Net effect: a compromised *app* role cannot rewrite audit history (already true via the trigger), cannot read another org's rows (new, via RLS), and cannot disable either protection (new, via non-ownership). The migration runner's elevated privilege is bounded to migration time.

### 13.3 Parameterize RBAC over an app-supplied role/permission map

**The problem, grounded.** `@govea/core/rbac` hardcodes `type Role = 'admin' | 'contributor' | 'viewer'` and a fixed seven-permission map. §2 of this doc files RBAC as "already shared, just promote it" — but that ships *GovEA's domain vocabulary* to every consumer. CivicTrack's `inspector` role has nowhere to go. This is the difference between "reusable" and "GovEA with extra steps."

**The method.** Core ships the *machinery* generic over the app's own types:

```ts
// @govcore/rbac
export function createRbac<R extends string, P extends string>(def: {
  rolePermissions: Record<R, P[]>
  hierarchy: Record<R, number>
}) {
  return { hasPermission, roleAtLeast, roleIsAdmin /* … all typed to R, P */ }
}
```

GovEA's current map becomes the default export and the worked example:

```ts
export const goveaRbac = createRbac({ rolePermissions: GOVEA_ROLE_PERMISSIONS, hierarchy: GOVEA_HIERARCHY })
```

Zero behavior change for GovEA, and the existing `rbac-single-source` integration test still passes — GovEA still has exactly one definition, now produced by `createRbac(...)`. `tenantAction({ permission })` and the separate `instanceRole` check stay; `permission`/`role` simply become the app's unions.

### 13.4 Composition & developer-experience methods

- **One validated config object.** Replace scattered `process.env` reads (the §4 examples still do `Number(process.env.TRUSTED_PROXY_HOPS ?? 1)` inline) with a single `defineGovCoreConfig(env)` validated by Zod at boot — fail-fast on a missing `AUTH_SECRET` or malformed value, and one place to enforce the "no operator identifiers in source" lint. Pass the result to every factory.
- **Split the crown-jewel seam out of the god-package.** `tenantAction` only needs tenancy + rbac + audit, but §3 currently parks it in `@govcore/nextkit`, which depends on *everything*. Extract a lean **`@govcore/server`** (action context + `tenantAction` + the tenant transaction from 13.1) and leave `@govcore/nextkit` for UI primitives. This is also where the per-file `requireContributor` / `requireAdmin` helpers — duplicated across ~40 action files today — collapse into one wrapper.
- **Show how one typed `db` is composed.** Core exports its tables *and* Drizzle `relations()` as spreadables; the app does `const schema = { ...coreSchema, ...appSchema }; export const db = drizzle(client, { schema })`. Drop `export * from '@govcore/schema'` (collision-prone; the `govcore.*` Postgres-schema namespacing below removes the need for it).
- **`govcore.*` Postgres schema namespacing.** Put core tables in a dedicated Postgres schema (`pgSchema('govcore')`) and app tables in `public`. Two migration streams become physically namespaced, `__govcore_migrations` lives in `govcore`, ownership is self-evident, and an app is free to have its own `sessions`/`accounts`/`users` table without colliding with core.
- **A `@govcore/testing` package.** Ship `createTestOrg`, `createTestUser`, `withActiveMembership`, plus a CI/testcontainers recipe (matching the verified no-local-Postgres reality). Without this, "stand up an app in a day" excludes writing a single integration test — which is where consumers will actually spend their time.

### 13.5 Backup engine hardening — reconciled with what GovEA already does

Reading `lib/backup-export.ts`, `lib/backup-import.ts`, and `actions/backup.ts` showed the current engine is **stronger than §6.8 implied in some ways and weaker in others.** Reconciled:

**Already true (keep, don't reinvent):** admin-only + typed `RESTORE` confirm token + 50 MB guard; deliberate secret excludes (`passwordHash`, SMTP creds, sessions/break-glass/act-as, notifications); **transactional restore**; **restore writes an audit event**; same-org-only with UUIDs preserved (destination wiped first); cross-org links cleared on import (federation is not a restore back door).

**To ADD in core (the real deltas):**

- **Audit the *export* too.** Today only *restore* is audited; export merely stamps `organizations.lastExportAt`. A full-tenant export is at least as security-relevant as a restore.
- **Encrypt at rest + signed, expiring download URLs.** A whole-org archive is the single juiciest exfiltration artifact in the system; it currently serializes as plain `JSON.stringify(..., null, 2)`.
- **Integrity signature (HMAC).** So a tampered archive cannot be restored.
- **Bind the archive to the platform schema version.** It carries `BACKUP_FORMAT_VERSION` but not `CORE_SCHEMA_VERSION`; restore should refuse or migrate an archive from an incompatible platform schema.
- **Registry-driven scoping replaces the hand-written junction `.filter()`.** With `registerBackupTables` (§6.8) *plus* RLS (13.1), an unscoped fetch already returns only the active org — the leak-prone manual filter disappears.
- **Design the future cross-org migration path with RLS on.** Cross-org restore (UUID remap) is explicitly future work in the code; that is exactly where server-side org re-derivation becomes security-critical.

### 13.6 Fix-forward during extraction — don't carry debt into the reusable core

- **CSP enforcement.** Verified: GovEA ships CSP in **report-only** mode in `next.config.ts` (#743; enforcement tracked as #765). Relocating the security layer into core is the moment to land **nonce-based enforced CSP** in `@govcore/middleware` + a `next.config` headers preset, so consumer #2 inherits the enforced end-state rather than GovEA's in-flight debt. (Note: the response headers live in `next.config.ts`, not `lib/security-policy.ts` — §2's route-protection row is corrected accordingly.)
- **MFA for local credentials** (#761) as a first-class `@govcore/auth` capability.
- **Supply chain.** `@govcore/*` becomes a dependency of every consumer's production tenant-data path, so a poisoned release is a fleet-wide incident: require npm provenance / sigstore, CI-only publishing, maintainer 2FA, and the dependency/code scanning GovEA already tracks (#762).

### Decisions (resolved 2026-06-21)

Both were taken in favor of the recommendation and are now in the locked-decisions table (§1):

1. **RLS + two-role DB — ADOPTED**, at the Phase 1 schema cutover (§13.1–13.2). Accepted cost: all tenant-scoped DB access runs inside a tenant transaction; the database is provisioned with an owner/DDL role and a non-owner runtime role.
2. **Generic `createRbac` — ADOPTED** (§13.3). Core ships the parameterized factory with GovEA's map as the default export.

---

### Appendix A — File-by-file extraction inventory

| GovEA path | → Target package | Phase |
|---|---|---|
| `packages/core/src/rbac` | `@govcore/rbac` | 0 |
| `src/db/schema/organizations.ts`, `users.ts`, `audit.ts`, `federation.ts`, `break-glass-sessions.ts`, `act-as-sessions.ts`, `instance-settings.ts`, `platform-config.ts` | `@govcore/schema` (defs **+ migrations + `govcore-migrate`**) | 1 |
| `src/db/sql/audit-immutable.sql` | `@govcore/schema` (as a core migration) | 1 |
| `lib/audit.ts`, `lib/audit-view.ts` | `@govcore/audit` | 2 |
| `lib/active-membership.ts`, `lib/membership-guards.ts`, `lib/membership-sync.ts`, `actions/active-org.ts`, `actions/memberships.ts` | `@govcore/tenancy` | 2 |
| `lib/auth.ts`, `lib/auth.config.ts`, `lib/sso-guard.ts`, `lib/password.ts`, `lib/logout-marker.ts`, `lib/auth-redirect.ts` | `@govcore/auth` | 3 |
| `middleware.ts`, `lib/request-context.ts`, `lib/security-policy.ts` | `@govcore/middleware` | 3 |
| `lib/federation.ts`, `lib/cross-org-link-helpers.ts`, `actions/connections.ts`, `actions/cross-org-links.ts` | `@govcore/federation` | 4 |
| `lib/break-glass.ts`, `lib/act-as.ts`, `lib/instance-admin.ts`, `actions/act-as.ts` | `@govcore/support` | 4 |
| `lib/backup-export.ts`, `lib/backup-import.ts`, `actions/backup.ts` | `@govcore/backup` (engine + registry; app registers domain tables) | 4 |
| `lib/themes.ts` base tokens + `globals.css` base layer + allowlisting (#769) + drift-guard test (#766/#770) | `@govcore/theme` | 4 |
| `lib/rbac.ts` (user-shaped wrappers) + a `tenantAction` wrapper (new) | `@govcore/nextkit` | 4 |
| `govea` / `servicenow` theme defs (brand add-ons) | **stays in GovEA** (layer on core base) | — |
| Everything under `business-architecture/` domain + EA entity schema/lib/actions | **stays in GovEA** | — |

*Paths relative to `apps/govea/src/` unless noted.*

---

### Appendix B — The content engine (committed design)

This appendix explains, from first principles, what a "content engine" is, why GovEA already has the seeds of one, and — now that the decision is **to build it** — how to build it so it doesn't collapse into the failure mode generic content engines are famous for. It's longer and more plain-spoken than the rest of the doc on purpose.

> **Decision (2026-06-21):** GovCore **builds the full content engine** (`@govcore/content`) and pursues **comprehensive coverage** — the goal is that every content type, including the relational EA entities, can eventually be expressed through it. This reverses the earlier "park it" recommendation. The design below is shaped entirely around keeping that ambition out of the inner-platform-effect ditch.

#### Start with the problem it would solve

Think about what it takes to add a single entity type to GovEA today — say, **Capabilities**. Someone has to write, by hand:

- a **database table** (`capabilities`, with its columns and the `organization_id` tenant scope),
- a **validation schema** (a Zod object saying "name is required text, description is optional, owner points at a person"),
- **server actions** for create / edit / delete / publish,
- a **form** to fill it in, and a **list view** and a **detail view** to read it back,
- the **lifecycle** rules (a draft can be published, a published thing can be archived),
- and the **classification** hooks (which taxonomy or framework bucket this capability belongs to).

Now notice: when the next entity type arrives — **Goals**, then **Applications**, then **Services**, then **Principles** — you write *the same skeleton again*. The fields differ, but the shape ("a thing with some fields, that belongs to an org, that has a draft/published lifecycle, that can be filed under a taxonomy") is nearly identical every time. That repetition is the itch a content engine scratches.

#### What a content engine actually is

A content engine flips the model from **"hand-code each type"** to **"describe each type as data, and let the engine do the rest."**

Instead of writing a table + schema + form + actions for Capabilities, you'd write a small *description*:

```ts
defineContentType({
  name: 'capability',
  label: 'Capability',
  fields: [
    { name: 'name',        type: 'text',     required: true },
    { name: 'description', type: 'textarea' },
    { name: 'owner',       type: 'reference', to: 'person' },
    { name: 'domain',      type: 'taxonomy',  tree: 'architecture-domains' },
  ],
})
```

…and the engine reads that description and **automatically provides** the storage, the validation, the create/edit/list/detail screens, the draft→published→archived lifecycle, and the taxonomy filing. Adding a new type becomes *configuration*, not a code change plus a migration plus a pull request.

If you've used a **headless CMS** — Contentful, Sanity, Strapi — or even WordPress "custom post types," this is the same idea: define content models as data, get the plumbing for free. The difference is that here it would be a built-in, multi-tenant, audited part of the platform rather than a separate hosted service.

#### GovEA already has the four seeds of it

This isn't hypothetical — the current `packages/core` (the skeletal `@govea/core`) already contains stub versions of the four pieces a content engine needs:

| Stub (today) | What it is | Role in a content engine |
|---|---|---|
| **content-types** (`ContentTypeRegistry`) | "register a type as a list of fields" | The *describe your type as data* part — the heart of the engine |
| **workflow** (`draft → published → archived`) | a tiny state machine with allowed transitions | The shared *lifecycle* every content type reuses |
| **taxonomy** (`buildTree`) | turns a flat list of nodes into a hierarchy | The shared *classification* any type can be filed under |
| **recipes** (`applyRecipe`, a TODO today) | "install a JSON-described bundle of config + seed data" | Pre-packaged sets of types + starter content you can *install* |

So the engine's skeleton is already sketched; what's missing is the substantial work of turning four stubs into a real, safe, queryable system.

#### Why it would be genuinely valuable for GovEA

GovEA's whole framework story is *already* leaning this direction. [ADR-0002 ("ADM as classification")](../decisions/0002-adm-as-classification.md) decided that supporting TOGAF is **not** a hard-coded overlay — installing the **TOGAF recipe** simply gives an organization a set of taxonomy classifications, and the TOGAF reports read from that taxonomy. That is a content-engine move in miniature: a framework becomes *data you install*, not *code you ship*.

A real content engine generalizes that pattern. A new framework, a new entity type, or a tenant-specific custom record would become a recipe + a content-type definition — installable per organization, with no migration and no deploy. For a product whose job is "model whatever an agency needs to model," that flexibility is strategically valuable.

#### The honest risk, named

"Full engine" + "model everything" is the most ambitious pair of choices on the menu, and the failure mode is real: a generic engine that becomes a *worse* Postgres/Drizzle/React than the ones underneath it (the **inner-platform effect**), with GovEA's most valuable logic — the traceability chain (Goals → Objectives → Initiatives → Capabilities → Applications), completeness scoring, impact analysis — bent painfully through a registry that fights it. The industry is littered with half-built CMSes that became the most painful code in the system. The entire design below exists to make that failure mode hard to fall into. Three rules do most of the work.

#### Rule 1 — compile to real tables, never an EAV blob

The classic content-engine mistake is storing everything generically — rows in an `entity_values(entity_id, field_name, value)` table, or one big JSONB column. It "works" in a demo and then every query, index, and foreign key becomes agony, and RLS (§13.1) can't protect a soft schema cleanly. **GovCore does the opposite: a content-type definition is *compiled* into a real Drizzle table + a real core migration** — real columns, real types, real indexes, real FKs, real `organization_id` scope. The engine is a *code/DDL generator over the stack we already trust*, not a runtime interpreter over a soft schema. `defineContentType('capability', …)` produces a `capabilities` table indistinguishable from one a human would have hand-written; the engine just writes it (and its migration) for you.

Consequence, and it's a feature: type definitions join the **migration stream**. Adding a field is a generated migration applied by `govcore-migrate` (§5), not a silent runtime change — the audited, versioned schema story stays intact, and RLS applies to engine tables exactly as it does to hand-written ones.

#### Rule 2 — relationships and computed fields are first-class

"Model everything" only works if the engine can express what makes GovEA *rich*, not just flat:

- **Typed relationships** — `reference` (to-one) and `link` (to-many through a generated junction) as first-class field types, so the traceability chain is *declared*, not hand-joined. The engine generates the junction tables and typed query helpers.
- **Computed / derived fields** — completeness scores, confidence, roll-ups: declared as derived fields backed by a pure function the engine calls, materialized or computed-on-read as configured. The engine owns the recompute/cache plumbing (the snapshot machinery GovEA already hand-rolls), so no app reinvents it.

#### Rule 3 — a per-type escape hatch to real code

The engine generates the 80% — storage, validation, CRUD `tenantAction`s, lifecycle, list/detail UI. The remaining 20% that makes GovEA more than a spreadsheet — impact analysis, duplicate detection, debt classification, publish-readiness gates — plugs in as **typed hooks** (`beforePublish`, `afterChange`, custom server actions, custom report queries) running real server code with the real `db`. The engine never has to *become* the place that logic lives; it just needs a clean seam for it. **That seam is the difference between a tool and a cage.**

#### Package shape

`@govcore/content`, layered *above* the platform plane:

- **Depends on** `schema`, `tenancy`, `rbac`, `audit`, `server` — so every engine-defined type is automatically tenant-scoped (RLS), permission-checked, and audited like everything else; generated actions are `tenantAction`s (§6.2) and generated screens use `@govcore/nextkit` + the base theme (§6.7).
- **Provides** the type registry, the definition→table **compiler** (emitting core migrations), validation derived from definitions, the draft→published→archived lifecycle (promoted from the `workflow` stub), taxonomy binding (the `taxonomy` stub), generated CRUD actions + React screens, and **recipes** (the `applyRecipe` stub made real) so a bundle of types + seed content + framework classifications is installable per organization — the direct continuation of ADR-0002.
- The four stubs in today's `packages/core` are the **starting point**, not throwaway.

#### Sequencing — comprehensive is a destination, reached by validated steps

"Model everything" is the goal; the *path* is incremental, because betting GovEA's hardest entities on an unproven engine is exactly how this goes wrong:

1. **Spike on one rich entity first.** Before migrating anything, prove the engine can express **Capability** end to end — its relationships, its completeness computed field, and a publish-gate hook — and that the generated table and queries are indistinguishable from the hand-written ones. If the engine can model a Capability cleanly, it can model the rest; if it can't, we learn that cheaply, on one entity, before committing.
2. **Migrate the simple long-tail** (glossary, principles, notices) to harden the generators in production.
3. **Migrate the relational entities** (the traceability chain) once relationships + computed fields + hooks are proven by step 1.
4. **Recipes last**, turning the framework story (TOGAF, etc.) into installable per-org bundles.

This is a **separate workstream from the platform extraction (§9) and depends on it** — `@govcore/content` needs `schema`/`tenancy`/`rbac`/`audit`/`server` to exist first. It therefore starts **after** the platform-plane v1 (Phases 0–5) is stable, and is tracked as GovCore's **second major milestone**, not a side-quest folded into Phase 4.

#### One-line summary

**Build `@govcore/content` as a real type-definition→Drizzle compiler (not an EAV interpreter), with relationships, computed fields, and per-type code hooks as first-class — then reach "model everything" by proving it on one rich entity before migrating the rest.**
