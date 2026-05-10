/**
 * Completeness signals for the admin dashboard (#380 PR-3).
 *
 * Three independent surfaces:
 *   - getCategorizedSignals(orgId) → counts for the Stale / Unpublished /
 *     Incomplete-relationship drill-down tile
 *   - getMostNeededActions(orgId) → top-5 specific items ranked by a
 *     weighted heuristic (publishedButStale > incompleteRelationship >
 *     unpublished). Deterministic tie-break by entity-type alpha then
 *     by name.
 *   - getDomainRagBuckets(orgId) → for each capability domain, the
 *     published-rate vs the org-configured target, bucketed
 *     green/amber/red/neutral.
 *
 * All three respect PR-2's `org.completenessSettings`. Per ADR
 * `rm-query-performance-decision.md`, these are bounded queries (not
 * unbounded joins) and degrade gracefully when settings are absent.
 */
import { db } from '@/db/client'
import {
  capabilities, applications, personas, valueStreams,
  strategicObjectives, principles, glossaryTerms, initiatives, adrs,
  applicationCapabilities, capabilityPersonas,
  organizations,
  DEFAULT_COMPLETENESS_SETTINGS,
  type CompletenessSettings,
} from '@/db/schema'
import { and, count, eq, lt, notInArray, sql } from 'drizzle-orm'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategorizedSignals {
  stale: number
  unpublished: number
  incompleteRelationships: number
}

export type MostNeededReason = 'publishedButStale' | 'incompleteRelationship' | 'unpublished'

export interface MostNeededAction {
  /** Stable key used for React list rendering. */
  key: string
  entityType: 'capability' | 'application' | 'persona'
  entityId: string
  name: string
  reason: MostNeededReason
  /** Reason expressed as one short, plain-language sentence. */
  detail: string
  /** Rank score — higher = more impactful. Public for tests. */
  score: number
  href: string
}

export type RagBucket = 'green' | 'amber' | 'red' | 'neutral'

export interface DomainRag {
  domain: string
  publishedPct: number
  target: number | null
  bucket: RagBucket
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadSettings(orgId: string): Promise<CompletenessSettings> {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { completenessSettings: true },
  })
  return row?.completenessSettings ?? DEFAULT_COMPLETENESS_SETTINGS
}

function staleCutoff(settings: CompletenessSettings): Date {
  return new Date(Date.now() - settings.stalenessDays * 24 * 60 * 60 * 1000)
}

// ── Categorized drill-down counts ────────────────────────────────────────────

/**
 * Counts for the dashboard's three-category drill-down tile.
 *
 * - Stale: published items whose `updated_at` is older than the staleness window
 * - Unpublished: items in `draft` (or `proposed` for ADRs/initiatives)
 * - Incomplete relationships: capabilities with no application link OR no persona link
 *   (the most consequential case; broader coverage in a follow-up)
 */
