import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const taxonomyTerms = pgTable('taxonomy_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'), // self-reference for hierarchy
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  domain: text('domain'), // top-level domain grouping
  // #671 — audience marker on taxonomy *types*. 'framework' types (e.g. an
  // installed TOGAF domain scheme) are hidden from viewer-role users and
  // stakeholder reports by default, preserving ADR-0001 jargon-hiding without a
  // module toggle. null = general (visible to everyone). General feature, not
  // framework-specific.
  audience: text('audience'),
  sortOrder: text('sort_order'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Which taxonomy types are configured for which entity types (per org)
export const entityTaxonomyDefinitions = pgTable(
  'entity_taxonomy_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'application' | 'capability' | etc.
    taxonomyTypeId: uuid('taxonomy_type_id').notNull().references(() => taxonomyTerms.id, { onDelete: 'cascade' }),
    selectionMode: text('selection_mode').notNull().default('single'), // 'single' | 'multi'
    required: boolean('required').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('etd_org_entity_type_uniq').on(t.organizationId, t.entityType, t.taxonomyTypeId),
  ]
)

// Selected taxonomy values per record
export const entityTaxonomyValues = pgTable(
  'entity_taxonomy_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    taxonomyTermId: uuid('taxonomy_term_id').notNull().references(() => taxonomyTerms.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('etv_entity_term_uniq').on(t.entityType, t.entityId, t.taxonomyTermId),
  ]
)

export type TaxonomyTerm = typeof taxonomyTerms.$inferSelect
export type NewTaxonomyTerm = typeof taxonomyTerms.$inferInsert
export type EntityTaxonomyDefinition = typeof entityTaxonomyDefinitions.$inferSelect
export type EntityTaxonomyValue = typeof entityTaxonomyValues.$inferSelect
