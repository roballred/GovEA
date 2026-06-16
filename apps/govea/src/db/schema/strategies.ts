import { date, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { goals } from './goals'
import { capabilities } from './capabilities'
import { valueStreams } from './value-streams'
import { initiatives } from './initiatives'

/**
 * Strategy: a BIZBOK **course of action** — the broad chosen *approach* to
 * achieve one or more Goals (#697 / ADR-0005, superseding ADR-0004's container).
 *
 * Strategy is a *means*, not a container above Goals: Goals/Objectives are the
 * ends, a Strategy is how we intend to get there, and it maps onto the operating
 * model it leverages and changes — Capabilities and Value Streams (cross-mapped
 * peers) — and is delivered by Initiatives. See `docs/design/strategy-entity.md`.
 *
 * Lifecycle is a course-of-action lifecycle (not a content publish, not the old
 * adopt/supersede governance act):
 *   proposed → active → achieved → abandoned
 * Multiple strategies can be `active` at once — there is no single "current"
 * strategy, so no partial unique index. "Active strategies" is what executive
 * surfaces read.
 */
export const strategyStatusEnum = pgEnum('strategy_status', [
  'proposed',
  'active',
  'achieved',
  'abandoned',
])

export const strategies = pgTable(
  'strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    summary: text('summary'), // markdown — the approach, in prose
    planningHorizon: text('planning_horizon'), // e.g. "FY26–FY28"
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: strategyStatusEnum('status').notNull().default('proposed'),
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
    index('strategies_org_status_idx').on(t.organizationId, t.status),
    index('strategies_org_updated_at_idx').on(t.organizationId, t.updatedAt),
  ],
)

export type Strategy = typeof strategies.$inferSelect
export type NewStrategy = typeof strategies.$inferInsert

// ── Junctions ────────────────────────────────────────────────────────────────
// Strategy is a means: it *pursues* Goals, *impacts* the operating model
// (capabilities + value streams), and is *delivered by* Initiatives. All
// many-to-many — a goal can be pursued by several strategies, etc.

/** Strategy pursues Goal. */
export const strategyGoals = pgTable('strategy_goals', {
  strategyId: uuid('strategy_id').notNull().references(() => strategies.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.strategyId, t.goalId] })])
export type StrategyGoal = typeof strategyGoals.$inferSelect

/** Strategy impacts Capability (leverage/build/improve/retire). */
export const strategyCapabilities = pgTable('strategy_capabilities', {
  strategyId: uuid('strategy_id').notNull().references(() => strategies.id, { onDelete: 'cascade' }),
  capabilityId: uuid('capability_id').notNull().references(() => capabilities.id, { onDelete: 'cascade' }),
  impact: text('impact'), // 'leverage' | 'build' | 'improve' | 'retire' | null
}, (t) => [primaryKey({ columns: [t.strategyId, t.capabilityId] })])
export type StrategyCapability = typeof strategyCapabilities.$inferSelect

/** Strategy impacts Value Stream. */
export const strategyValueStreams = pgTable('strategy_value_streams', {
  strategyId: uuid('strategy_id').notNull().references(() => strategies.id, { onDelete: 'cascade' }),
  valueStreamId: uuid('value_stream_id').notNull().references(() => valueStreams.id, { onDelete: 'cascade' }),
  impact: text('impact'), // 'leverage' | 'build' | 'improve' | 'retire' | null
}, (t) => [primaryKey({ columns: [t.strategyId, t.valueStreamId] })])
export type StrategyValueStream = typeof strategyValueStreams.$inferSelect

/** Strategy is delivered by Initiative. */
export const strategyInitiatives = pgTable('strategy_initiatives', {
  strategyId: uuid('strategy_id').notNull().references(() => strategies.id, { onDelete: 'cascade' }),
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.strategyId, t.initiativeId] })])
export type StrategyInitiative = typeof strategyInitiatives.$inferSelect
