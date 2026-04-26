import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const TOGAF_DOMAINS = [
  'Business Architecture',
  'Application Architecture',
  'Technology Architecture',
  'Data Architecture',
] as const

export type TogafDomain = typeof TOGAF_DOMAINS[number]

export const frameworkMappings = pgTable('framework_mappings', {
  id:             uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  entityType:     text('entity_type').notNull(),   // 'capability' | 'application' | 'adr' | 'principle'
  entityId:       uuid('entity_id').notNull(),
  framework:      text('framework').notNull(),      // 'togaf'
  conceptLabel:   text('concept_label').notNull(),  // TogafDomain
  rationale:      text('rationale'),
  createdBy:      uuid('created_by').references(() => users.id),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, table => [
  index('framework_mappings_entity_idx').on(table.organizationId, table.entityType, table.entityId),
])

export type FrameworkMapping    = typeof frameworkMappings.$inferSelect
export type NewFrameworkMapping = typeof frameworkMappings.$inferInsert
