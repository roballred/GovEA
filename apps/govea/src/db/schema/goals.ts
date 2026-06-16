import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { strategicObjectives } from './objectives'
import { strategies } from './strategies'

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  planningHorizon: text('planning_horizon'),
  // Optional parent Strategy container (#697/#805). null = un-containered goal
  // (valid, back-compat). At most one strategy per goal — many-to-one, no join
  // table (ADR-0004 Q3). set null so deleting a strategy orphans, not deletes.
  strategyId: uuid('strategy_id').references(() => strategies.id, { onDelete: 'set null' }),
  owner: text('owner'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Goal = typeof goals.$inferSelect

export const goalObjectives = pgTable('goal_objectives', {
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  objectiveId: uuid('objective_id').notNull().references(() => strategicObjectives.id, { onDelete: 'cascade' }),
})

export type GoalObjective = typeof goalObjectives.$inferSelect
