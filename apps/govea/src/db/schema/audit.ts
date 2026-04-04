import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
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