export async function getCategorizedSignals(orgId: string): Promise<CategorizedSignals> {
  const settings = await loadSettings(orgId)
  const cutoff = staleCutoff(settings)

  // Stale: published items past the window across the nine content types.
  // Each query is org-scoped and uses the indexes added in PR-1.
  const stalePublished = (table: typeof capabilities | typeof applications | typeof personas | typeof valueStreams | typeof strategicObjectives | typeof principles | typeof glossaryTerms) =>
    db.select({ c: count() }).from(table).where(and(
      eq(table.organizationId, orgId),
      eq(table.status, 'published'),
      lt(table.updatedAt, cutoff),
    ))

  const [
    capStale, appStale, persStale, vsStale, objStale, prinStale, glossStale,
    capDraft, appDraft, persDraft, vsDraft, objDraft, prinDraft, glossDraft,
    initProposed, adrProposed,
    initStale, adrStale,
    capNoApp, capNoPersona,
  ] = await Promise.all([
    stalePublished(capabilities),
    stalePublished(applications),
    stalePublished(personas),
    stalePublished(valueStreams),
    stalePublished(strategicObjectives),
    stalePublished(principles),
    stalePublished(glossaryTerms),
    db.select({ c: count() }).from(capabilities).where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'draft'))),
    db.select({ c: count() }).from(applications).where(and(eq(applications.organizationId, orgId), eq(applications.status, 'draft'))),
    db.select({ c: count() }).from(personas).where(and(eq(personas.organizationId, orgId), eq(personas.status, 'draft'))),
    db.select({ c: count() }).from(valueStreams).where(and(eq(valueStreams.organizationId, orgId), eq(valueStreams.status, 'draft'))),
    db.select({ c: count() }).from(strategicObjectives).where(and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.status, 'draft'))),
    db.select({ c: count() }).from(principles).where(and(eq(principles.organizationId, orgId), eq(principles.status, 'draft'))),
    db.select({ c: count() }).from(glossaryTerms).where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.status, 'draft'))),
    db.select({ c: count() }).from(initiatives).where(and(eq(initiatives.organizationId, orgId), eq(initiatives.status, 'proposed'))),
    db.select({ c: count() }).from(adrs).where(and(eq(adrs.organizationId, orgId), eq(adrs.status, 'proposed'))),
    db.select({ c: count() }).from(initiatives).where(and(eq(initiatives.organizationId, orgId), eq(initiatives.status, 'active'), lt(initiatives.updatedAt, cutoff))),
    db.select({ c: count() }).from(adrs).where(and(eq(adrs.organizationId, orgId), eq(adrs.status, 'accepted'), lt(adrs.updatedAt, cutoff))),
    // Capabilities with no application link
    db.select({ c: count() }).from(capabilities)
      .where(and(
        eq(capabilities.organizationId, orgId),
        eq(capabilities.status, 'published'),
        notInArray(
          capabilities.id,
          db.select({ id: applicationCapabilities.capabilityId }).from(applicationCapabilities),
        ),
      )),
    // Capabilities with no persona link
    db.select({ c: count() }).from(capabilities)
      .where(and(
        eq(capabilities.organizationId, orgId),
        eq(capabilities.status, 'published'),
        notInArray(
          capabilities.id,
          db.select({ id: capabilityPersonas.capabilityId }).from(capabilityPersonas),
        ),
      )),
  ])

  const stale = Number(capStale[0].c) + Number(appStale[0].c) + Number(persStale[0].c)
    + Number(vsStale[0].c) + Number(objStale[0].c) + Number(prinStale[0].c)
    + Number(glossStale[0].c) + Number(initStale[0].c) + Number(adrStale[0].c)

  const unpublished = Number(capDraft[0].c) + Number(appDraft[0].c) + Number(persDraft[0].c)
    + Number(vsDraft[0].c) + Number(objDraft[0].c) + Number(prinDraft[0].c)
    + Number(glossDraft[0].c) + Number(initProposed[0].c) + Number(adrProposed[0].c)

  // A single capability missing both links contributes twice; this overcounts by
  // intent — operationally it's still one "incomplete cap" that needs two fixes.
  // Underlying drill-down list (out of scope here) shows distinct items.
  const incompleteRelationships = Number(capNoApp[0].c) + Number(capNoPersona[0].c)

  return { stale, unpublished, incompleteRelationships }
}

// ── Most-Needed Actions (top 5 ranked) ───────────────────────────────────────

interface CandidateRow {
  entityType: MostNeededAction['entityType']
  entityId: string
  name: string
  reason: MostNeededReason
}

/**
 * Top-5 specific items ranked by weighted contribution. Per
 * `rm-repository-completeness.md`, this list is shown only to Contributors
 * and Admins — caller is responsible for that gate.
 *
 * Heuristic:
 *   - publishedButStale: weight × 1 per item
 *   - incompleteRelationship: weight × 1 per item
 *   - unpublished: weight × 1 per item
 *
 * Tie-break: alpha by entityType, then alpha by name. Deterministic for tests.
 */
