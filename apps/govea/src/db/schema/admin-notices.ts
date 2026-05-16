import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

/**
 * Admin-authored operational notices, shipped under #456.
 *
 * Two scopes:
 *   - `org` — visible to users in `organizationId`; managed by org admins
 *   - `instance` — visible across the instance; managed by instance admins;
 *     `organizationId` is null. (PR 1 only ships the `org` scope; the column
 *     and `scope` field are in the schema now to avoid a follow-up migration.)
 *
 * Severity drives visual treatment:
 *   - `info`     — blue, dismissible per session (client-side)
 *   - `warning`  — amber, dismissible per session (client-side)
 *   - `critical` — red, pinned (no dismiss control)
 *
 * Only one notice per scope can be `active = true` at a time. Activating a
 * second notice in the same scope deactivates the first; enforcement is in
 * `actions/admin-notices.ts` via a transaction. (A partial-unique index
 * would also work but loses the "previous one auto-deactivated" UX —
 * admins would see a constraint error instead of a clean swap.)
 */
export const adminNotices = pgTable(
  'admin_notices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(), // 'org' | 'instance'
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    severity: text('severity').notNull(), // 'info' | 'warning' | 'critical'
    title: text('title').notNull(),
    body: text('body').notNull(),
    learnMoreUrl: text('learn_more_url'),
    active: boolean('active').notNull().default(false),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // Banner lookup is keyed on (scope, organizationId, active) — index the
    // hot path so the per-request read stays cheap as the notices table grows.
    index('admin_notices_active_lookup_idx').on(t.scope, t.organizationId, t.active),
  ],
)

export type AdminNotice = typeof adminNotices.$inferSelect
export type NewAdminNotice = typeof adminNotices.$inferInsert

export const NOTICE_SCOPES = ['org', 'instance'] as const
export type NoticeScope = (typeof NOTICE_SCOPES)[number]

export const NOTICE_SEVERITIES = ['info', 'warning', 'critical'] as const
export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number]

export function isNoticeScope(value: string): value is NoticeScope {
  return (NOTICE_SCOPES as readonly string[]).includes(value)
}

export function isNoticeSeverity(value: string): value is NoticeSeverity {
  return (NOTICE_SEVERITIES as readonly string[]).includes(value)
}
