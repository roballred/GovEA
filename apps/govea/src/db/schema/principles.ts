import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { workflowStatusEnum } from './personas'
import { visibilityEnum } from './organizations'
import { users } from './users'
import { adrs } from './adrs'
import { capabilities } from './capabilities'

export const principles = pgTable('principles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),          // short label for display e.g. "SaaS First"
  description: text('description'),      // one-sentence summary
  title: text('title'),                  // full principle statement e.g. "Prefer SaaS for..."
  rationale: text('rationale'),
  implications: text('implications'),
  principleType: text('principle_type').notNull().default('architecture'), // taxonomy-backed: slug of principle type term
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('principles_org_status_idx').on(t.organizationId, t.status),
  index('principles_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

export const principleAdrs = pgTable('principle_adrs', {
  principleId: uuid('principle_id').notNull().references(() => principles.id, { onDelete: 'cascade' }),
  adrId: uuid('adr_id').notNull().references(() => adrs.id, { onDelete: 'cascade' }),
})

export const principleCapabilities = pgTable('principle_capabilities', {
  principleId: uuid('principle_id').notNull().references(() => principles.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

export type Principle = typeof principles.$inferSelect
export type NewPrinciple = typeof principles.$inferInsert
export type PrincipleAdr = typeof principleAdrs.$inferSelect
export type PrincipleCapability = typeof principleCapabilities.$inferSelect
