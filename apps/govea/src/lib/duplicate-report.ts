/**
 * Same-org duplicate-candidate detection (#718).
 *
 * Pure grouping logic for the Repository Duplicates report: callers supply
 * the records for ONE organization and ONE entity type; this module finds
 * candidate groups in two tiers:
 *
 *  - `exact` — names equal after normalization (case, punctuation, and
 *    whitespace insensitive). The highest-confidence signal.
 *  - `near`  — meaningful-name-token Jaccard similarity at or above
 *    NEAR_THRESHOLD, compared only within the same `nearGroupKey` (e.g.
 *    capability domain or taxonomy type) so unrelated areas don't cross-flag.
 *
 * Detection only — no merging, no deletion, no mutation of inputs. The
 * report surfaces candidates for human review.
 *
 * Related, deliberately different normalizers:
 *  - duplicate-name-gate.ts `normaliseName` keeps punctuation (create-time
 *    soft-warn gate where "Permitting & Licensing" ≠ "Permitting Licensing").
 *    This report strips it — punctuation drift is exactly what it looks for.
 *  - enterprise-view.ts compares cross-org capability pairs at a looser
 *    threshold (0.33); same-org naming drift clusters tighter, so this
 *    report uses 0.5 to keep 13 entity-type sections reviewable.
 */

import { tokenize, jaccard } from '@/lib/name-similarity'

export type DuplicateRecord = {
  id: string
  name: string
  /** Human context shown next to the name (e.g. domain, parent type, status). */
  context?: string | null
  /** Status/visibility chip, when the entity has one. */
  status?: string | null
  /** Link to the source record (list or detail page). */
  href?: string | null
  /** Near-tier comparisons happen only within the same key. Default: one shared group. */
  nearGroupKey?: string | null
}

export type DuplicateGroup = {
  tier: 'exact' | 'near'
  /** 1 for exact groups; max pairwise Jaccard for near groups. */
  similarity: number
  records: DuplicateRecord[]
}

// Majority-token overlap. See module doc for why this is tighter than the
// cross-org report's 0.33.
export const NEAR_THRESHOLD = 0.5

/**
 * Case, punctuation, and whitespace insensitive name key.
 * "Case-Management!" → "case management".
 */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Find duplicate-candidate groups among `records`.
 *
 * Exact groups come first (alphabetical by normalized name); near groups
 * follow, ordered by similarity descending. Records already in an exact
 * group are excluded from near-tier comparison — the exact signal subsumes
 * the weaker one.
 */
export function findDuplicateGroups(records: DuplicateRecord[]): DuplicateGroup[] {
  // ── Exact tier ──────────────────────────────────────────────────────────
  const byNormalized = new Map<string, DuplicateRecord[]>()
  for (const r of records) {
    const key = normalizeName(r.name)
    if (key === '') continue
    const list = byNormalized.get(key) ?? []
    list.push(r)
    byNormalized.set(key, list)
  }

  const exactGroups: DuplicateGroup[] = [...byNormalized.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) => ({ tier: 'exact' as const, similarity: 1, records: list }))

  const inExactGroup = new Set(exactGroups.flatMap(g => g.records.map(r => r.id)))

  // ── Near tier ───────────────────────────────────────────────────────────
  // Pairwise Jaccard within each nearGroupKey, merged into connected groups
  // (A~B and B~C puts all three in one group for a single review pass).
  const candidates = records.filter(r => !inExactGroup.has(r.id) && normalizeName(r.name) !== '')
  const byKey = new Map<string, DuplicateRecord[]>()
  for (const r of candidates) {
    const key = r.nearGroupKey ?? ''
    const list = byKey.get(key) ?? []
    list.push(r)
    byKey.set(key, list)
  }

  const nearGroups: DuplicateGroup[] = []
  for (const group of byKey.values()) {
    if (group.length < 2) continue
    const tokens = group.map(r => tokenize(r.name))

    // Union-find over above-threshold pairs; similarity is resolved per
    // final root after all unions, so chained merges can't strand a value.
    const parent = group.map((_, i) => i)
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    const hits: { i: number; sim: number }[] = []

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const sim = jaccard(tokens[i], tokens[j])
        if (sim < NEAR_THRESHOLD) continue
        parent[find(j)] = find(i)
        hits.push({ i, sim })
      }
    }

    const members = new Map<number, DuplicateRecord[]>()
    for (let i = 0; i < group.length; i++) {
      const root = find(i)
      const list = members.get(root) ?? []
      list.push(group[i])
      members.set(root, list)
    }

    const rootSim = new Map<number, number>()
    for (const h of hits) {
      const root = find(h.i)
      rootSim.set(root, Math.max(rootSim.get(root) ?? 0, h.sim))
    }

    for (const [root, list] of members) {
      if (list.length < 2) continue
      nearGroups.push({ tier: 'near', similarity: rootSim.get(root) ?? NEAR_THRESHOLD, records: list })
    }
  }

  nearGroups.sort(
    (a, b) => b.similarity - a.similarity
      || normalizeName(a.records[0].name).localeCompare(normalizeName(b.records[0].name)),
  )

  return [...exactGroups, ...nearGroups]
}
