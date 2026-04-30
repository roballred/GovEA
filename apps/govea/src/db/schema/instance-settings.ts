import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

export const instanceSettings = pgTable('instance_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  disabledModules: jsonb('disabled_modules').$type<Record<string, boolean>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type InstanceSettings = typeof instanceSettings.$inferSelect
export type NewInstanceSettings = typeof instanceSettings.$inferInsert
