import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type PostgresClient = ReturnType<typeof postgres>

declare global {
  var __goveaPostgresClient: PostgresClient | undefined
  var __goveaPrivilegedClient: PostgresClient | undefined
}

const maxConnections = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '5', 10)
const poolMax = Number.isFinite(maxConnections) ? maxConnections : 5

/**
 * Two-pool DB access (the two-role split, #896).
 *
 * - `db` — the **runtime** pool. In production/CI this connects as a NON-OWNER
 *   role (no `BYPASSRLS`), so the FORCE-RLS policies on the `govcore.*` core
 *   tables actually bind: every read is filtered by the transaction-local
 *   `app.current_org` GUC (set by tenant transactions). Tenant-scoped work runs
 *   here.
 * - `privilegedDb` — a superuser / `BYPASSRLS` pool that bypasses RLS. Used for
 *   the reads that legitimately cross or precede a tenant context: auth
 *   (adapter, credentials lookup, SSO check, membership resolution, login
 *   audit) and the instance-operator console (cross-org). `createAuth` takes it
 *   as `authDb`; `createOperatorActions` takes it as `operatorDb`.
 *
 * `GOVEA_PRIVILEGED_DATABASE_URL` defaults to `DATABASE_URL` when unset — so a
 * single-role dev/local setup (where the one role is a superuser and the
 * identity tables are not RLS-restricted) keeps working with no behavior change.
 * The split "turns on" only once `DATABASE_URL` is a non-owner role and
 * `GOVEA_PRIVILEGED_DATABASE_URL` points at the privileged role.
 */
const runtimeClient =
  globalThis.__goveaPostgresClient ?? postgres(process.env.DATABASE_URL!, { max: poolMax })
globalThis.__goveaPostgresClient = runtimeClient

const privilegedUrl = process.env.GOVEA_PRIVILEGED_DATABASE_URL ?? process.env.DATABASE_URL!
const privilegedClient =
  globalThis.__goveaPrivilegedClient ?? postgres(privilegedUrl, { max: poolMax })
globalThis.__goveaPrivilegedClient = privilegedClient

export const db = drizzle(runtimeClient, { schema })

/**
 * RLS-bypassing pool for identity + operator work (see the module comment).
 * Never use this for ordinary tenant-scoped reads — those must run on `db` under
 * a tenant GUC so RLS enforces org isolation.
 */
export const privilegedDb = drizzle(privilegedClient, { schema })
