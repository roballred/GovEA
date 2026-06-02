# GovEA — Project Instructions for Claude

> **Start here for any new AI session:** [`docs/AI-SESSION-START.md`](./docs/AI-SESSION-START.md) is the canonical session-bootstrap doc. It points at every other source of truth (Standards.md, this file, STYLE.md, README.md, product-priorities.md, the risk register, the validation plan) and captures the operating policies that drift &mdash; database workflow, GitHub CLI gotchas, deploy / mutating-`az` rules, and the public-repo policy on operator-specific deployment topology.
>
> **Governing document:** [Standards.md](./Standards.md) defines the principles, workflow, and traceability requirements for all AI-assisted work on this project. This file extends those standards with Claude-specific context. If anything here conflicts with Standards.md, Standards.md governs.

## What This Is

GovEA is a free, open source enterprise architecture tool built specifically for state and local government.

Built on the [EasyEA](https://github.com/roballred/EasyEA) methodology — people-centered, lightweight, designed for everyday work rather than compliance theater.


---


## EasyEA Reference

The methodology behind GovEA lives at https://github.com/roballred/EasyEA. Key concepts:
- People-centered: start with personas, not systems
- 7-step lightweight workflow
- ARB review with 10 distinct reviewer personas (simulated in v2)
- Plain-language outputs for elected officials and non-technical stakeholders

---




## User Roles

| Role | Access |
|---|---|
| Admin | Full access — users, org settings, all content |
| Contributor | Create and edit EA content — no user management, no delete |
| Viewer | Read-only, published content only |

SSO users default to Viewer. Admins promote as needed.

---

## Database Workflow

**Pre-production (current):** Use `db:push` to sync schema changes directly to the dev database. CI also uses `db:push --force` on a fresh database (see `.github/workflows/ci.yml` — both DB-backed jobs run `db:push --force` then `db:apply-triggers:container`, **not** `db:migrate`). No migration files needed — run `pnpm --filter govea db:push` after schema edits, then `db:apply-triggers` to install Postgres triggers and other DB-level constraints, then `db:seed` to repopulate.

**There is no committed migrations directory, and that is intentional.** `db:push` derives the schema directly from `src/db/schema/`, so `apps/govea/src/db/migrations/` is not used by CI or local dev. (A set of 29 vestigial `drizzle-kit generate` files accumulated here against this policy and was removed in #683.) The `db:generate` / `db:migrate` scripts remain in `package.json` only for the eventual switch below — do not run them or commit their output during pre-production. If you find a `migrations/` directory has reappeared, it is drift: delete it rather than wiring CI to it.

**Switch to migrations when:** the first real tenant or persistent data exists that can't be thrown away. At that point: generate `0000_initial_schema.sql` from the current schema, fold the SQL files in `apps/govea/src/db/sql/` into the migration sequence, switch CI from `db:push --force` to `db:migrate`, and use `db:generate` + `db:migrate` for all schema changes going forward. Update this section (and remove this paragraph) when the switch happens.

### Postgres triggers (DB-level constraints)

Some constraints are enforced by Postgres triggers that drizzle-kit does not manage. Source of truth: `apps/govea/src/db/sql/*.sql`. Idempotent — re-applied after every `db:push` by `pnpm --filter govea db:apply-triggers`.

Currently shipped:
- `audit-immutable.sql` — blocks UPDATE and DELETE on `audit_log` (#417). Audit rows are append-only at the DB layer; even a compromised admin role cannot rewrite history. Operators: this means the `audit_log` table cannot be retroactively edited, including by you.

When adding a new trigger, drop a new `.sql` file in `src/db/sql/` (idempotent: `CREATE OR REPLACE` for functions, `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER`). The apply-triggers script picks it up automatically.

---

## GitHub

Repo: https://github.com/roballred/GovEA

---

## Pre-Flight Checklist — Required Before Writing Any Code

Before implementing anything, work through every item below in order. If any item cannot be satisfied, stop and resolve it before proceeding. Do not start implementation to "figure it out as you go."

### 1. Issue exists
A GitHub issue must exist with defined scope and acceptance criteria. If the user hands me a task informally (chat message, verbal request), I must **create the issue first** and confirm its content before writing code. No exceptions.

### 2. Capability traceability is present
The issue must include a `Capability:` or `Capability group:` line referencing the relevant EasyEA capability ID (the file stem of the capability doc, e.g. `ac-feature-management`). If it is missing:
- Read the relevant capability doc under `business-architecture/capabilities/` to identify the right ID.
- Add it to the issue, or ask the user to confirm the mapping before proceeding.
- If no capability doc exists for the work, flag that explicitly — do not silently proceed without traceability.

### 3. Persona is identified
The issue should name the persona(s) the work serves. If a change cannot be tied to a persona need or business goal, flag it and ask the user to confirm why it should exist. Do not assume the work is self-evidently justified.

### 4. Acceptance criteria are clear
The issue should have enough detail to know when the work is done. If acceptance criteria are missing or vague, ask before implementing.

---

## Traceability in Every Commit and PR

Every commit that touches implementation must include the capability ID in the message body:

```
feat(settings): add group-level module toggles

Capability: ac-feature-management
Closes #N
```

Every PR description must include:
- `Closes #N` referencing the issue
- `Capability: [id]` referencing the capability
- A short explanation of what changed, why, and how it was tested

This is not optional — it is the mechanism that makes AI-assisted work auditable and trustworthy.
