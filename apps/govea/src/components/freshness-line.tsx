/**
 * One-line freshness signal for entity detail pages (#553).
 *
 * Renders "Updated MM/DD/YYYY · Never reviewed" (or Reviewed-on date) right
 * after the title row so a Viewer can see how current the content is without
 * scrolling. The audit's #553 finding was that this metadata existed only in
 * the footer of each page — far enough down that scanning readers missed it
 * entirely. The Content Viewer persona's #2 pain is "Content is stale — no
 * way to know if what they're reading is current"; making this visible at
 * the top is the cheapest answer.
 *
 * The same component is wired in to capability, application, and ADR detail
 * pages. Other entity types (persona, initiative, objective, service,
 * value-stream, principle, glossary) keep their existing footer placement —
 * those pages were already meeting the persona's bar; reorganising them
 * isn't required.
 */

interface Props {
  updatedAt: Date | string
  lastReviewedAt?: Date | string | null
  /**
   * Optional label override. Defaults to "Updated"; ADRs prefer "Decided"
   * since the decision date is the more important reference point.
   */
  updatedLabel?: string
}

export function FreshnessLine({ updatedAt, lastReviewedAt, updatedLabel = 'Updated' }: Props) {
  const updated = new Date(updatedAt).toLocaleDateString()
  const reviewed = lastReviewedAt ? new Date(lastReviewedAt).toLocaleDateString() : null
  return (
    <p className="text-xs text-muted-foreground">
      {updatedLabel} {updated} ·{' '}
      {reviewed ? `Reviewed ${reviewed}` : 'Never reviewed'}
    </p>
  )
}
