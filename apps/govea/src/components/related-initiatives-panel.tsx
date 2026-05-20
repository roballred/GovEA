import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { RelatedInitiative } from '@/actions/initiatives'

const STATUS_STYLES: Record<string, string> = {
  proposed:  'bg-slate-100 text-slate-700 border-slate-200',
  active:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  'on-hold': 'bg-amber-100 text-amber-800 border-amber-200',
  complete:  'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  active: 'Active',
  'on-hold': 'On Hold',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const IMPACT_STYLES: Record<string, string> = {
  build:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  improve: 'bg-blue-50 text-blue-700 border-blue-200',
  retire:  'bg-red-50 text-red-700 border-red-200',
  migrate: 'bg-amber-50 text-amber-700 border-amber-200',
}

function ImpactPair({ thisImpact, otherImpact, conflict }: { thisImpact: string | null; otherImpact: string | null; conflict: boolean }) {
  if (!thisImpact && !otherImpact) return null
  const base = 'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium'
  return (
    <span className={cn('inline-flex items-center gap-1', conflict && 'rounded ring-1 ring-red-300 dark:ring-red-700 pl-0.5 pr-1 py-0.5')}>
      {thisImpact && (
        <span className={cn(base, IMPACT_STYLES[thisImpact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
          this: {thisImpact}
        </span>
      )}
      <span className="text-xs text-muted-foreground">vs.</span>
      {otherImpact && (
        <span className={cn(base, IMPACT_STYLES[otherImpact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
          other: {otherImpact}
        </span>
      )}
    </span>
  )
}

/**
 * Read-only panel showing other initiatives that share at least one linked
 * capability or application with the current initiative. Surfaces both a
 * conservative "concurrent work" timeline overlap signal and a higher-confidence
 * "label conflict" signal (e.g. one initiative retires what another improves).
 *
 * Addresses #600 / business-stakeholder + programme-director persona need:
 * "see whether their programme's intended changes overlap with other active
 * initiatives — to find conflicts or opportunities to share."
 */
export function RelatedInitiativesPanel({ related }: { related: RelatedInitiative[] }) {
  if (related.length === 0) {
    return (
      <section aria-labelledby="related-initiatives-heading" className="space-y-3">
        <h2 id="related-initiatives-heading" className="text-base font-semibold">Concurrent work</h2>
        <p className="text-sm text-muted-foreground">
          No other published initiatives are linked to the same capabilities or applications. There&rsquo;s no detected overlap to coordinate around.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="related-initiatives-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="related-initiatives-heading" className="text-base font-semibold">Concurrent work</h2>
        <p className="text-sm text-muted-foreground">
          Other initiatives touching the same capabilities or applications. Conflict-labelled rows are sorted first.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-md border border-border">
        {related.map(r => (
          <li key={r.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Link href={`/initiatives/${r.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                  {r.name}
                </Link>
                {(r.startDate || r.endDate) && (
                  <p className="text-xs text-muted-foreground">
                    {[r.startDate, r.endDate].filter(Boolean).join(' → ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {r.hasLabelConflict && (
                  <span className="inline-flex items-center rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                    Label conflict
                  </span>
                )}
                {r.hasTimelineOverlap && !r.hasLabelConflict && (
                  <span className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Concurrent
                  </span>
                )}
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[r.status])}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            </div>

            {r.sharedCapabilities.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared capabilities</p>
                <ul className="space-y-1">
                  {r.sharedCapabilities.map(s => (
                    <li key={s.id} className="flex items-center gap-2 flex-wrap text-sm">
                      <Link href={`/capabilities/${s.id}`} className="hover:text-primary transition-colors">
                        {s.name}
                      </Link>
                      <ImpactPair thisImpact={s.thisImpact} otherImpact={s.otherImpact} conflict={false} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.sharedApplications.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared applications</p>
                <ul className="space-y-1">
                  {r.sharedApplications.map(s => {
                    const conflict = isOpposing(s.thisImpact, s.otherImpact)
                    return (
                      <li key={s.id} className="flex items-center gap-2 flex-wrap text-sm">
                        <Link href={`/applications/${s.id}`} className={cn('hover:text-primary transition-colors', conflict && 'font-medium')}>
                          {s.name}
                        </Link>
                        <ImpactPair thisImpact={s.thisImpact} otherImpact={s.otherImpact} conflict={conflict} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Duplicated from actions/initiatives.ts. The action is the source of truth for
// the row-level flag; this helper only highlights individual application rows.
function isOpposing(thisImpact: string | null, otherImpact: string | null): boolean {
  if (!thisImpact || !otherImpact) return false
  const RETIRE = 'retire'
  const BUILD = ['build', 'improve', 'migrate']
  return (thisImpact === RETIRE && BUILD.includes(otherImpact))
      || (otherImpact === RETIRE && BUILD.includes(thisImpact))
}
