import { index, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

/**
 * Subscriptions — a user opts in to notifications on a specific architecture
 * object (#581). Per-object scope only in v1; per-domain scope is queued as a
 * follow-up alongside the domain-owner attribution work.
 *
 * (organization_id, user_id, entity_type, entity_id) is the natural key — a
 * user can subscribe to the same entity at most once. The unique constraint
 * doubles as the upsert key for `subscribe()`.
 */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(), // 'capability' | 'application' | 'adr' (v1 scope)
  entityId: uuid('entity_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => [
  uniqueIndex('subscriptions_user_entity_unique').on(t.userId, t.entityType, t.entityId),
  index('subscriptions_entity_idx').on(t.entityType, t.entityId),
])

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

/**
 * Notifications — append-only events generated when an architecture object
 * changes and the subscriber isn't the actor. Listed on /notifications.
 *
 * `actorUserId` and `entityId` are intentionally not foreign-key'd back to
 * users / entities so deleting either doesn't cascade-purge the history.
 * Same pattern as audit_log (#417).
 *
 * `readAt` is null until the recipient opens / dismisses the notification.
 * Older read notifications can be pruned by a future cleanup pass.
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'), // null when the action has no entity target
  action: text('action').notNull(), // mirrors audit_log.action
  actorUserId: uuid('actor_user_id'),
  summary: text('summary').notNull(), // plain-language one-liner for the UI
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => [
  index('notifications_user_unread_idx').on(t.userId, t.readAt),
  index('notifications_user_created_idx').on(t.userId, t.createdAt),
])

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
