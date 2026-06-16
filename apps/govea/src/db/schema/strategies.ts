import { date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'

/**
 * Strategy: the first-class planning container above Goals (#697, #805).
 *
 * A Strategy frames a planning period — horizon, owner, dates, summary — and
 * holds Goals (via the nullable `goals.strategy_id` FK in ./goals). The
 * strategic *content* is its Goals; Strategy authors little of its own. See
 * `docs/design/strategy-entity.md` and ADR-0004 for the load-bearing decisions.
 *
 * Lifecycle is planning-specific (not the generic draft/published/archived):
 *   draft → adopted → superseded → retired
 * Adoption is a governance act. **At most one `adopted` strategy per org** is
 * the single source of truth for "the current strategy" that dashboard /
 * executive surfaces read — enforced at the DB layer by the partial unique
 * index below, no trigger needed. `adoptStrategy` (actions/strategies.ts)
 * supersedes the prior adopted strategy in the same transaction so the
 * invariant holds without ever surfacing a constraint error to the user.
 */
export const strategyStatusEnum = pgEnum('strategy_status', [
  'draft',
  'adopted',
  'superseded',
  'retired',
])

export const strategies = pgTable(
  'strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    summary: text('summary'), // markdown, like other planning descriptions
    planningHorizon: text('planning_horizon'), // same shape as goals.planning_horizon, e.g. "FY26–FY28"
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: strategyStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('org'),
    // Proper date columns — do NOT extend the free-text-date debt (data-model.md §4).
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // "At most one adopted strategy per org" — partial unique index (Q1 / ADR-0004).
    uniqueIndex('strategies_one_adopted_per_org_uniq')
      .on(t.organizationId)
      .where(sql`${t.status} = 'adopted'`),
    index('strategies_org_status_idx').on(t.organizationId, t.status),
    index('strategies_org_updated_at_idx').on(t.organizationId, t.updatedAt),
  ],
)

export type Strategy = typeof strategies.$inferSelect
export type NewStrategy = typeof strategies.$inferInsert
