import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Append-only audit log.
 *
 * Foreign-key constraints on `organization_id` and `user_id` are intentionally
 * omitted (#417). Audit rows preserve the UUIDs that were valid at event time;
 * those UUIDs may legitimately point at later-deleted rows. UPDATE and DELETE
 * are blocked at the DB level by triggers in `apps/govea/src/db/sql/audit-immutable.sql`.
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id'), // historical UUID — no FK on purpose
  userId: uuid('user_id'),                 // historical UUID — no FK on purpose
  action: text('action').notNull(), // e.g. 'create', 'update', 'delete', 'publish', 'login'
  entityType: text('entity_type').notNull(), // e.g. 'persona', 'capability', 'application'
  entityId: uuid('entity_id'),
  before: jsonb('before'), // snapshot before change
  after: jsonb('after'),   // snapshot after change
  metadata: jsonb('metadata'), // IP, user agent, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type AuditEntry = typeof auditLog.$inferSelect
export type NewAuditEntry = typeof auditLog.$inferInsert
