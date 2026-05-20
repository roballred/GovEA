import { index, pgEnum, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const emailTlsModeEnum = pgEnum('email_tls_mode', ['none', 'starttls', 'tls'])

/**
 * Per-org SMTP configuration (#528, capability `ac-email-configuration`).
 *
 * Singleton per organization. `passwordEncrypted` holds an AES-256-GCM
 * ciphertext blob (see `lib/email/credential-cipher.ts`); the plaintext
 * password is never read back into the UI — the capability rule
 * "credentials are never displayed in plaintext after saving" is enforced
 * by the server action, not the schema.
 */
export const emailSettings = pgTable('email_settings', {
  organizationId: uuid('organization_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('username'),
  passwordEncrypted: text('password_encrypted'), // null = no auth
  tlsMode: emailTlsModeEnum('tls_mode').notNull().default('starttls'),
  fromName: text('from_name').notNull(),
  fromAddress: text('from_address').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type EmailSettings = typeof emailSettings.$inferSelect
export type NewEmailSettings = typeof emailSettings.$inferInsert

export const emailDeliveryStatusEnum = pgEnum('email_delivery_status', ['sent', 'failed'])

/**
 * Append-only log of outbound email attempts. Capability behavior:
 * "View a log of recent outbound email attempts and their delivery status."
 *
 * We keep the last N rows per org via a cleanup pass at write time (the
 * server action prunes to 200 per org after each insert). No FK back to
 * users so deleted admins don't cascade-delete history.
 */
export const emailDeliveryLog = pgTable('email_delivery_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull(),
  status: emailDeliveryStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  sentByUserId: uuid('sent_by_user_id'),
  durationMs: integer('duration_ms'),
  isTest: boolean('is_test').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => [
  index('email_delivery_log_org_created_idx').on(t.organizationId, t.createdAt),
])

export type EmailDeliveryLogEntry = typeof emailDeliveryLog.$inferSelect
export type NewEmailDeliveryLogEntry = typeof emailDeliveryLog.$inferInsert
