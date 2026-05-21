import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { capabilities } from './capabilities'

export const lifecycleStatusEnum = pgEnum('lifecycle_status', [
  'active',
  'sunset',
  'decommissioned',
  'planned',
])

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  vendor: text('vendor'),
  version: text('version'),
  hostingModel: text('hosting_model'), // on-prem, saas, hybrid
  lifecycleStatus: lifecycleStatusEnum('lifecycle_status').notNull().default('active'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  customData: jsonb('custom_data').$type<Record<string, string>>().notNull().default({}),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  lastReviewedBy: uuid('last_reviewed_by').references(() => users.id),
  // #581 follow-up: optional domain owner attribution — see capabilities.ts.
  domainOwnerUserId: uuid('domain_owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastReviewedAt: timestamp('last_reviewed_at'),
}, (t) => [
  index('applications_org_status_idx').on(t.organizationId, t.status),
  index('applications_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

// Junction table: applications ↔ capabilities (many-to-many)
// Rule: every application must link to at least one capability
export const applicationCapabilities = pgTable('application_capabilities', {
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
