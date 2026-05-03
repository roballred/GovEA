import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export type CustomFieldType = 'text' | 'number' | 'date' | 'url' | 'boolean' | 'select' | 'multiselect'

export type CustomFieldDefinition = {
  name: string
  type: CustomFieldType
  required: boolean
  options?: string[] // for select / multiselect only
}

export const customFieldSchemas = pgTable(
  'custom_field_schemas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'application' | future types
    fields: jsonb('fields').$type<CustomFieldDefinition[]>().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('custom_field_schemas_org_entity_uniq').on(t.organizationId, t.entityType),
  ],
)

export type CustomFieldSchema = typeof customFieldSchemas.$inferSelect
