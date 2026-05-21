import { type AnyPgColumn, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { capabilities } from './capabilities'
import { applications } from './applications'
import { initiatives } from './initiatives'
import { strategicObjectives } from './objectives'

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
  supersededBy: uuid('superseded_by').references((): AnyPgColumn => adrs.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  // #581 follow-up: optional domain owner attribution — see capabilities.ts.
  domainOwnerUserId: uuid('domain_owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('adrs_org_status_idx').on(t.organizationId, t.status),
  index('adrs_org_updated_at_idx').on(t.organizationId, t.updatedAt),
])

export type ADR = typeof adrs.$inferSelect
export type NewADR = typeof adrs.$inferInsert

// Junction: ADR ↔ capability (which capabilities does this decision govern?)
export const adrCapabilities = pgTable('adr_capabilities', {
  adrId: uuid('adr_id').notNull().references(() => adrs.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
})

export type AdrCapability = typeof adrCapabilities.$inferSelect

// Junction: ADR ↔ application (which applications are affected?)
export const adrApplications = pgTable('adr_applications', {
  adrId: uuid('adr_id').notNull().references(() => adrs.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
})

export type AdrApplication = typeof adrApplications.$inferSelect

// Junction: ADR ↔ initiative (which initiatives triggered or are governed by this decision?)
export const adrInitiatives = pgTable('adr_initiatives', {
  adrId: uuid('adr_id').notNull().references(() => adrs.id, { onDelete: 'cascade' }),
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
})

export type AdrInitiative = typeof adrInitiatives.$inferSelect

// Junction: ADR ↔ strategic objective (which objectives does this decision support?)
export const adrObjectives = pgTable('adr_objectives', {
  adrId: uuid('adr_id').notNull().references(() => adrs.id, { onDelete: 'cascade' }),
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
})

export type AdrObjective = typeof adrObjectives.$inferSelect
