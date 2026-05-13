import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { personas } from './personas'
import { workflowStatusEnum } from './personas'

/**
 * Data Architecture metamodel (#363 PR-1) — Data Vault aligned.
 *
 * Four first-class objects modelling the physical layer of a Data Vault:
 *   - Entity         → Hub
 *   - Attribute      → Satellite (with a physical-attribute-type tag)
 *   - Link           → Link (with a physical-link-type tag)
 *   - BusinessKey    → natural identifier owned by an Entity
 *
 * Cross-object semantic relationships ("is related", "instantiates",
 * "characterized by", "shares") arrive in PR-2. Chen Notation visualization
 * is PR-3. Conceptual & logical-layer modelling is deferred.
 */

export const physicalAttributeTypeEnum = pgEnum('data_physical_attribute_type', [
  'effectivity',
  'multi-active',
  'record-tracking',
  'status-tracking',
])

export const physicalLinkTypeEnum = pgEnum('data_physical_link_type', [
  'same-as',
  'hierarchical',
])

export type PhysicalAttributeType = (typeof physicalAttributeTypeEnum.enumValues)[number]
export type PhysicalLinkType = (typeof physicalLinkTypeEnum.enumValues)[number]

// ── Entity (Data Vault Hub) ─────────────────────────────────────────────────

export const dataEntities = pgTable(
  'data_entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: workflowStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('org'),
    physicalHubTableName: text('physical_hub_table_name'),
    serverName: text('server_name'),
    databaseName: text('database_name'),
    schemaName: text('schema_name'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('data_entities_org_status_idx').on(t.organizationId, t.status),
    index('data_entities_org_updated_idx').on(t.organizationId, t.updatedAt),
  ],
)

// ── Attribute (Data Vault Satellite) ────────────────────────────────────────

export const dataAttributes = pgTable(
  'data_attributes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: workflowStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('org'),
    physicalSatelliteTableName: text('physical_satellite_table_name'),
    serverName: text('server_name'),
    databaseName: text('database_name'),
    schemaName: text('schema_name'),
    physicalAttributeType: physicalAttributeTypeEnum('physical_attribute_type'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('data_attributes_org_status_idx').on(t.organizationId, t.status),
    index('data_attributes_org_type_idx').on(t.organizationId, t.physicalAttributeType),
  ],
)

// ── Link (Data Vault Link) ──────────────────────────────────────────────────
// Note: the *object* is named "Link" in code/UI to avoid collision with the
// four cross-object semantic relationship kinds that arrive in PR-2. Data
// Architects can think of this as the Data Vault Link table they will create.

export const dataLinks = pgTable(
  'data_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: workflowStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('org'),
    physicalLinkTableName: text('physical_link_table_name'),
    serverName: text('server_name'),
    databaseName: text('database_name'),
    schemaName: text('schema_name'),
    physicalLinkType: physicalLinkTypeEnum('physical_link_type'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('data_links_org_status_idx').on(t.organizationId, t.status),
    index('data_links_org_type_idx').on(t.organizationId, t.physicalLinkType),
  ],
)

// ── BusinessKey ─────────────────────────────────────────────────────────────
// The natural identifier that instantiates an Entity-as-Hub. Modelled as a
// distinct object so the "entity instantiated by business key" semantic
// relationship (PR-2) has a real target to point at, and so composite BKs
// (multiple BK rows per Entity) work without a schema change.

export const dataBusinessKeys = pgTable(
  'data_business_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: workflowStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('org'),
    dataType: text('data_type'),
    /**
     * The Entity this business key instantiates. Required: a BK has no
     * meaning without the Hub it identifies. ON DELETE cascade keeps the
     * model internally consistent if the Entity is removed.
     */
    owningDataEntityId: uuid('owning_data_entity_id')
      .notNull()
      .references(() => dataEntities.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('data_business_keys_org_status_idx').on(t.organizationId, t.status),
    index('data_business_keys_owning_entity_idx').on(t.owningDataEntityId),
  ],
)

// ── Owner junctions ─────────────────────────────────────────────────────────
// Each object can have many Persona owners; each Persona can own many objects.
// Four dedicated junctions (rather than a polymorphic owners table) preserves
// FK integrity and follows the established pattern from architecture-debt.

export const dataEntityOwners = pgTable(
  'data_entity_owners',
  {
    dataEntityId: uuid('data_entity_id')
      .notNull()
      .references(() => dataEntities.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dataEntityId, t.personaId] })],
)

export const dataAttributeOwners = pgTable(
  'data_attribute_owners',
  {
    dataAttributeId: uuid('data_attribute_id')
      .notNull()
      .references(() => dataAttributes.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dataAttributeId, t.personaId] })],
)

export const dataLinkOwners = pgTable(
  'data_link_owners',
  {
    dataLinkId: uuid('data_link_id')
      .notNull()
      .references(() => dataLinks.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dataLinkId, t.personaId] })],
)

export const dataBusinessKeyOwners = pgTable(
  'data_business_key_owners',
  {
    dataBusinessKeyId: uuid('data_business_key_id')
      .notNull()
      .references(() => dataBusinessKeys.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dataBusinessKeyId, t.personaId] })],
)

// ── Type exports ────────────────────────────────────────────────────────────

export type DataEntity = typeof dataEntities.$inferSelect
export type NewDataEntity = typeof dataEntities.$inferInsert
export type DataAttribute = typeof dataAttributes.$inferSelect
export type NewDataAttribute = typeof dataAttributes.$inferInsert
export type DataLink = typeof dataLinks.$inferSelect
export type NewDataLink = typeof dataLinks.$inferInsert
export type DataBusinessKey = typeof dataBusinessKeys.$inferSelect
export type NewDataBusinessKey = typeof dataBusinessKeys.$inferInsert
