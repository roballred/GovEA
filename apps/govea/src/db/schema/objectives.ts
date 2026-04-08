import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { capabilities } from './capabilities'
import { applications } from './applications'
import { valueStreams } from './value-streams'

export const strategicObjectives = pgTable('strategic_objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  successMetric: text('success_metric'),   // how achievement is measured
  timeHorizon: text('time_horizon'),         // e.g. FY2026, 3-year
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type StrategicObjective = typeof strategicObjectives.$inferSelect

export const objectiveCapabilities = pgTable('objective_capabilities', {
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

export type ObjectiveCapability = typeof objectiveCapabilities.$inferSelect

export const objectiveValueStreams = pgTable('objective_value_streams', {
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
})

export type ObjectiveValueStream = typeof objectiveValueStreams.$inferSelect

// Junction: strategic objective ↔ application
export const objectiveApplications = pgTable('objective_applications', {
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
})

export type ObjectiveApplication = typeof objectiveApplications.$inferSelect
