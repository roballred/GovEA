# GovEA — Project Instructions for Claude

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

**Pre-production (current):** Use `db:push` to sync schema changes directly to the dev database. CI also uses `db:push --force` on a fresh database. No migration files needed — run `pnpm --filter govea db:push` after schema edits, then `db:apply-triggers` to install Postgres triggers, then `db:seed` to repopulate.

**Switch to migrations when:** the first real tenant or persistent data exists that can't be thrown away. At that point: squash the schema into a single `0000_initial_schema.sql`, fold the SQL files in `apps/govea/src/db/sql/` into the migration sequence, switch CI from `db:push` to `db:migrate`, and use `db:generate` + `db:migrate` for all schema changes going forward. Update this section when the switch happens.

Do not commit migration files generated during pre-production development.

### Postgres triggers (DB-level constraints)

Some constraints are enforced by Postgres triggers that drizzle-kit does not manage. Source of truth: `apps/govea/src/db/sql/*.sql`. Idempotent — re-applied after every `db:push` by `pnpm --filter govea db:apply-triggers`.

Currently shipped:
- `audit-immutable.sql` — blocks UPDATE and DELETE on `audit_log` (#417). Audit rows are append-only at the DB layer; even a compromised admin role cannot rewrite history. Operators: this means the `audit_log` table cannot be retroactively edited, including by you.

When adding a new trigger, drop a new `.sql` file in `src/db/sql/` (idempotent: `CREATE OR REPLACE` for functions, `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER`). The apply-triggers script picks it up automatically.

---

## GitHub

Repo: https://github.com/roballred/GovEA
