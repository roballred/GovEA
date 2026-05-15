import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'
import { organizations } from './organizations'
import { breakGlassSessions } from './break-glass-sessions'

export const actAsSessions = pgTable('act_as_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  breakGlassSessionId: uuid('break_glass_session_id').notNull().references(() => breakGlassSessions.id),
  instanceAdminId: uuid('instance_admin_id').notNull().references(() => users.id),
  targetOrgId: uuid('target_org_id').notNull().references(() => organizations.id),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  endedAt: timestamp('ended_at'),
  endReason: text('end_reason'),
})

export type ActAsSession = typeof actAsSessions.$inferSelect
export type NewActAsSession = typeof actAsSessions.$inferInsert

export const ACT_AS_DEFAULT_TTL_MINUTES = 30
export const ACT_AS_END_REASONS = [
  'admin_ended',
  'expired',
  'parent_revoked',
  'parent_expired',
] as const
export type ActAsEndReason = (typeof ACT_AS_END_REASONS)[number]
