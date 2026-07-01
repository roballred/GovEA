# AI Session Start

This is the canonical "read me before doing anything" document for an AI session working on GovEA. It exists so the per-session context blob a human pastes when starting a new session can shrink to a single pointer at this file.

If anything below conflicts with [Standards.md](../Standards.md), **Standards.md governs.** If something here is wrong, edit it &mdash; the file is in git, the change is reviewable.

---

## Read in this order

1. **[`Standards.md`](../Standards.md)** &mdash; the governing document. Defines the EasyEA framing, persona validation rules, traceability convention, ARB workflow, and the "humans merge PRs" rule. Everything else extends it.
2. **[`CLAUDE.md`](../CLAUDE.md)** &mdash; Claude-specific workflow context. The pre-flight checklist (issue → capability → persona → acceptance criteria) and the per-commit / per-PR traceability format.
3. **[`business-architecture/STYLE.md`](../business-architecture/STYLE.md)** &mdash; format for persona and capability files. Enforced by `node scripts/lint-business-architecture.mjs` on every PR.
4. **[`README.md`](../README.md)** &mdash; tech stack, data model, current status. The "what is this" pass for someone unfamiliar with the codebase.
5. **[`docs/product-priorities.md`](./product-priorities.md)** &mdash; current top five next moves. Refreshed at each grooming pass; the in-product `/overview` Coming-next tile mirrors it.

---

## Platform cutover in progress (GovCore)

GovEA is mid-migration onto the extracted **GovCore** platform (`@govcore/*`). Read the **GovCore Platform Cutover** section in [`CLAUDE.md`](../CLAUDE.md) before touching platform code (auth, RBAC, schema, audit, tenancy). Operational essentials:

