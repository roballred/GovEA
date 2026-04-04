export interface AuditEvent {
  action: string
  entityType: string
  entityId: string
  userId?: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  timestamp: Date
}

export function diffObjects(before: unknown, after: unknown): { before: unknown; after: unknown } {
  return { before, after }
}
