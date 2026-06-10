import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { personas } from './personas'
import { capabilities } from './capabilities'

export const valueStreams = pgTable('value_streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  valueItem: text('value_item'), // what is delivered to the stakeholder
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('value_streams_org_status_idx').on(t.organizationId, t.status),
  index('value_streams_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

export type ValueStream = typeof valueStreams.$inferSelect

export const valueStreamStages = pgTable('value_stream_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type ValueStreamStage = typeof valueStreamStages.$inferSelect

export const valueStreamStageCapabilities = pgTable('value_stream_stage_capabilities', {
  stageId: uuid('stage_id').notNull().references(() => valueStreamStages.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

export type ValueStreamStageCapability = typeof valueStreamStageCapabilities.$inferSelect

// Junction: value stream ↔ business capability (#734).
// Direct, stream-level capability mapping — distinct from the stage-level
// `value_stream_stage_capabilities` above. A capability mapped here applies to
// the whole value stream rather than a specific stage. Both FKs cascade on
// delete so removing either side cleans up the junction row.
export const valueStreamCapabilities = pgTable('value_stream_capabilities', {
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.valueStreamId, t.capabilityId] })])

export type ValueStreamCapability = typeof valueStreamCapabilities.$inferSelect

// Junction: value stream ↔ persona (many-to-many, replaces single stakeholderPersonaId FK)
export const valueStreamPersonas = pgTable('value_stream_personas', {
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
})

export type ValueStreamPersona = typeof valueStreamPersonas.$inferSelect
