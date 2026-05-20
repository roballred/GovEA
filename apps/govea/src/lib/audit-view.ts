import { db } from '@/db/client'
import { auditLog, users } from '@/db/schema'
import { and, eq, desc, inArray } from 'drizzle-orm'

/**
 * Entity types whose audit events are visible to Contributors (#597).
 *
 * This is an explicit allowlist, not a blocklist — new sensitive event types
 * added in future code should default to admin-only unless someone reviews
 * them and adds them here. Anything touching authentication, organization
 * settings, user management, or instance scope is intentionally excluded.
 *
 * The Domain Architect, Consultant/SI, and Agency EA Coordinator persona walks
 * all called this scope out: a contributor needs to read the recent past of
 * the architecture content they edit, without an admin escalation.
 *
 * To keep this list in sync with new code: when adding a new entity type to
 * audit events, deliberately decide whether it belongs here. The default is
 * "no" — `users`, `org_connection`, `instance_settings`, `admin_notice`,
 * `act_as_session`, `break_glass_session`, `organization`, `platform_config`
 * are admin-scope by design and must not appear in this list.
 */
export const CONTRIBUTOR_VISIBLE_ENTITY_TYPES = [
  'adr',
  'application',
  'architecture_debt_item',
  'capability',
  'cross_org_link',
  'data_attribute',
  'data_business_key',
  'data_entity',
  'data_link',
  'decision',
  'glossary',
  'glossary term',
  'goal',
  'initiative',
  'objective',
  'persona',
  'principle',
  'service',
  'taxonomy_term',
  'value stream',
  'value_stream',
] as const

export type AuditViewRole = 'admin' | 'contributor'

/**
 * Returns audit log entries scoped to the caller's role.
 *
 * - `admin`: every event for the org (full audit view).
 * - `contributor`: only events on architecture-content entity types
 *   (CONTRIBUTOR_VISIBLE_ENTITY_TYPES). Authentication, user management,
 *   org settings, and instance scope are hidden.
 *
 * Viewers must be redirected away by the caller — they never reach this
 * helper. The page-level gate is `canEdit(session.user)`; this helper
 * assumes the caller already enforced that.
 */
export async function getAuditEntries(orgId: string, role: AuditViewRole, limit = 200) {
  const where = role === 'admin'
    ? eq(auditLog.organizationId, orgId)
    : and(
        eq(auditLog.organizationId, orgId),
        inArray(auditLog.entityType, [...CONTRIBUTOR_VISIBLE_ENTITY_TYPES]),
      )

  return db
    .select({ log: auditLog, user: users })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
}
