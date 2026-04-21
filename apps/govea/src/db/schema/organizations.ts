import { type AnyPgColumn, boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const visibilityEnum = pgEnum('visibility', ['org', 'connections', 'instance'])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  theme: text('theme').notNull().default('govea'),
  enabledModules: jsonb('enabled_modules').$type<Record<string, boolean>>().notNull().default({}),
  isSystemOrg: boolean('is_system_org').notNull().default(false),
  parentId: uuid('parent_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
