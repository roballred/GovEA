import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const taxonomyTerms = pgTable('taxonomy_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'), // self-reference for hierarchy
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  domain: text('domain'), // top-level domain grouping
  sortOrder: text('sort_order'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type TaxonomyTerm = typeof taxonomyTerms.$inferSelect
export type NewTaxonomyTerm = typeof taxonomyTerms.$inferInsert
