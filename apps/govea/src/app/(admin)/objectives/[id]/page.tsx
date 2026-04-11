import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getObjective } from '@/actions/objectives'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
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

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const obj = await getObjective(id)
  if (!obj) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/objectives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Strategic Objectives
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{obj.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[obj.status])}>
              {obj.status.charAt(0).toUpperCase() + obj.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[obj.visibility])}>
              {VISIBILITY_LABELS[obj.visibility]}
            </span>
          </div>
        </div>

        {obj.description && (
          <p className="text-muted-foreground">{obj.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-1 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Metric</p>
            <p>{obj.successMetric || <span className="text-muted-foreground">—</span>}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time Horizon</p>
            <p>{obj.timeHorizon || <span className="text-muted-foreground">—</span>}</p>
          </div>
        </div>
      </div>

      <hr />

      {/* Linked Value Streams */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Value Streams</h2>
        {obj.objectiveValueStreams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No value streams linked.</p>
        ) : (
          <div className="space-y-2">
            {obj.objectiveValueStreams.map(({ valueStream }) => (
              <Link
                key={valueStream.id}
                href={`/value-streams/${valueStream.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-sm">{valueStream.name}</span>
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[valueStream.status])}>
                  {valueStream.status.charAt(0).toUpperCase() + valueStream.status.slice(1)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Linked Capabilities */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Capabilities</h2>
        {obj.objectiveCapabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No capabilities linked.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {obj.objectiveCapabilities.map(({ capability }) => (
              <Link
                key={capability.id}
                href={`/capabilities/${capability.id}`}
                className="inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
              >
                {capability.name}
                {capability.domain && <span className="ml-2 text-xs text-blue-400">{capability.domain}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(obj.createdAt).toLocaleDateString()} · Updated {new Date(obj.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
