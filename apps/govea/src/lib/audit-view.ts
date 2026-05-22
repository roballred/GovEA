import { db } from '@/db/client'
import { auditLog, users } from '@/db/schema'
import { and, eq, desc, gte, inArray, like, sql, type SQL } from 'drizzle-orm'

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
/** Filters surfaced by the /audit URL (#531). */
export type AuditFilters = {
  /** Caller chose a specific actor; null = all actors. */
  actorUserId?: string | null
  /**
   * One or more action namespaces (the part before the first `.`).
   * Empty = all actions. Matched with `action LIKE 'ns.%'` so a single
   * URL param can carry multiple comma-separated namespaces.
   */
  actionNamespaces?: string[]
  /** Cutoff for `createdAt >= since`. null = no time window. */
  since?: Date | null
}

/** Time-window presets exposed by the filter UI. */
export type AuditTimeWindow = '24h' | '7d' | '30d' | '90d' | 'all'

export function timeWindowToDate(window: AuditTimeWindow): Date | null {
  const now = Date.now()
  switch (window) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000)
    case '7d':  return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000)
    case 'all': return null
  }
}

export async function getAuditEntries(
  orgId: string,
  role: AuditViewRole,
  filters: AuditFilters = {},
  limit = 200,
) {
  const clauses: SQL[] = [eq(auditLog.organizationId, orgId)]
  if (role === 'contributor') {
    clauses.push(inArray(auditLog.entityType, [...CONTRIBUTOR_VISIBLE_ENTITY_TYPES]))
  }
  if (filters.actorUserId) {
    clauses.push(eq(auditLog.userId, filters.actorUserId))
  }
  if (filters.actionNamespaces && filters.actionNamespaces.length > 0) {
    // OR across namespaces — match action LIKE 'ns.%' for each.
    const orClauses = filters.actionNamespaces.map(ns => like(auditLog.action, `${ns}.%`))
    clauses.push(sql`(${sql.join(orClauses, sql` OR `)})`)
  }
  if (filters.since) {
    clauses.push(gte(auditLog.createdAt, filters.since))
  }

  return db
    .select({ log: auditLog, user: users })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(and(...clauses))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
}

/**
 * Returns distinct actors (id, name, email) who have audit-log entries
 * in this org. Drives the actor-filter dropdown. Scoped to the role's
 * visible entity-types so a Contributor doesn't see admin-only actors
 * leak through the filter list.
 */
export async function getAuditActorOptions(orgId: string, role: AuditViewRole) {
  const clauses: SQL[] = [eq(auditLog.organizationId, orgId)]
  if (role === 'contributor') {
    clauses.push(inArray(auditLog.entityType, [...CONTRIBUTOR_VISIBLE_ENTITY_TYPES]))
  }
  const rows = await db
    .selectDistinct({ id: users.id, name: users.name, email: users.email })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.userId, users.id))
    .where(and(...clauses))
    .orderBy(users.name)
  return rows
}

/**
 * Returns distinct action namespaces (`split_part(action, '.', 1)`) that
 * have at least one row in this org's audit log. Drives the action-filter
 * multi-select. Role-scoped same as the actor lookup above.
 */
export async function getAuditActionNamespaces(orgId: string, role: AuditViewRole) {
  const clauses: SQL[] = [eq(auditLog.organizationId, orgId)]
  if (role === 'contributor') {
    clauses.push(inArray(auditLog.entityType, [...CONTRIBUTOR_VISIBLE_ENTITY_TYPES]))
  }
  const rows = await db
    .select({ ns: sql<string>`split_part(${auditLog.action}, '.', 1)` })
    .from(auditLog)
    .where(and(...clauses))
    .groupBy(sql`split_part(${auditLog.action}, '.', 1)`)
    .orderBy(sql`split_part(${auditLog.action}, '.', 1)`)
  return rows.map(r => r.ns).filter(Boolean)
}
