import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'published', 'archived'])

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type'), // citizen, staff, elected official, external partner
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Persona = typeof personas.$inferSelect
export type NewPersona = typeof personas.$inferInsert
