/**
 * Duplicate-name soft-warn gate (#566).
 *
 * Surfaced by the Junior EA Analyst persona walk:
 *   "Contributing to the wrong capability domain or duplicating an
 *    existing record is a common error with no warning mechanism."
 *
 * Same shape as the publish-debt gate (#381) and the domain-owner
 * overwrite gate (#581):
 *   - typed error class the client form catches + re-submits with ack
 *   - server-side helper that throws unless the form sent `acknowledgeDuplicate=on`
 *
 * Per the issue, this is soft-warn: we DO NOT block duplicates outright.
 * A user who has reviewed the existing record and intends to create a
 * second one with the same name (e.g. different scope) can proceed by
 * confirming. The friction is the goal; the block is not.
 *
 * Name normalisation: case-insensitive + trimmed + collapsed whitespace.
 * "Online Permitting", "online permitting", and "Online  Permitting"
 * (double-space) all collide. Different normalisation than #538 across
 * orgs — keep them separate so that policy change is easy.
 */
import { db } from '@/db/client'
import {
  applications, capabilities, glossaryTerms, initiatives,
  personas, strategicObjectives, services,
} from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

/**
 * Normalise a column reference at the SQL layer:
 *   lower(regexp_replace(trim(col), '[[:space:]]+', ' ', 'g'))
 *
 * Matches the JS-side `normaliseName` exactly so a row that's
 * normalised-equal to the user's input is found regardless of casing
 * differences or internal whitespace runs.
 *
 * Note: PostgreSQL POSIX regex does NOT recognise `\s` as a whitespace
 * shorthand in its default (basic POSIX) mode — `\s` matches a literal
 * `s` character. The POSIX character class `[[:space:]]` is the
 * portable form. Easy footgun.
 */
function sqlNormalize(col: PgColumn) {
  return sql`lower(regexp_replace(trim(${col}), '[[:space:]]+', ' ', 'g'))`
}

/**
 * Entity types covered by the duplicate-name soft-warn. ADRs use
 * `number` as the unique key (hard-blocked separately by schema in
 * future work); the seven below all use `name` (or `term` for
 * glossary).
 */
export type DuplicateNameEntityType =
  | 'application'
  | 'capability'
  | 'glossary'
  | 'initiative'
  | 'persona'
  | 'objective'
  | 'service'

export const DUPLICATE_NAME_ENTITY_LABELS: Record<DuplicateNameEntityType, string> = {
  application: 'application',
  capability: 'capability',
  glossary: 'glossary term',
  initiative: 'initiative',
  persona: 'persona',
  objective: 'objective',
  service: 'service',
}

/**
 * Thrown when a non-ack'd create finds a name collision in the same
 * org. Carries the canonical existing name (with original casing) so
 * the client can render "A capability named 'Online Permitting' already
 * exists. Create anyway?" rather than echoing whatever the user typed.
 */
export class DuplicateNameAcknowledgmentRequiredError extends Error {
  readonly code = 'DUPLICATE_NAME_ACK_REQUIRED'
  readonly entityType: DuplicateNameEntityType
  readonly existingName: string

  constructor(entityType: DuplicateNameEntityType, existingName: string) {
    const label = DUPLICATE_NAME_ENTITY_LABELS[entityType]
    super(`A ${label} named "${existingName}" already exists in this organization. Submit again to create anyway.`)
    this.entityType = entityType
    this.existingName = existingName
  }
}

/**
 * Trim, collapse internal whitespace, lowercase. Used both at lookup
 * and (conceptually) at compare time. Returns empty string for empty
 * input so callers can short-circuit on missing names.
 */
export function normaliseName(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Returns the canonical (original-cased) existing name when a row
 * already exists in this org with a normalised-equal name. Returns
 * null otherwise.
 *
 * Uses `ilike` for case-insensitive match at the SQL level, then
 * normalises both sides in JS to honour the whitespace rule. The
 * SQL prefilter keeps the candidate set small enough that JS-side
 * normalisation is fine even at thousands of rows.
 */
export async function findDuplicateName(
  entityType: DuplicateNameEntityType,
  orgId: string,
  name: string,
): Promise<{ existingName: string } | null> {
  const target = normaliseName(name)
  if (!target) return null

  switch (entityType) {
    case 'application': {
      const row = await db.select({ name: applications.name }).from(applications)
        .where(and(eq(applications.organizationId, orgId), sql`${sqlNormalize(applications.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'capability': {
      const row = await db.select({ name: capabilities.name }).from(capabilities)
        .where(and(eq(capabilities.organizationId, orgId), sql`${sqlNormalize(capabilities.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'glossary': {
      const row = await db.select({ name: glossaryTerms.term }).from(glossaryTerms)
        .where(and(eq(glossaryTerms.organizationId, orgId), sql`${sqlNormalize(glossaryTerms.term)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'initiative': {
      const row = await db.select({ name: initiatives.name }).from(initiatives)
        .where(and(eq(initiatives.organizationId, orgId), sql`${sqlNormalize(initiatives.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'persona': {
      const row = await db.select({ name: personas.name }).from(personas)
        .where(and(eq(personas.organizationId, orgId), sql`${sqlNormalize(personas.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'objective': {
      const row = await db.select({ name: strategicObjectives.name }).from(strategicObjectives)
        .where(and(eq(strategicObjectives.organizationId, orgId), sql`${sqlNormalize(strategicObjectives.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
    case 'service': {
      const row = await db.select({ name: services.name }).from(services)
        .where(and(eq(services.organizationId, orgId), sql`${sqlNormalize(services.name)} = ${target}`))
        .limit(1)
      return row[0] ? { existingName: row[0].name } : null
    }
  }
}

/**
 * The gate itself. Call from createX after reading the form's
 * `acknowledgeDuplicate` flag:
 *
 *   const ack = formData.get('acknowledgeDuplicate') === 'on'
 *   await ensureNoDuplicateName('capability', orgId, name, ack)
 *
 * Throws when a duplicate exists AND the ack is missing.
 * Returns silently in every other case (no duplicate / duplicate but
 * explicitly acknowledged).
 */
export async function ensureNoDuplicateName(
  entityType: DuplicateNameEntityType,
  orgId: string,
  name: string,
  acknowledged: boolean,
): Promise<void> {
  if (acknowledged) return
  const dup = await findDuplicateName(entityType, orgId, name)
  if (dup) throw new DuplicateNameAcknowledgmentRequiredError(entityType, dup.existingName)
}
