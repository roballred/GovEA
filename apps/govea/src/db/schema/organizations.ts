import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

// Domain-table visibility enum (used by capabilities, personas, etc.). Lives
// here for now; Phase 1b relocates it when `organizations` becomes a core
// re-export.
export const visibilityEnum = pgEnum('visibility', ['org', 'connections', 'instance'])

/**
 * Organization (tenancy root).
 *
 * Kept core-shaped (id/name/slug/timestamps) ahead of Phase 1b of the GovCore
 * cutover, where this table is re-exported from `@govcore/schema`. GovEA's
 * organization-level configuration — theme, module toggles, security/confidence/
 * completeness policy, support tier, hierarchy, suspension, backup bookkeeping —
 * lives in the app-owned `organization_settings` sidecar (one row per org,
 * keyed by `organization_id`). See `./organization-settings.ts`.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('organizations_slug_unique').on(t.slug)],
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
