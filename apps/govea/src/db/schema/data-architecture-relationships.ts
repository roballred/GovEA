import { check, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { organizations } from './organizations'
import { users } from './users'
import { dataEntities, dataAttributes } from './data-architecture'

/**
 * Cross-object semantic relationships for the Data Architecture metamodel
 * (#363 PR-2). Three tables — one per relationship "kind" that doesn't
 * already have a structural FK representation:
 *
 *   entity ↔ entity:    "is related"             → data_entity_relations
 *   entity ↔ attribute: "is characterized by"    → data_entity_attribute_links
 *   attribute ↔ attribute: "shares"              → data_attribute_shares
 *
 * The fourth kind from the spec — entity ↔ business key "instantiates" —
 * is already represented by `data_business_keys.owning_data_entity_id`
 * (PR-1). No additional table needed; PR-2's UI surfaces it alongside the
 * other three kinds.
 *
 * Symmetric kinds (entity↔entity, attribute↔attribute) enforce canonical
 * ordering (smaller UUID stored as the "left" column) to keep undirected
 * pairs unique without two rows.
 */

// ── entity ↔ entity "is related" ────────────────────────────────────────────

export const dataEntityRelations = pgTable(
  'data_entity_relations',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leftDataEntityId: uuid('left_data_entity_id')
      .notNull()
      .references(() => dataEntities.id, { onDelete: 'cascade' }),
    rightDataEntityId: uuid('right_data_entity_id')
      .notNull()
      .references(() => dataEntities.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.leftDataEntityId, t.rightDataEntityId] }),
    // Canonical ordering (left < right) keeps undirected pairs unique.
    check('data_entity_relations_canonical', sql`${t.leftDataEntityId} < ${t.rightDataEntityId}`),
    index('data_entity_relations_org_idx').on(t.organizationId),
    index('data_entity_relations_right_idx').on(t.rightDataEntityId),
  ],
)

// ── entity ↔ attribute "characterized by" ───────────────────────────────────

export const dataEntityAttributeLinks = pgTable(
  'data_entity_attribute_links',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    dataEntityId: uuid('data_entity_id')
      .notNull()
      .references(() => dataEntities.id, { onDelete: 'cascade' }),
    dataAttributeId: uuid('data_attribute_id')
      .notNull()
      .references(() => dataAttributes.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.dataEntityId, t.dataAttributeId] }),
    index('data_entity_attr_links_org_idx').on(t.organizationId),
    index('data_entity_attr_links_attr_idx').on(t.dataAttributeId),
  ],
)

// ── attribute ↔ attribute "shares" ──────────────────────────────────────────

export const dataAttributeShares = pgTable(
  'data_attribute_shares',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leftDataAttributeId: uuid('left_data_attribute_id')
      .notNull()
      .references(() => dataAttributes.id, { onDelete: 'cascade' }),
    rightDataAttributeId: uuid('right_data_attribute_id')
      .notNull()
      .references(() => dataAttributes.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.leftDataAttributeId, t.rightDataAttributeId] }),
    check('data_attribute_shares_canonical', sql`${t.leftDataAttributeId} < ${t.rightDataAttributeId}`),
    index('data_attribute_shares_org_idx').on(t.organizationId),
    index('data_attribute_shares_right_idx').on(t.rightDataAttributeId),
  ],
)

// ── Type exports ────────────────────────────────────────────────────────────

export type DataEntityRelation = typeof dataEntityRelations.$inferSelect
export type DataEntityAttributeLink = typeof dataEntityAttributeLinks.$inferSelect
export type DataAttributeShare = typeof dataAttributeShares.$inferSelect
