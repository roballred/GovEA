import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { taxonomyTerms } from './taxonomy'

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'published', 'archived'])

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  // Stores the name of a taxonomy term (child of "Persona Type") — same pattern as capabilities.domain
  type: text('type'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  lastReviewedBy: uuid('last_reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastReviewedAt: timestamp('last_reviewed_at'),
}, (t) => [
  index('personas_org_status_idx').on(t.organizationId, t.status),
  index('personas_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

export type Persona = typeof personas.$inferSelect
export type NewPersona = typeof personas.$inferInsert

// Tags are taxonomy terms — children of the "Persona Tag" taxonomy type.
// Management happens in the Taxonomy page, not the Personas page.
export const personaTags = pgTable('persona_tags', {
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => taxonomyTerms.id, { onDelete: 'cascade' }),
})

export type PersonaTag = typeof personaTags.$inferSelect
