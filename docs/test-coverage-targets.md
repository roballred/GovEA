# Test Coverage Targets

**Status:** Defined &mdash; **enforcement deferred to post-v1.0** per [#120](https://github.com/roballred/GovEA/issues/120).

This document defines what GovEA will measure for test coverage and what it deliberately will not. It exists so the team has an agreed answer when someone proposes "let&apos;s require 80% coverage" &mdash; that proposal is rejected before it lands, with a documented alternative ready.

The document also exists so when enforcement *does* land (post-v1.0, after the integration suite matures via [#117](https://github.com/roballred/GovEA/issues/117) and [#118](https://github.com/roballred/GovEA/issues/118)), the conversation about *what* to enforce is already over &mdash; only *how* to enforce remains.

---

## Why critical-path targets, not blanket percentages

A blanket coverage percentage (e.g. "the repo must have 80% coverage") incentivises the wrong behaviour:

- **Trivial code gets tests it doesn&apos;t need.** A getter that returns a field reaches 100% coverage with a single line; that line moves the percentage without revealing anything about correctness.
- **Hard code gets skipped.** Tests for happy-path RBAC checks across every entity, cross-tenant data boundary enforcement, and migration safety are *expensive to write* &mdash; a developer chasing a coverage number will write five trivial tests rather than one hard one.
- **The number becomes the goal.** Once "85%" is in CI as a hard gate, the team optimises for the number, not the underlying invariant the number was supposed to indicate.

GovEA targets coverage on the **paths whose failure has the largest blast radius**. Everything else is covered by E2E smoke tests, visual regression (when [#119](https://github.com/roballred/GovEA/issues/119) lands), and human review.

---

## What we target (100% expected, post-v1.0)

### 1. Server-action happy paths (create / edit / delete per entity)

Every server action exported from `apps/govea/src/actions/*.ts` that mutates data must have at least one integration test that:

- Constructs a valid input
- Calls the action with an authenticated session
- Asserts the database state changed as expected

Why 100%: server actions are the API of the application; a regression in any one of them silently corrupts data.

### 2. Role-enforcement guards (admin / contributor / viewer / instance-admin)

Every server action that has a role gate must have an integration test that:

- Calls the action as each role that should be allowed and asserts success
- Calls the action as each role that should be denied and asserts an authorisation failure (not a 500)

Why 100%: role drift is silent. A guard that fails open looks identical to a guard that works correctly until a Viewer deletes something.

### 3. Cross-org data boundary checks

Every read action that filters by `organizationId`, and every write action that scopes mutations by `organizationId`, must have an integration test that:

- Creates entities in two distinct organisations
- Reads / writes from one organisation&apos;s session
- Asserts the other organisation&apos;s data is not visible / modifiable

Why 100%: this is the multi-tenant safety property. A regression in any one cross-org boundary check is a data-leak class incident.

### 4. Migration + seed scripts

The seed entrypoint (`apps/govea/src/db/seeds/run.ts`) must complete cleanly on a fresh database. The post-seed state must include at least one row per major entity type for each demo org.

When the project switches from `db:push --force` to `db:migrate` (per ADR-008 in the GovEA Project dogfood seed), every migration must apply cleanly forward against the prior schema.

Why 100%: a broken seed makes the demo deployment useless and contributor onboarding impossible. A broken migration breaks any operator who runs it.

---

## What we deliberately do not target

The following categories are covered by other mechanisms; instrumenting them for line coverage adds noise without revealing meaningful regressions:

| Category | How it&apos;s actually covered |
|---|---|
| UI rendering (page + component output) | E2E smoke tests (`tests/e2e/specs/smoke.spec.ts`) hit every key route and assert no 5xx, no client-side exception, no Server-Component render error |
| Layout components (headers, nav shells, footers) | E2E smoke + planned visual regression ([#119](https://github.com/roballred/GovEA/issues/119)) |
| shadcn/ui wrappers and primitives | Upstream-tested by shadcn; GovEA wrappers are thin |
| Type-driven invariants | TypeScript strict mode enforces these at compile time; tests would be redundant |
| Trivial getters / property accessors | Covered by the actions that consume them |

Lint and type-check are *not* coverage substitutes &mdash; they catch a different class of issue. They run on every PR.

---

## Enforcement timing

Per [#120](https://github.com/roballred/GovEA/issues/120):

> Post v1.0 &mdash; define and enforce these targets once the integration test suite ([#117](https://github.com/roballred/GovEA/issues/117)) is mature. Do not set coverage targets before having a meaningful test baseline; it creates false confidence. Revisit at first release milestone alongside #117 and #118.

The order of operations:

1. **v1.0** (in flight) &mdash; reach Practice-Ready. Integration suite continues to grow as features ship.
2. **v1.0 closes** &mdash; baseline measurement: run `pnpm --filter govea exec vitest run --coverage` once, capture the current critical-path coverage for the four categories above. Record it here as the v1.0 baseline.
3. **First release after v1.0 baseline** &mdash; pick a realistic target per category (e.g. "server-action happy paths: 90% by v1.1, 100% by v1.5"). Track delta per release; raise the floor incrementally.
4. **CI enforcement** &mdash; once a target is reached, add a vitest coverage gate scoped to that category. CI failure on regression.

Until step 4, this doc is the agreement; it is not a CI gate.

---

## How to measure when we&apos;re ready

`vitest` has built-in coverage via the `c8` provider. To take a snapshot today (informational, not enforced):

```bash
# Assumes Postgres is reachable per apps/govea/.env.local
pnpm --filter govea exec vitest run --coverage
```

The HTML report lands in `apps/govea/coverage/`. Scope the report to the four critical-path categories above when reading it; ignore the headline percentage.

---

## Anti-patterns this document rejects

- &ldquo;The repo is at 38% coverage &mdash; let&apos;s require 80% by Q3.&rdquo; Wrong frame; replace with critical-path targets.
- &ldquo;Add a test for every untested file.&rdquo; The number of files isn&apos;t the issue; the *category* of file is.
- &ldquo;Snapshot tests will close the coverage gap.&rdquo; Snapshot tests are useful for stable serialised output, not for the four categories above. They reduce, not raise, the value of the coverage signal.
- &ldquo;Components have unit tests, so we&apos;re covered.&rdquo; Component unit tests rarely catch the regressions that matter on this codebase &mdash; the dangerous regressions live at the server-action and database boundary.

---

## Related

- [#117](https://github.com/roballred/GovEA/issues/117) &mdash; integration test suite maturity (prerequisite)
- [#118](https://github.com/roballred/GovEA/issues/118) &mdash; companion test-infra issue
- [#119](https://github.com/roballred/GovEA/issues/119) &mdash; visual regression coverage on key UI surfaces
- [`Standards.md`](../Standards.md) §6 &mdash; &ldquo;Testing is part of development, not an afterthought&rdquo;
- [`docs/AI-SESSION-START.md`](./AI-SESSION-START.md) &mdash; the CI gates this doc complements
