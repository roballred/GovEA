/**
 * Name-similarity primitives shared by duplicate-detection features:
 * the cross-agency Capability Duplicates report (enterprise-view.ts, #538)
 * and the same-org Repository Duplicates report (duplicate-report.ts, #718).
 *
 * Pure functions — no DB, no framework imports.
 */

// Stopwords that carry no meaningful overlap signal. Tuned for government IT
// capability names; conservative — we'd rather flag a false positive than
// hide a real overlap. Filtered out before Jaccard.
export const NAME_STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'with', 'by',
  'system', 'systems', 'service', 'services', 'platform', 'platforms',
  'management', 'application', 'applications', 'integration', 'integrations',
  'capability', 'capabilities',
])

export const MIN_TOKEN_LENGTH = 3

/** Meaningful name tokens: lowercased, alphanumeric, stopwords removed. */
export function tokenize(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= MIN_TOKEN_LENGTH && !NAME_STOPWORDS.has(t)),
  )
}

/** Jaccard similarity (0..1) between two token sets. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const x of a) if (b.has(x)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}