export async function getMostNeededActions(orgId: string): Promise<MostNeededAction[]> {
  const settings = await loadSettings(orgId)
  const cutoff = staleCutoff(settings)
  const w = settings.rankingWeights

  // We scope to capabilities, applications, personas. These three drive most
  // of the EA value and also have href patterns the dashboard already links.
  const [
    capsStale, appsStale, personasStale,
    capsDraft, appsDraft, personasDraft,
    capsNoApp, capsNoPersona,
  ] = await Promise.all([
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
      .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published'), lt(capabilities.updatedAt, cutoff))),
    db.select({ id: applications.id, name: applications.name }).from(applications)
      .where(and(eq(applications.organizationId, orgId), eq(applications.status, 'published'), lt(applications.updatedAt, cutoff))),
    db.select({ id: personas.id, name: personas.name }).from(personas)
      .where(and(eq(personas.organizationId, orgId), eq(personas.status, 'published'), lt(personas.updatedAt, cutoff))),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
      .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'draft'))),
    db.select({ id: applications.id, name: applications.name }).from(applications)
      .where(and(eq(applications.organizationId, orgId), eq(applications.status, 'draft'))),
    db.select({ id: personas.id, name: personas.name }).from(personas)
      .where(and(eq(personas.organizationId, orgId), eq(personas.status, 'draft'))),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
      .where(and(
        eq(capabilities.organizationId, orgId),
        eq(capabilities.status, 'published'),
        notInArray(capabilities.id, db.select({ id: applicationCapabilities.capabilityId }).from(applicationCapabilities)),
      )),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
      .where(and(
        eq(capabilities.organizationId, orgId),
        eq(capabilities.status, 'published'),
        notInArray(capabilities.id, db.select({ id: capabilityPersonas.capabilityId }).from(capabilityPersonas)),
      )),
  ])

  const tag = (
    rows: { id: string; name: string }[],
    entityType: MostNeededAction['entityType'],
    reason: MostNeededReason,
  ): CandidateRow[] => rows.map(r => ({ entityType, entityId: r.id, name: r.name, reason }))

  const candidates: CandidateRow[] = [
    ...tag(capsStale,      'capability',  'publishedButStale'),
    ...tag(appsStale,      'application', 'publishedButStale'),
    ...tag(personasStale,  'persona',     'publishedButStale'),
    ...tag(capsNoApp,      'capability',  'incompleteRelationship'),
    ...tag(capsNoPersona,  'capability',  'incompleteRelationship'),
    ...tag(capsDraft,      'capability',  'unpublished'),
    ...tag(appsDraft,      'application', 'unpublished'),
    ...tag(personasDraft,  'persona',     'unpublished'),
  ]

  // Score + dedupe (a capability can appear in multiple buckets; keep the
  // highest-weight reason for that item)
  const byEntity = new Map<string, MostNeededAction>()
  for (const c of candidates) {
    const score = scoreFor(c.reason, w)
    const key = `${c.entityType}:${c.entityId}`
    const existing = byEntity.get(key)
    if (!existing || score > existing.score) {
      byEntity.set(key, {
        key,
        entityType: c.entityType,
        entityId: c.entityId,
        name: c.name,
        reason: c.reason,
        detail: detailFor(c.reason, settings),
        score,
        href: hrefFor(c.entityType, c.entityId),
      })
    }
  }

  // Sort: score desc, then entityType alpha, then name alpha (deterministic)
  const sorted = [...byEntity.values()].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.entityType !== b.entityType) return a.entityType.localeCompare(b.entityType)
    return a.name.localeCompare(b.name)
  })

  return sorted.slice(0, 5)
}

function scoreFor(reason: MostNeededReason, w: CompletenessSettings['rankingWeights']): number {
  switch (reason) {
    case 'publishedButStale':       return w.publishedButStale
    case 'incompleteRelationship':  return w.incompleteRelationship
    case 'unpublished':             return w.unpublished
  }
}

function detailFor(reason: MostNeededReason, settings: CompletenessSettings): string {
  switch (reason) {
    case 'publishedButStale':       return `Published but not updated in ${settings.stalenessDays} days`
    case 'incompleteRelationship':  return 'Published but missing required relationship'
    case 'unpublished':             return 'Still in draft'
  }
}

function hrefFor(entityType: MostNeededAction['entityType'], id: string): string {
  switch (entityType) {
    case 'capability':  return `/capabilities/${id}`
    case 'application': return `/applications/${id}`
    case 'persona':     return `/personas/${id}`
  }
}

// ── RAG buckets per capability domain ────────────────────────────────────────

/**
 * Per-domain published-rate bucketed against `domainTargets` from settings.
 * Returns one row per existing domain (including null/uncategorized).
 *
 * Bucketing per `rm-repository-completeness.md`:
 *   green  ≥ target
 *   amber  within 15 points below target
 *   red    >15 below target
 *   neutral if no target is set for the domain
 */
export async function getDomainRagBuckets(orgId: string): Promise<DomainRag[]> {
  const settings = await loadSettings(orgId)

  const rows = await db.select({
    domain: capabilities.domain,
    total: count(),
    published: sql<number>`count(*) filter (where ${capabilities.status} = 'published')`,
  })
    .from(capabilities)
    .where(eq(capabilities.organizationId, orgId))
    .groupBy(capabilities.domain)

  return rows.map(r => {
    const total = Number(r.total)
    const published = Number(r.published)
    const publishedPct = total === 0 ? 0 : Math.round((published / total) * 100)
    const domainKey = r.domain ?? '__uncategorized__'
    const target = settings.domainTargets[domainKey] ?? null

    let bucket: RagBucket = 'neutral'
    if (target != null) {
      if (publishedPct >= target) bucket = 'green'
      else if (target - publishedPct <= 15) bucket = 'amber'
      else bucket = 'red'
    }

    return { domain: r.domain ?? '', publishedPct, target, bucket }
  })
}

