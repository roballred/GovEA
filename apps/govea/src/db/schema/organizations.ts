import { type AnyPgColumn, boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const visibilityEnum = pgEnum('visibility', ['org', 'connections', 'instance'])

/**
 * Per-organization security policy (#527 / ac-security-settings).
 *
 * Surfaced by the CMS Administrator persona walk: government IT admins
 * are routinely required to set agency-standard password and lockout
 * policies — touching a config file is a non-starter, so the policy
 * must be admin-configurable from the UI.
 *
 * Stored as JSONB so adding a new policy knob doesn't require a migration.
 * Per the capability rule, changes apply to FUTURE logins and sessions —
 * existing sessions are not immediately terminated.
 *
 *  - `passwordMinLength` / `require*`     — enforced by validatePassword
 *  - `sessionTimeoutMinutes`              — enforced by the jwt callback
 *  - `lockoutThreshold` / `lockoutDur..`  — enforced by the credentials provider
 *  - `passwordExpiryDays`                 — enforced by the admin-layout redirect
 *
 * A value of 0 for `lockoutThreshold` / `passwordExpiryDays` means
 * disabled (no enforcement). `sessionTimeoutMinutes` falls back to the
 * 24h NextAuth default if missing.
 */
export type SecuritySettings = {
  passwordMinLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireDigit: boolean
  requireSpecial: boolean
  sessionTimeoutMinutes: number
  lockoutThreshold: number
  lockoutDurationMinutes: number
  passwordExpiryDays: number
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  passwordMinLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  requireSpecial: false,
  sessionTimeoutMinutes: 1440, // 24h — matches NextAuth's previous static default
  lockoutThreshold: 5,
  lockoutDurationMinutes: 30,
  passwordExpiryDays: 0,
}

/**
 * Confidence-summary publication settings (#380 PR-2).
 *
 * `enabled` is retained for backwards compatibility with PR-1 callers — it
 * is interpreted as `authenticatedVisibility` when the new fields are absent.
 * New callers should set `authenticatedVisibility` and `publicVisibility`
 * directly. The legacy `enabled` field is kept until PR-4 can drop it
 * cleanly across all callers.
 */
export type ConfidenceSettings = {
  enabled: boolean
  narrative: string | null
  suppressBelowPercent: number
  /**
   * Whether authenticated users (Admin / Contributor / Viewer) see the
   * confidence summary on stakeholder-facing surfaces. Defaults to the
   * value of `enabled` for legacy rows that pre-date this split.
   */
  authenticatedVisibility?: boolean
  /**
   * Whether unauthenticated (public) viewers see the confidence summary.
   * Always defaults to false; must be enabled as an explicit second step
   * even if `authenticatedVisibility` is true. Per
   * `fd-repository-confidence-summary.md`, the controls are independent.
   */
  publicVisibility?: boolean
}

/**
 * Completeness drill-down + scoring settings (#380 PR-2).
 *
 * `stalenessDays` replaces the hardcoded `REVIEW_WINDOW_DAYS = 90` in the
 * admin dashboard's Review Health section.
 *
 * `domainTargets` and `rankingWeights` are stored now to avoid a follow-up
 * migration in PR-3, but their wiring into the RAG indicators and the
 * "most-needed actions" ranked list lands in PR-3.
 */
export type CompletenessSettings = {
  stalenessDays: number
  /**
   * Per-capability-domain completeness targets, keyed by the domain string
   * stored on the capability row. Values are integers 0–100.
   * E.g. { 'cms': 60, 'ea': 70 }. PR-3 wires these into RAG indicators.
   */
  domainTargets: Record<string, number>
  /**
   * Heuristic weights for the "most-needed actions" ranking in PR-3.
   * Higher = larger contribution to ranking score.
   */
  rankingWeights: {
    publishedButStale: number
    incompleteRelationship: number
    unpublished: number
  }
}

export const DEFAULT_COMPLETENESS_SETTINGS: CompletenessSettings = {
  stalenessDays: 90,
  domainTargets: {},
  rankingWeights: {
    publishedButStale: 3,
    incompleteRelationship: 2,
    unpublished: 1,
  },
}

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  theme: text('theme').notNull().default('govea'),
  enabledModules: jsonb('enabled_modules').$type<Record<string, boolean>>().notNull().default({}),
  confidenceSettings: jsonb('confidence_settings').$type<ConfidenceSettings>(),
  completenessSettings: jsonb('completeness_settings').$type<CompletenessSettings>(),
  securitySettings: jsonb('security_settings').$type<SecuritySettings>(),
  isSystemOrg: boolean('is_system_org').notNull().default(false),
  parentId: uuid('parent_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
  suspendedAt: timestamp('suspended_at'),
  suspendedReason: text('suspended_reason'),
  supportTier: text('support_tier'),
  internalNotes: text('internal_notes'),
  /**
   * #529: timestamp of the last successful backup export (any of recipe,
   * content, or archive). Updated by the export endpoints in a single
   * transaction so the dashboard surface stays accurate. Null = never
   * exported.
   */
  lastExportAt: timestamp('last_export_at'),
  /**
   * #529: byte size of the most recent export, paired with `lastExportAt`.
   * Useful for dashboard scale ("Last backup: 2 hours ago, 1.2 MB") and
   * to flag suspiciously-empty exports.
   */
  lastExportBytes: integer('last_export_bytes'),
  /**
   * #529 PR2: timestamp of the last successful archive import. Symmetric
   * with `lastExportAt` so the dashboard can show "last restored" when an
   * import has overwritten the content more recently than the last export.
   * Null = never imported.
   */
  lastImportAt: timestamp('last_import_at'),
  lastImportBytes: integer('last_import_bytes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
