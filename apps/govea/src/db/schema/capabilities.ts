import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { personas } from './personas'

export const capabilityTypeEnum = pgEnum('capability_type', ['business', 'technical'])

export const capabilities = pgTable('capabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  domain: text('domain'),       // top-level taxonomy domain
  behaviors: text('behaviors'), // what the capability must do — one behavior per line
  rules: text('rules'),         // constraints and invariants — one rule per line
  capabilityType: capabilityTypeEnum('capability_type'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  lastReviewedBy: uuid('last_reviewed_by').references(() => users.id),
  // #581 follow-up: optional domain owner attribution. When set, a non-owner
  // edit requires explicit overwrite acknowledgment in the form. Nullable
  // because the column is optional — most pre-existing rows have no owner
  // until someone assigns one. `set null` on user delete so removing a user
  // doesn't cascade-orphan their owned architecture objects.
  domainOwnerUserId: uuid('domain_owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastReviewedAt: timestamp('last_reviewed_at'),
}, (t) => [
  index('capabilities_org_status_idx').on(t.organizationId, t.status),
  index('capabilities_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

// Junction table: capabilities ↔ personas (many-to-many)
export const capabilityPersonas = pgTable('capability_personas', {
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
})

// Junction table: capabilities ↔ capabilities (parent-child hierarchy)
export const capabilityRelationships = pgTable('capability_relationships', {
  parentId: uuid('parent_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
  childId:  uuid('child_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.parentId, t.childId] })])

export type Capability = typeof capabilities.$inferSelect
export type NewCapability = typeof capabilities.$inferInsert
export type CapabilityRelationship = typeof capabilityRelationships.$inferSelect
