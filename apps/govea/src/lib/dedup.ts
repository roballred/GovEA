/**
 * Cross-entity deduplication utility
 *
 * ## Product rule — single-appearance guarantee
 *
 * An entity (application, capability, or any other record with an `id`)
 * appears **at most once** in any cross-entity view, regardless of how many
 * graph paths lead to it.
 *
 * ### Why this matters
 *
 * GovEA's data model is a graph, not a tree. A single application can be
 * reachable through several paths in the same view:
 *
 *   Objective A → direct link → App X
 *   Objective A → Capability B → App X   (App X is linked to both)
 *
 * Showing App X twice in the same view would imply the portfolio is larger
 * than it is and mislead stakeholders about the technology footprint.
 *
 * ### Multiple paths are signal, not duplicates
 *
 * The *presence* of multiple paths reaching the same application is
 * architecturally meaningful: it indicates the application is load-bearing
 * or cross-cutting. That signal belongs in a future portfolio heat-map
 * feature, not in the count of items in a list.
 *
 * ### Direct links vs. capability-mediated links
 *
 * GovEA currently supports both:
 *   - Direct: Objective → Application
 *   - Mediated: Objective → Capability → Application
 *
 * Direct links bypass the capability layer and obscure the "what the
 * organisation does" view. Future work should evaluate whether to
 * deprecate direct obj→app and service→app links in favour of the
 * capability-mediated path. Until that decision is made, both link types
 * are merged before deduplication.
 *
 * ### Where to apply
 *
 * Any view, report, or API response that aggregates entities across graph
 * paths **must** call `dedupeById` before rendering. This includes:
 *   - Traceability views (objective, capability, service)
 *   - Application portfolio heat maps (planned)
 *   - Capability coverage reports (planned)
 *   - Executive roadmap / timeline views (planned)
 *
 * @see https://github.com/roballred/GovEA/issues/227
 */

/**
 * Returns a new array containing only the first occurrence of each item,
 * identified by `item.id`. Order is preserved (first-seen wins).
 *
 * @example
 * const apps = dedupeById([
 *   { id: 'a', name: 'Finance' },
 *   { id: 'b', name: 'HR' },
 *   { id: 'a', name: 'Finance' },   // duplicate — removed
 * ])
 * // → [{ id: 'a', name: 'Finance' }, { id: 'b', name: 'HR' }]
 */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
