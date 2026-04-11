import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getInitiative } from '@/actions/initiatives'
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

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only',
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const initiative = await getInitiative(id)
  if (!initiative) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/initiatives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Initiatives
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{initiative.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[initiative.status])}>
              {STATUS_LABELS[initiative.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[initiative.visibility])}>
              {VISIBILITY_LABELS[initiative.visibility]}
            </span>
          </div>
        </div>

        {initiative.description && (
          <p className="text-muted-foreground">{initiative.description}</p>
        )}

        {(initiative.startDate || initiative.endDate) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timeline</span>
            <span>{[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}</span>
          </div>
        )}
      </div>

      <hr />

      {/* Linked Capabilities */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Capabilities</h2>
        {initiative.initiativeCapabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No capabilities linked.</p>
        ) : (
          <div className="space-y-2">
            {initiative.initiativeCapabilities.map(({ capability, impact }) => (
              <Link
                key={capability.id}
                href={`/capabilities/${capability.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-sm">{capability.name}</span>
                <div className="flex items-center gap-2">
                  {capability.domain && (
                    <span className="text-xs text-muted-foreground">{capability.domain}</span>
                  )}
                  {impact && (
                    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', IMPACT_STYLES[impact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                      {impact}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Linked Objectives */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Strategic Objectives</h2>
        {initiative.initiativeObjectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No strategic objectives linked.</p>
        ) : (
          <div className="space-y-2">
            {initiative.initiativeObjectives.map(({ objective }) => (
              <Link
                key={objective.id}
                href={`/objectives/${objective.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-sm">{objective.name}</span>
                {objective.timeHorizon && (
                  <span className="text-xs text-muted-foreground">{objective.timeHorizon}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(initiative.createdAt).toLocaleDateString()} · Updated {new Date(initiative.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
