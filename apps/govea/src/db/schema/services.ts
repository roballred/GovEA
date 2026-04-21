import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { capabilities } from './capabilities'
import { personas } from './personas'
import { valueStreams } from './value-streams'

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  serviceOwner: text('service_owner'),   // free-text owner name or team
  channels: text('channels').array().notNull().default([]), // 'online' | 'in-person' | 'phone' | 'mobile'
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Junction table: services ↔ capabilities (many-to-many)
export const serviceCapabilities = pgTable('service_capabilities', {
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

// Junction table: services ↔ personas (many-to-many)
export const servicePersonas = pgTable('service_personas', {
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
})

// Junction table: services ↔ value streams (many-to-many)
export const serviceValueStreams = pgTable('service_value_streams', {
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
})

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
