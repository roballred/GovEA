import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { workflowStatusEnum } from './personas'
import { strategicObjectives } from './objectives'

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  planningHorizon: text('planning_horizon'),
  // Strategy↔Goal is now a many-to-many junction (strategy_goals), per ADR-0005:
  // a Strategy is a course of action that *pursues* goals, and a goal may be
  // pursued by several strategies. (The old goals.strategy_id FK was dropped.)
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
