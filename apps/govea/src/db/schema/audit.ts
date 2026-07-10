/**
 * Append-only audit log — owned by `@govcore/schema` and re-exported for
 * `@/db/schema` consumers. Phase 1b (#900). The append-only trigger (UPDATE /
 * DELETE blocked) now ships as a core migration applied by `govcore-migrate`,
 * so the local `db/sql/audit-immutable.sql` is retired.
 */
export { auditLog, type AuditEntry, type NewAuditEntry } from '@govcore/schema'
