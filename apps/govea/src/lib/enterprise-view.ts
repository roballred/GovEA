/**
 * Enterprise-view queries (#537, #538).
 *
 * Reads-only aggregation helpers for the central-IT Enterprise Architect:
 *
 *   - getCapabilityAdoption(orgId) — for each instance-visibility capability
 *     owned by the org, return the list of agencies that have linked to it.
 *     Powers the "Capability Adoption" report.
 *
 *   - findDuplicateCapabilityCandidates(orgId) — across all capabilities the
 *     caller can read (own + federated), surface candidate-pair duplicates
 *     using a domain-grouped token-Jaccard heuristic. Powers the "Capability
 *     Duplicates" report.
 *
 * Both honour the same federation rules `getCapabilities` enforces; they
 * never expose content the caller cannot already read through normal
 * detail-page navigation.
 */

import { db } from '@/db/client'
import { capabilities, crossOrgLinks, organizations } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { getConnectedOrgIds } from '@/lib/federation'
import { tokenize, jaccard, NAME_STOPWORDS } from '@/lib/name-similarity'

type LinkType = 'implements' | 'extends' | 'maps_to'
type LinkStatus = 'pending' | 'active' | 'rejected'

// ── Capability Adoption (#537) ─────────────────────────────────────────────

export type AdoptionLink = {
  /** The agency that linked to my capability. */
  sourceOrgId: string
  sourceOrgName: string
  /** Their capability that does the linking. */
  sourceCapabilityId: string
  sourceCapabilityName: string
  linkType: LinkType
  status: LinkStatus
}

export type AdoptedCapability = {
  id: string
  name: string
  description: string | null
  domain: string | null
  /** Inbound capability→capability links. */
  links: AdoptionLink[]
}

export type AdoptionReport = {
  /** Total instance-visibility capabilities the org publishes. */
  publishedCount: number
  /** Number of those with at least one inbound capability link. */
  adoptedCount: number
  /** Number of inbound links currently `status: 'pending'`. */
  pendingApprovalCount: number
  /** Distinct agency count across all inbound links. */
  agencyCount: number
  /** Every published capability (adopted or not), in name order. */
  capabilities: AdoptedCapability[]
}

/**
 * Compute the adoption report for `orgId`. Considers only capabilities the
 * org marks `visibility: 'instance'` (those a peer org can actually link to).
 * `connections`-visibility capabilities are out of scope — by definition
 * they are only visible to specifically-connected orgs and don't function as
 * a true enterprise-wide offering.
 */
export async function getCapabilityAdoption(orgId: string): Promise<AdoptionReport> {
  const published = await db.query.capabilities.findMany({
    where: and(eq(capabilities.organizationId, orgId), eq(capabilities.visibility, 'instance')),
    orderBy: (c, { asc }) => [asc(c.name)],
    columns: { id: true, name: true, description: true, domain: true },
  })
  if (published.length === 0) {
    return { publishedCount: 0, adoptedCount: 0, pendingApprovalCount: 0, agencyCount: 0, capabilities: [] }
  }

  const publishedIds = published.map(p => p.id)

  // Inbound capability→capability links targeting any of my capabilities.
  const inboundRows = await db.select({
    sourceOrgId: crossOrgLinks.sourceOrgId,
    sourceCapabilityId: crossOrgLinks.sourceEntityId,
    targetCapabilityId: crossOrgLinks.targetEntityId,
    linkType: crossOrgLinks.linkType,
    status: crossOrgLinks.status,
  })
    .from(crossOrgLinks)
    .where(and(
      eq(crossOrgLinks.targetOrgId, orgId),
      eq(crossOrgLinks.sourceEntityType, 'capability'),
      eq(crossOrgLinks.targetEntityType, 'capability'),
      inArray(crossOrgLinks.targetEntityId, publishedIds),
    ))

  if (inboundRows.length === 0) {
    return {
      publishedCount: published.length,
      adoptedCount: 0,
      pendingApprovalCount: 0,
      agencyCount: 0,
      capabilities: published.map(p => ({ ...p, links: [] })),
    }
  }

  // Resolve org names and capability names in two cheap lookups.
  const sourceOrgIds = [...new Set(inboundRows.map(r => r.sourceOrgId))]
  const sourceCapIds = [...new Set(inboundRows.map(r => r.sourceCapabilityId))]

  const [orgRows, capRows] = await Promise.all([
    db.select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, sourceOrgIds)),
    db.select({ id: capabilities.id, name: capabilities.name })
      .from(capabilities)
      .where(inArray(capabilities.id, sourceCapIds)),
  ])
  const orgNameById = new Map(orgRows.map(r => [r.id, r.name]))
  const capNameById = new Map(capRows.map(r => [r.id, r.name]))

  // Build per-target index.
  const linksByTarget = new Map<string, AdoptionLink[]>()
  for (const row of inboundRows) {
    const link: AdoptionLink = {
      sourceOrgId: row.sourceOrgId,
      sourceOrgName: orgNameById.get(row.sourceOrgId) ?? '(unknown org)',
      sourceCapabilityId: row.sourceCapabilityId,
      sourceCapabilityName: capNameById.get(row.sourceCapabilityId) ?? '(unknown capability)',
      linkType: row.linkType,
      status: row.status,
    }
    const existing = linksByTarget.get(row.targetCapabilityId) ?? []
    existing.push(link)
    linksByTarget.set(row.targetCapabilityId, existing)
  }

  return {
    publishedCount: published.length,
    adoptedCount: linksByTarget.size,
    pendingApprovalCount: inboundRows.filter(r => r.status === 'pending').length,
    agencyCount: sourceOrgIds.length,
    capabilities: published.map(p => ({ ...p, links: linksByTarget.get(p.id) ?? [] })),
  }
}

