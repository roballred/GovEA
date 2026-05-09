import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { capabilities } from './capabilities'
import { applications } from './applications'
import { strategicObjectives } from './objectives'

export const initiativeStatusEnum = pgEnum('initiative_status', [
  'proposed',
  'active',
  'on-hold',
  'complete',
  'cancelled',
])

export const initiatives = pgTable('initiatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: initiativeStatusEnum('status').notNull().default('proposed'),
  startDate: text('start_date'),   // free-text quarter/date, e.g. "Q1 FY2026"
  endDate: text('end_date'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('initiatives_org_status_idx').on(t.organizationId, t.status),
  index('initiatives_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

export type Initiative = typeof initiatives.$inferSelect

// Junction: initiative ↔ capability (with impact label)
export const initiativeCapabilities = pgTable('initiative_capabilities', {
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
  impact: text('impact'),   // 'build' | 'improve' | 'retire' | null
})

export type InitiativeCapability = typeof initiativeCapabilities.$inferSelect

// Junction: initiative ↔ strategic objective
export const initiativeObjectives = pgTable('initiative_objectives', {
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
})

export type InitiativeObjective = typeof initiativeObjectives.$inferSelect

// Junction: initiative ↔ application (with impact label)
export const initiativeApplications = pgTable('initiative_applications', {
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  impact: text('impact'),   // 'build' | 'improve' | 'retire' | 'migrate' | null
})

export type InitiativeApplication = typeof initiativeApplications.$inferSelect
