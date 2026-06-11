import Link from 'next/link'

/**
 * Consistent "View traceability →" entry point for entity detail pages
 * (#695). Matches the markup the Goal/Objective/Capability/Service pages
 * already use, so every participating entity offers the same affordance in
 * the same place. Navigation-only: never renders edit affordances.
 */
export function ViewTraceabilityLink({ from, id }: { from: string; id: string }) {
  return (
    <Link
      href={`/traceability?from=${from}&id=${id}`}
      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      View traceability →
    </Link>
  )
}
