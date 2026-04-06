import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'published', 'archived'])

export const personaTypes = pgTable('persona_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqueOrgType: unique('unique_org_persona_type').on(t.organizationId, t.name),
}))

export type PersonaType = typeof personaTypes.$inferSelect

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqueOrgTag: unique('unique_org_tag').on(t.organizationId, t.name),
}))

export type Tag = typeof tags.$inferSelect

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Persona = typeof personas.$inferSelect
export type NewPersona = typeof personas.$inferInsert

export const personaTags = pgTable('persona_tags', {
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
})

export type PersonaTag = typeof personaTags.$inferSelect
