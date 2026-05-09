import type { db } from '@/db/client'
import { auditLog } from '@/db/schema'

/**
 * Audit-log writer (#416).
 *
 * Always pass either the top-level `db` client or a Drizzle transaction
 * handle (`tx`) as the first argument. When called inside a transaction the
 * audit insert participates in that transaction — if the mutation fails, the
 * audit row never appears, and if the audit insert fails, the mutation rolls
 * back. The previous fail-silent `try { … } catch { console.error }` pattern
 * is removed: audit writes are now first-class data integrity work, not best
 * effort.
 *
 * Typical usage in a server action:
 *
 *   await db.transaction(async (tx) => {
 *     await tx.update(table).set(...).where(...)
 *     await writeAuditLog(tx, { action: '...', ... })
 *   })
 *
 * For pure-audit events (login success / failure / sign-out) where there is
 * no companion mutation, pass `db` directly:
 *
 *   await writeAuditLog(db, { action: 'auth.login', ... })
 */

// Structural type that accepts both the top-level db and a Drizzle tx handle.
// Drizzle's transaction callback receives a typed transaction client whose
// .insert API is shape-compatible with the top-level db.
type DBOrTx = Pick<typeof db, 'insert'>

export interface AuditParams {
  action: string
  entityType: string
  entityId?: string
  userId?: string | null
  organizationId?: string | null
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(tx: DBOrTx, params: AuditParams): Promise<void> {
  await tx.insert(auditLog).values({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    userId: params.userId ?? null,
    organizationId: params.organizationId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
    metadata: params.metadata ?? null,
  })
}
