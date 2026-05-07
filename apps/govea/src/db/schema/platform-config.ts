import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const platformConfig = pgTable('platform_config', {
  id: text('id').primaryKey().default('singleton'),
  instanceName: text('instance_name').notNull().default('GovEA'),
  defaultTheme: text('default_theme').notNull().default('govea'),
  allowLocalAuth: boolean('allow_local_auth').notNull().default(true),
  /** Applied to new orgs at provisioning time. Null means no tier is stamped. */
  defaultSupportTier: text('default_support_tier'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
})

export type PlatformConfig = typeof platformConfig.$inferSelect
