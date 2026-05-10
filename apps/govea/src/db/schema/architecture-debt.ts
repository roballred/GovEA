import { boolean, date, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations, visibilityEnum } from './organizations'
import { users } from './users'
import { applications } from './applications'
import { capabilities } from './capabilities'
import { adrs } from './adrs'
import { initiatives } from './initiatives'

/**
 * Architecture-debt taxonomy from `rm-architecture-debt.md`.
 * Severity tiers are intentionally shared with completeness signals
 * (referenced from `rm-end-to-end-traceability` and `rm-repository-completeness`)
 * for the future unified priority signal.
 */
export const debtTypeEnum = pgEnum('debt_type', [
  'lifecycle-risk',
  'capability-gap',
  'decision-drift',
  'known-shortcut',
  'unreviewed',
])

export const debtSeverityEnum = pgEnum('debt_severity', [
  'critical',
  'high',
  'medium',
  'low',
])

/**
 * Workflow status for debt items has its own enum because the spec extends
 * the standard draft/published/archived flow with operational states
 * (in-progress, resolved, accepted) that other content types do not have.
 *
 *   draft       — being authored, not yet shared
 *   published   — visible to viewers (subject to securitySensitive gating)
 *   in-progress — linked to an active initiative as a resolution path
 *   resolved    — remediation complete
 *   accepted    — acknowledged with documented rationale, no plan to resolve
 *   archived    — historical record, no longer actively tracked
 */
export const debtStatusEnum = pgEnum('debt_status', [
  'draft',
  'published',
  'in-progress',
  'resolved',
  'accepted',
  'archived',
])

/**
 * Distinguishes human-created debt from system-detected (lifecycle auto-flag)
 * debt per spec §"Auto-flagged debt …appears in a separate queue".
 * PR-1 only writes 'human'; the auto-flagger arrives in PR-4.
 */
export const debtSourceEnum = pgEnum('debt_source', ['human', 'system-detected'])

export const architectureDebtItems = pgTable(
  'architecture_debt_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    debtType: debtTypeEnum('debt_type').notNull(),
    severity: debtSeverityEnum('severity').notNull(),
    /**
     * Workflow status. Note: defaults to 'draft' so author-time scaffolding
     * is private until ready for publication.
     */
    status: debtStatusEnum('status').notNull().default('draft'),
    /**
     * Per-spec security gate. When true, the item is permanently restricted
     * to Admin/Contributor regardless of workflow state.
     */
    securitySensitive: boolean('security_sensitive').notNull().default(false),
    targetResolutionDate: date('target_resolution_date'),
    /**
     * Required when status is 'accepted'; enforced server-side.
     */
    acceptanceRationale: text('acceptance_rationale'),
    /**
     * Federation visibility. Mirrors the standard mo-content-visibility model.
     * Defaults to 'org' (private) so debt is never accidentally shared.
     */
    visibility: visibilityEnum('visibility').notNull().default('org'),
    /**
     * Distinguishes human-authored items from PR-4's system-detected queue.
     * PR-1 always writes 'human'.
     */
    source: debtSourceEnum('source').notNull().default('human'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('debt_items_org_status_idx').on(t.organizationId, t.status),
    index('debt_items_org_severity_idx').on(t.organizationId, t.severity),
    // Filter by source on dashboard (separate human vs system-detected queues)
    index('debt_items_org_source_idx').on(t.organizationId, t.source),
  ],
)

// ── Junctions: debt ↔ applications / capabilities / ADRs / initiatives ──────
//
// Composite PKs prevent duplicate links. ON DELETE cascade on the debt side
// cleans up junctions when a debt item is removed; the related-entity side
// keeps the junction so we don't silently drop a link if a target is
// archived (operators should re-decide).

export const debtApplications = pgTable(
  'debt_applications',
  {
    debtItemId: uuid('debt_item_id')
      .notNull()
      .references(() => architectureDebtItems.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.debtItemId, t.applicationId] })],
)

export const debtCapabilities = pgTable(
  'debt_capabilities',
  {
    debtItemId: uuid('debt_item_id')
      .notNull()
      .references(() => architectureDebtItems.id, { onDelete: 'cascade' }),
    capabilityId: uuid('capability_id')
      .notNull()
      .references(() => capabilities.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.debtItemId, t.capabilityId] })],
)

export const debtAdrs = pgTable(
  'debt_adrs',
  {
    debtItemId: uuid('debt_item_id')
      .notNull()
      .references(() => architectureDebtItems.id, { onDelete: 'cascade' }),
    adrId: uuid('adr_id')
      .notNull()
      .references(() => adrs.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.debtItemId, t.adrId] })],
)

export const debtInitiatives = pgTable(
  'debt_initiatives',
  {
    debtItemId: uuid('debt_item_id')
      .notNull()
      .references(() => architectureDebtItems.id, { onDelete: 'cascade' }),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.debtItemId, t.initiativeId] })],
)

export type ArchitectureDebtItem = typeof architectureDebtItems.$inferSelect
export type NewArchitectureDebtItem = typeof architectureDebtItems.$inferInsert
export type DebtType = (typeof debtTypeEnum.enumValues)[number]
export type DebtSeverity = (typeof debtSeverityEnum.enumValues)[number]
export type DebtStatus = (typeof debtStatusEnum.enumValues)[number]
export type DebtSource = (typeof debtSourceEnum.enumValues)[number]

