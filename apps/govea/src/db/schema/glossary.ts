import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { workflowStatusEnum } from './personas'
import { visibilityEnum } from './organizations'
import { users } from './users'

export const glossaryTerms = pgTable('glossary_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  term: text('term').notNull(),
  definition: text('definition').notNull(),
  // Attribution for the active definition (populated when a source is selected)
  definitionSource: text('definition_source'),
  definitionSourceUrl: text('definition_source_url'),
  domain: text('domain'),
  notes: text('notes'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('glossary_terms_org_status_idx').on(t.organizationId, t.status),
  index('glossary_terms_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

// Reference definitions from authoritative sources (e.g. TOGAF, NIST, ISO)
export const glossaryTermSources = pgTable('glossary_term_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  termId: uuid('term_id').notNull().references(() => glossaryTerms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),           // e.g. "TOGAF 10", "NIST SP 800-53"
  url: text('url'),                       // link to the source (optional)
  definition: text('definition').notNull(), // the verbatim definition from the source
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type GlossaryTerm = typeof glossaryTerms.$inferSelect
export type NewGlossaryTerm = typeof glossaryTerms.$inferInsert
export type GlossaryTermSource = typeof glossaryTermSources.$inferSelect
export type NewGlossaryTermSource = typeof glossaryTermSources.$inferInsert
