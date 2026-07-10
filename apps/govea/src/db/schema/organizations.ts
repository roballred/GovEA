import { pgEnum } from 'drizzle-orm/pg-core'

/**
 * Organization (tenancy root) — now owned by `@govcore/schema` (in the `govcore`
 * Postgres schema) and re-exported here so app FKs and queries keep importing
 * `organizations` from `@/db/schema`. Phase 1b of the GovCore cutover (#900).
 *
 * GovEA's organization-level configuration (theme, module toggles, security /
 * confidence / completeness policy, support tier, hierarchy, suspension, backup
 * bookkeeping) lives in the app-owned `organization_settings` sidecar — see
 * `./organization-settings.ts`.
 */
export { organizations, type Organization, type NewOrganization } from '@govcore/schema'

/**
 * Domain-table visibility enum (capabilities, personas, glossary, …). A **public**
 * enum, deliberately distinct from `@govcore/schema`'s `govcore.visibility` (which
 * scopes core federation / content-visibility). Kept here so the domain schema
 * files that import it from `./organizations` are unchanged by the cutover.
 */
export const visibilityEnum = pgEnum('visibility', ['org', 'connections', 'instance'])
