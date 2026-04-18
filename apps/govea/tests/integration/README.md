# Integration Tests

Server-action integration tests that call the real write path against a live
PostgreSQL database. These tests verify role enforcement, cross-org boundaries,
audit logging, and DB-level correctness that TypeScript alone cannot catch.

## What's Covered

| Suite | File | Tests |
|---|---|---|
| Capabilities | `capabilities.test.ts` | create/edit/delete with role checks; audit log before/after snapshots |
| Users | `users.test.ts` | createUser org scoping; role promotion/demotion; last-admin guard; audit logging |
| Settings | `settings.test.ts` | module toggle (absent-key semantics, audit); theme update; role enforcement |
| Cross-org | `cross-org.test.ts` | `assertOwnership` blocks cross-org edits and deletes; `updateUserRole` WHERE-scoped no-op |

48 tests total. Runtime: ~3–4 seconds.

## Prerequisites

A running PostgreSQL instance at `localhost:5432` with:

```
database: govea
user:     postgres
password: postgres
```

The easiest way to run one locally is with Podman (or Docker):

```bash
podman machine start                   # if not already running
podman run -d \
  --name govea-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=govea \
  -p 5432:5432 \
  --restart unless-stopped \
  docker.io/postgres:16-alpine
```

Then apply migrations once (re-run any time the schema changes):

```bash
cd apps/govea
pnpm db:migrate
```

## Running the Tests

From `apps/govea`:

```bash
# Single run
pnpm test:integration

# Watch mode (re-runs on file change)
pnpm test:integration:watch
```

`DATABASE_URL` is loaded from `.env.local` automatically by the test setup file.
It does not need to be in the environment before you run the command.

## How Test Isolation Works

Each test suite creates its own org with a unique UUID slug, creates users
inside it, and tears the whole org down in `afterAll`. Because every foreign
key in the schema cascades on delete, a single `DELETE FROM organizations WHERE
id = $1` removes all data created by that suite.

```
beforeAll  → createTestOrg()       ← fresh org, isolated from every other suite
             createTestUser(...)   ← users scoped to that org
afterAll   → cleanupOrg(orgId)     ← deletes org + all cascade data
```

Test suites that run in the same process share the database but never share
org data, so they can safely run concurrently within a single Vitest fork.

## Auth Mocking

Server actions call `auth()` from `@/lib/auth`. Tests mock this at the module
level using `vi.hoisted`:

```typescript
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

// In a test:
mockAuth.mockResolvedValue(makeSession(admin))
await createCapability(formData)
```

`makeSession(user)` builds the same shape that NextAuth returns in production,
so the actions behave exactly as they would with a real session.

## Next.js Mocks

`setup.ts` mocks three Next.js APIs that server actions import:

| Mock | Behavior |
|---|---|
| `next/navigation` — `redirect` | throws `Error('REDIRECT:<url>')` so tests can assert on it |
| `next/navigation` — `notFound` | throws `Error('NOT_FOUND')` |
| `next/cache` — `revalidatePath` | no-op |
| `next/headers` — `cookies/headers` | stub returning null/empty |

This lets tests call server actions directly without a running Next.js server.

## Helper Reference (`helpers/db.ts`)

| Function | Purpose |
|---|---|
| `createTestOrg()` | Insert org with unique slug, return `{ id, name, slug }` |
| `createTestUser(orgId, role)` | Insert user with bcrypt password hash |
| `cleanupOrg(orgId)` | Delete org (cascades all child data) |
| `makeSession(user)` | Build NextAuth session shape |
| `findOrg(id)` | Direct DB read for assertions |
| `findUser(id)` | Direct DB read for assertions |
| `getAuditLogs(orgId, action?)` | All audit rows for org, sorted by `createdAt ASC` |
| `getAuditLogsForEntity(entityId)` | Audit rows for a specific entity |
| `getCapabilitiesForOrg(orgId)` | All capabilities for org |
| `insertCapability(orgId, name)` | Direct DB insert (used in cross-org setup) |

## CI

The CI workflow (`.github/workflows/ci.yml`) spins up a `postgres:16` service
container, applies migrations, and runs `pnpm test:integration` on every push.
