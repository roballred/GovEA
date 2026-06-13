import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

/**
 * Provenance for records created by a starter content pack (#754).
 *
 * The plain-language marker in a record's description (`Example starter
 * content — replace or delete.`, #587/#749) was always documented as a *hint*
 * for humans, never a contract — an admin can edit or paste it, so it is not a
 * safe basis for bulk deletion. Instead we record exactly which rows a pack
 * apply created, here, so `removeStarterContent` can delete precisely those and
 * never touch records the org authored itself.
 *
 * Only *created* rows are recorded — apply skips records whose name already
 * exists, and those skipped rows (which may be the org's own) are deliberately
 * never recorded and so never removed.
 *
 * `entityType` matches the polymorphic vocabulary used elsewhere (e.g.
 * `entity_taxonomy_values.entityType`): 'persona' | 'capability' |
 * 'application' | 'objective' | 'adr' | 'initiative'. `entityId` has no FK —
 * it spans six content tables — so removal deletes the content row by id (its
 * junctions cascade) and clears the row here in the same transaction.
 */
export const starterContentRecords = pgTable(
  'starter_content_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    packName: text('pack_name').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    byOrgPack: index('scr_org_pack_idx').on(t.organizationId, t.packName),
  }),
)

export type StarterContentRecord = typeof starterContentRecords.$inferSelect