// ── Capability Duplicate Detection (#538) ──────────────────────────────────

export type DuplicateCandidate = {
  domain: string | null
  similarity: number  // 0..1 Jaccard on meaningful name tokens
  a: { id: string; name: string; description: string | null; orgId: string; orgName: string }
  b: { id: string; name: string; description: string | null; orgId: string; orgName: string }
}

// Tokenize/Jaccard primitives moved to name-similarity.ts so the same-org
// Repository Duplicates report (#718) shares them. Re-exported via _testing
// below to keep the existing unit-test surface.

// 0.33 catches the realistic "one of three meaningful tokens shared" case
// (e.g. "Online Permitting" vs "Permitting & Licensing System" → {permitting}
// shared, {online, permitting, licensing} union → 1/3). Tightening above this
// silently hides real candidate pairs in the data the audit walked.
const JACCARD_THRESHOLD = 0.33

/**
 * Find candidate duplicate pairs across the caller's visible capabilities.
 *
 * Algorithm: group capabilities by `domain` (null is its own group); within
 * each group, compare every pair by Jaccard similarity on meaningful name
 * tokens. Pairs ≥ JACCARD_THRESHOLD are returned, sorted by similarity DESC.
 *
 * Same-org pairs are excluded — duplication *within* one org is a separate
 * concern; this report is for the EA looking *across* agencies.
 */
export async function findDuplicateCapabilityCandidates(orgId: string): Promise<DuplicateCandidate[]> {
  const connectedOrgIds = await getConnectedOrgIds(orgId)

  // Same federation rule as getCapabilities — instance-wide + own + connected.
  const visible = await db.query.capabilities.findMany({
    where: (c, { eq: e, or, and: a, inArray: ia }) => {
      const own = e(c.organizationId, orgId)
      const instanceWide = e(c.visibility, 'instance')
      const connected = connectedOrgIds.length === 0
        ? undefined
        : a(ia(c.organizationId, connectedOrgIds), ia(c.visibility, ['connections', 'instance']))
      return connected ? or(own, instanceWide, connected) : or(own, instanceWide)
    },
    columns: { id: true, name: true, description: true, domain: true, organizationId: true },
  })

  if (visible.length < 2) return []

  // Resolve org names once.
  const ownerOrgIds = [...new Set(visible.map(v => v.organizationId))]
  const orgRows = await db.select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, ownerOrgIds))
  const orgNameById = new Map(orgRows.map(r => [r.id, r.name]))

  // Pre-tokenize once.
  const indexed = visible.map(c => ({
    ...c,
    tokens: tokenize(c.name),
    orgName: orgNameById.get(c.organizationId) ?? '(unknown org)',
  }))

  // Group by domain key (null becomes the empty string for grouping).
  const byDomain = new Map<string, typeof indexed>()
  for (const c of indexed) {
    const k = c.domain ?? ''
    const list = byDomain.get(k) ?? []
    list.push(c)
    byDomain.set(k, list)
  }

  const out: DuplicateCandidate[] = []
  for (const [domainKey, group] of byDomain) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j]
        if (a.organizationId === b.organizationId) continue  // intra-org excluded
        const sim = jaccard(a.tokens, b.tokens)
        if (sim < JACCARD_THRESHOLD) continue
        out.push({
          domain: domainKey === '' ? null : domainKey,
          similarity: sim,
          a: { id: a.id, name: a.name, description: a.description, orgId: a.organizationId, orgName: a.orgName },
          b: { id: b.id, name: b.name, description: b.description, orgId: b.organizationId, orgName: b.orgName },
        })
      }
    }
  }

  out.sort((a, b) => b.similarity - a.similarity)
  return out
}

// Exported for unit-testability. The pages don't use it directly.
export const _testing = {
  tokenize,
  jaccard,
  JACCARD_THRESHOLD,
  NAME_STOPWORDS,
}