- RBAC already comes from **`@govcore/rbac`** (consumed from npm, `^0.1.0`); Phase 0 + 1a are merged, Phase 1b (`@govcore/schema`) is next.
- Every consumed `@govcore/*` package must be in `transpilePackages` in `apps/govea/next.config.ts` (they're source-first, even on npm).
- Org configuration lives in the `organization_settings` sidecar, not on `organizations` (kept core-shaped for the cutover).
- Design: [`docs/design/platform-core-extraction.md`](./design/platform-core-extraction.md); phased runbook is in the GovCore repo.

---

## Where current work lives

| Question | Where to look |
|---|---|
| What is in the next milestone? | `gh issue list --milestone "v0.9 — Foundation Cleanup"` (substitute the current target milestone) |
| What are the top priorities right now? | [`docs/product-priorities.md`](./product-priorities.md) |
| What was decided in the last 30 days? | `gh pr list --state merged --limit 30` |
| What risks are open? | [`docs/risk-register.md`](./risk-register.md) |
| What assumptions need testing? | [`docs/research/stakeholder-assumption-register.md`](./research/stakeholder-assumption-register.md) |
| What does the validation plan say is next? | [`docs/research/validation-plan.md`](./research/validation-plan.md) |
| What user feedback have we logged? | [`business-architecture/feedback-log.md`](../business-architecture/feedback-log.md) |

---

## Active milestones

| Milestone | Theme | Definition of done (short) |
|---|---|---|
| **v0.9** Foundation Cleanup | Pay down debt before declaring v1 | All open ARB findings resolved or closed; docs match reality; reproducible local bootstrap; visual regression on critical paths |
| **v1.0** Practice-Ready | A real Agency EA Coordinator or Enterprise Architect can install GovEA and use it | Self-host install guide; full repository CRUD; reports usable; data export; feedback log collecting signal |
| **v1.5** Adoption-Validated | Real practitioners used it; personas validated | Pilot tenants surveyed; persona files moved Assumed → Validated; in-product feedback widget; analysis surfaces operationalised |
| **v2.0** Platform & Integration | Multi-tenant + external system integration | Multi-tenant lifecycle governance; REST API + first Tier-1 sync; change notifications; TOGAF redesign applied |

Milestone descriptions on GitHub are the source of truth (`gh api repos/roballred/GovEA/milestones`). Every open issue is assigned to exactly one milestone.

---

## Track labels

Every open issue carries exactly one `track:*` label:

- `track:core` &mdash; product capability or feature required for v1
- `track:differentiator` &mdash; capability that sets GovEA apart from generic EA tools
- `track:foundation` &mdash; infra, governance, standards, ARB findings, security hardening, test infra, process work

---

## Pre-flight before writing any code

Per `CLAUDE.md`:

1. **Issue exists.** A GitHub issue with defined scope and acceptance criteria. If the user hands you a task informally, create the issue first and confirm before writing code.
2. **Capability traceability.** Issue body has `Capability: <id>` (file stem of the relevant capability doc).
3. **Persona is identified.** Issue body has `Persona: <name>`. If the work can&apos;t be tied to a persona pain point or goal, flag it.
4. **Acceptance criteria are clear enough to know when the work is done.**

If any of those four can&apos;t be satisfied, stop and resolve it before proceeding.

---

## Database workflow (pre-production)

Pre-production uses `db:push --force` against the local Postgres &mdash; no migration files yet (see ADR-008 in the GovEA Project seed).

```bash
pnpm --filter govea db:push           # schema sync
pnpm --filter govea db:apply-triggers # idempotent: re-apply Postgres triggers
pnpm --filter govea db:seed           # repopulate fixtures
```

Local Postgres runs in a container (`docker_db_1` on the maintainer machine, or `govea-postgres` in the canonical setup). Connection string in `apps/govea/.env.local`.

### Container must bind to localhost only

Publish the port as `127.0.0.1:5432`, **not** `0.0.0.0:5432`. The dev DB uses default credentials (`postgres` / `postgres`) and `trust` auth for local connections, so a `0.0.0.0` bind exposes a passwordless-locally / weak-password database to every machine on the LAN. Podman defaults the publish to all interfaces, so the loopback bind must be explicit and is easy to lose on a container recreate.

The binding lives on the **container**, not the machine &mdash; so any time `docker_db_1` is recreated (e.g. during corruption recovery below), the `run` command must re-specify it:

```bash
podman run -d --name docker_db_1 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=govea \
  -p 127.0.0.1:5432:5432 \
  -v docker_postgres_data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

Verify it stayed loopback-only: `podman ps --format '{{.Ports}}'` should show `127.0.0.1:5432->5432/tcp`, and `nc -z <LAN-IP> 5432` should be refused.

### Recovering a wedged Podman VM (recurring)

Symptom: `podman` commands fail with `ssh: handshake failed: EOF` even though `podman machine list` says **Currently running**, and/or DB commands hit `connection refused`. The applehv VM has degraded and an orphaned `gvproxy` is squatting on host port 5432. Recovery that has worked repeatedly:

```bash
podman machine stop && podman machine start          # restore SSH/API
lsof -nP -iTCP:5432 -sTCP:LISTEN                      # find the orphaned gvproxy PID
kill <gvproxy-pid>                                    # free :5432 (survives the bounce)
podman start docker_db_1                              # re-registers the loopback forward
podman exec docker_db_1 pg_isready -U postgres        # expect "accepting connections"
```

If the data volume itself is corrupt (Postgres logs `relmapper` / `FATAL` on start), the data is regenerable: `podman rm -f docker_db_1 && podman volume rm docker_postgres_data`, recreate with the `run` command above (note the `127.0.0.1` bind), then `db:push --force` → `db:apply-triggers` → `db:seed`. If this VM keeps degrading, consider `podman machine reset` rather than recovering by hand each session.

**Switch to migrations when** the first real tenant or persistent data exists that can't be thrown away. At that point CI flips from `db:push --force` to `db:migrate`. CLAUDE.md tracks the switch checklist.

---

## CI gates

Every PR runs:

1. **Type check** &mdash; `pnpm --filter govea exec tsc --noEmit`
2. **Lint** &mdash; `pnpm --filter govea lint`
3. **Docs lint** &mdash; `node scripts/lint-business-architecture.mjs` validates persona/capability files against STYLE.md
4. **Production build** &mdash; `pnpm --filter govea build`
5. **Integration tests** &mdash; `pnpm --filter govea test:integration` (vitest, hits the Postgres service container)
6. **E2E smoke tests** &mdash; `pnpm --filter govea exec playwright test tests/e2e/specs/smoke.spec.ts tests/e2e/specs/overview.spec.ts`
7. **`base-is-main`** &mdash; PR must target `main`

All must pass before a human merges. Only humans merge PRs.

---

## Operating policies (the ones that drift)

These are the rules the per-session bootstrap blob used to repeat because they drift. They live here now so the source of truth is git-tracked.

### Never run mutating Azure / deploy commands without explicit human approval

Read-only is fine. Mutating is not. Specifically:

- `./scripts/azure-dev.sh status` &mdash; **OK** (read-only)
- `./scripts/azure-dev.sh logs` &mdash; **OK** (read-only)
- `./scripts/azure-dev.sh revisions` &mdash; **OK** (read-only)
- `./scripts/azure-dev.sh update` / `start` / `stop` / `deploy` / `destroy` &mdash; **not without explicit approval**
- Any `az` command that creates, modifies, or deletes a resource &mdash; **not without explicit approval**

Treat these the same way Standards.md treats merging PRs: human decisions.

### Operator-specific deployment topology stays out of this public repo

GovEA is a public open-source repository. Per [`docs/release-pipeline.md`](./release-pipeline.md):

- CI and PR checks stay in this public repo.
- Azure deployment, rollback, and schedule automation live in a **private operator-owned repository** or run locally from an authenticated operator workstation.
- Do **not** commit Azure subscription IDs, tenant IDs, resource group names, registry names, Container App names, public demo FQDNs, or any account-specific deployment identifiers to this repo.
- Operator-specific names in `scripts/azure-dev.sh` are read from `GOVEA_AZURE_*` environment variables, not hard-coded.
- This policy is also recorded in the risk register as **R-002** (Open) and in the GovEA Project dogfood seed as an architecture-debt item.

### GitHub CLI

Used in nearly every session. Two reliable gotchas:

1. **PATH**: `/opt/homebrew/bin/gh` is not in PATH by default on macOS. Prefix with `PATH="/opt/homebrew/bin:$PATH" gh ...`.
2. **CWD**: `gh` operates on the repo at the current working directory. `cd` to the repo root first; worktrees count as separate repos.

Use `gh` for: filing issues, opening PRs, reading PR comments / past decisions, checking CI (`gh pr view <n> --json statusCheckRollup`), reading job logs (`gh api repos/.../actions/jobs/<id>/logs`). Never use it to merge a PR &mdash; humans merge.

### `db:migrate` is not the current command

`db:push` is. Pre-production uses `db:push --force` to sync schema directly. If you find yourself typing `db:migrate`, stop &mdash; that command exists but is not the right one yet. See ADR-008 in the GovEA Project seed for the switchover criteria.

### Worktrees vs. main checkout

The `.claude/launch.json` file may point the dev server at a worktree path. When verifying changes against a branch in the main checkout, the launch.json `runtimeArgs` need to point at the main checkout. If you edit the file locally for verification, restore it before opening a PR &mdash; the worktree pointer is the maintainer's setup.

---

## Capability and persona traceability

Every commit that touches implementation must include the capability ID in the message body:

```
feat(<area>): <short summary>

Capability: <capability-id>
Closes #<issue>
```

Every PR description must include:

- `Closes #<issue>` (or `Refs #<issue>` if not yet closing)
- `Capability: <capability-id>` (or `Capability group: <group>`)
- `Persona: <persona>` (one or more)
- Short explanation of what changed, why, and how it was tested

Capability IDs are file stems under `business-architecture/capabilities/`. Persona IDs are file stems under `business-architecture/personas/`. The lint script (`scripts/lint-business-architecture.mjs`) validates persona and capability files against `business-architecture/STYLE.md`.

---

## Don'ts

- Don&apos;t merge PRs. Humans merge.
- Don&apos;t push directly to `main`. PRs only.
- Don&apos;t skip pre-flight. Issue → capability → persona → acceptance criteria, in that order.
- Don&apos;t bypass CI hooks (`--no-verify`).
- Don&apos;t force-push to `main`.
- Don&apos;t commit `apps/govea/.env.local`, `.claude/launch.json` worktree paths, or any operator-specific Azure identifiers.
- Don&apos;t commit a persona file with `Validation Status: Validated` without a recorded interview &mdash; assumed personas stay Assumed until a real conversation lands.
- Don&apos;t run mutating Azure / deploy commands. See "Operating policies" above.

---

## When this doc is wrong

Edit it. It&apos;s in git, it&apos;s reviewable. If a session blob has to paste context that already lives somewhere else in this repo, the right fix is to point the blob at the source &mdash; not to copy the content into the blob.
