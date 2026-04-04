import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { personas } from './personas'

export const capabilities = pgTable('capabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  domain: text('domain'), // top-level taxonomy domain
  status: workflowStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Junction table: capabilities ↔ personas (many-to-many)
export const capabilityPersonas = pgTable('capability_personas', {
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
})

export type Capability = typeof capabilities.$inferSelect
export type NewCapability = typeof capabilities.$inferInsert
