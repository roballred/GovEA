// ---------------------------------------------------------------------------
// Audit Trail
// Every change to a content item is recorded. The actual storage is handled
// by the app's database layer — the core provides the types and the helper
// that computes a diff between old and new values.
// ---------------------------------------------------------------------------

export type AuditAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'published' | 'archived'

export interface AuditEntry {
  id?: string
  createdAt?: Date
  userId: string
  action: AuditAction
  entityType: string        // content type name e.g. 'capability'
  entityId: string
  organizationId?: string
  changes?: AuditChanges
}

export interface AuditChanges {
  before: Record<string, unknown>
  after: Record<string, unknown>
  diff: Record<string, { from: unknown; to: unknown }>
}

// Compute the diff between two records — only changed fields are included
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChanges {
  const diff: Record<string, { from: unknown; to: unknown }> = {}

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of allKeys) {
    const prev = before[key]
    const next = after[key]
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      diff[key] = { from: prev, to: next }
    }
  }

  return { before, after, diff }
}

// Type for the audit writer function that apps provide
// The app wires this up to their database (e.g. Prisma)
export type AuditWriter = (entry: AuditEntry) => Promise<void>

let _writer: AuditWriter | null = null

export function configureAuditWriter(writer: AuditWriter): void {
  _writer = writer
}

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  if (!_writer) {
    // In development, log to console if no writer is configured
    if (process.env.NODE_ENV === 'development') {
      console.debug('[audit]', entry.action, entry.entityType, entry.entityId, entry.changes?.diff)
    }
    return
  }
  await _writer(entry)
}
