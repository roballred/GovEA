import { date, index, jsonb, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export type SnapshotEntityCounts = {
  total: number
  /**
   * "Mature" count — what counts as mature depends on the entity:
   *   - capabilities, applications, personas, valueStreams,
   *     strategicObjectives, principles, glossaryTerms: status = 'published'
   *   - initiatives: status in ('active','complete')
   *   - adrs: status = 'accepted'
   * The aggregate score is mature/total across all entities.
   */
  mature: number
}

export type SnapshotCounts = {
  capabilities: SnapshotEntityCounts
  applications: SnapshotEntityCounts
  personas: SnapshotEntityCounts
  valueStreams: SnapshotEntityCounts
  strategicObjectives: SnapshotEntityCounts
  principles: SnapshotEntityCounts
  glossaryTerms: SnapshotEntityCounts
  initiatives: SnapshotEntityCounts
  adrs: SnapshotEntityCounts
}

export const completenessSnapshots = pgTable(
  'completeness_snapshots',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    snapshotDate: date('snapshot_date').notNull(),
    computedAt: timestamp('computed_at').notNull().defaultNow(),
    counts: jsonb('counts').$type<SnapshotCounts>().notNull(),
    lastUpdated: timestamp('last_updated'),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.snapshotDate] }),
    index('completeness_snapshots_org_date_desc_idx').on(t.organizationId, t.snapshotDate.desc()),
  ],
)

export type CompletenessSnapshot = typeof completenessSnapshots.$inferSelect
export type NewCompletenessSnapshot = typeof completenessSnapshots.$inferInsert
