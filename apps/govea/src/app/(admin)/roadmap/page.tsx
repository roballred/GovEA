import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInitiatives } from '@/actions/initiatives'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'on-hold': 'bg-amber-100 text-amber-800 border-amber-200',
  complete: 'bg-blue-100 text-blue-700 border-blue-200',
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
  build: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  improve: 'bg-blue-50 text-blue-700 border-blue-200',
  retire: 'bg-red-50 text-red-700 border-red-200',
}

// Display order for grouping
const GROUP_ORDER = ['active', 'proposed', 'on-hold', 'complete', 'cancelled']
const GROUP_LABELS: Record<string, string> = {
  active: 'Active',
  proposed: 'Proposed',
  'on-hold': 'On Hold',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

export default async function RoadmapPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const allInitiatives = await getInitiatives(orgId)

  // Group by status, respecting display order
  const grouped = GROUP_ORDER.reduce<Record<string, typeof allInitiatives>>((acc, status) => {
    const group = allInitiatives.filter(i => i.status === status)
    if (group.length > 0) acc[status] = group
    return acc
  }, {})

  const hasInitiatives = allInitiatives.length > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
        <p className="text-muted-foreground mt-1">
          A time-phased view of initiatives grouped by status — showing which capabilities are being built, improved, or retired.
        </p>
      </div>

      {!hasInitiatives ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No initiatives yet.</p>
          <Link href="/initiatives" className="mt-2 inline-block text-sm text-primary hover:underline">
            Create an initiative →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([status, items]) => (
            <section key={status}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-semibold">{GROUP_LABELS[status]}</h2>
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
                  {items.length} {items.length === 1 ? 'initiative' : 'initiatives'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(initiative => (
                  <Link
                    key={initiative.id}
                    href={`/initiatives/${initiative.id}`}
                    className="group rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors space-y-3"
                  >
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm leading-snug group-hover:underline">
                        {initiative.name}
                      </span>
                      <span className={cn('shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>

                    {/* Timeline */}
                    {(initiative.startDate || initiative.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        {[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}
                      </p>
                    )}

                    {/* Capabilities */}
                    {initiative.initiativeCapabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {initiative.initiativeCapabilities.map(({ capability, impact }) => (
                          <span
                            key={capability.id}
                            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {capability.name}
                            {impact && (
                              <span className={cn('rounded border px-1 text-[10px] font-medium', IMPACT_STYLES[impact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                                {impact}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Objectives */}
                    {initiative.initiativeObjectives.length > 0 && (
                      <div className="space-y-0.5">
                        {initiative.initiativeObjectives.map(({ objective }) => (
                          <p key={objective.id} className="text-xs text-muted-foreground truncate">
                            ↗ {objective.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
