import { boolean, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const connectionStatusEnum = pgEnum('connection_status', ['pending', 'active', 'rejected'])
export const linkStatusEnum = pgEnum('link_status', ['pending', 'active', 'rejected'])
export const linkTypeEnum = pgEnum('link_type', ['implements', 'extends', 'maps_to'])

// Explicit bilateral connections between organizations.
// Required for 'connections'-visibility content to cross org boundaries.
export const orgConnections = pgTable('org_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromOrgId: uuid('from_org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  toOrgId: uuid('to_org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  status: connectionStatusEnum('status').notNull().default('pending'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueConnection: unique('unique_org_connection').on(t.fromOrgId, t.toOrgId),
}))

// Cross-org relationships between content items.
// No FK on entity IDs — they cross org boundaries and cannot be DB-enforced.
// Validated in application code instead.
export const crossOrgLinks = pgTable('cross_org_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceOrgId: uuid('source_org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceEntityType: text('source_entity_type').notNull(), // 'capability' | 'persona'
  sourceEntityId: uuid('source_entity_id').notNull(),
  targetOrgId: uuid('target_org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  targetEntityType: text('target_entity_type').notNull(), // 'capability' | 'persona'
  targetEntityId: uuid('target_entity_id').notNull(),
  linkType: linkTypeEnum('link_type').notNull(),
  status: linkStatusEnum('status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  flaggedForReview: boolean('flagged_for_review').notNull().default(false),
  flagReason: text('flag_reason'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type OrgConnection = typeof orgConnections.$inferSelect
export type NewOrgConnection = typeof orgConnections.$inferInsert
export type CrossOrgLink = typeof crossOrgLinks.$inferSelect
export type NewCrossOrgLink = typeof crossOrgLinks.$inferInsert
