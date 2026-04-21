import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'
import { organizations } from './organizations'

export const breakGlassSessions = pgTable('break_glass_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  instanceAdminId: uuid('instance_admin_id').notNull().references(() => users.id),
  targetOrgId: uuid('target_org_id').notNull().references(() => organizations.id),
  reason: text('reason').notNull(),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => users.id),
})

export type BreakGlassSession = typeof breakGlassSessions.$inferSelect
export type NewBreakGlassSession = typeof breakGlassSessions.$inferInsert
