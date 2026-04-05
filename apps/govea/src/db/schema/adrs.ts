import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'

export const adrStatusEnum = pgEnum('adr_status', ['proposed', 'accepted', 'deprecated', 'superseded'])

export const adrs = pgTable('adrs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  number: text('number').notNull(), // e.g. "ADR-001"
  title: text('title').notNull(),
  context: text('context'),
  decision: text('decision'),
  consequences: text('consequences'),
  status: adrStatusEnum('status').notNull().default('proposed'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  supersededBy: uuid('superseded_by'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type ADR = typeof adrs.$inferSelect
export type NewADR = typeof adrs.$inferInsert
