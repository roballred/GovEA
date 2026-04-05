import { db } from '@/db/client'
import { auditLog } from '@/db/schema'

interface AuditParams {
  action: string
  entityType: string
  entityId?: string
  userId?: string | null
  organizationId?: string | null
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditParams) {
  try {
    await db.insert(auditLog).values({
      action: params.action,
      entityType: params.entityType,
      entityId: (params.entityId ?? null) as any,
      userId: (params.userId ?? null) as any,
      organizationId: (params.organizationId ?? null) as any,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? null,
    })
  } catch (err) {
    // Audit failures should never crash the app
    console.error('[audit]', err)
  }
}
