import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getValueStream } from '@/actions/value-streams'
import { getCapabilities } from '@/actions/capabilities'
import { StageManager } from './stage-manager'
import type { Role } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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

export default async function ValueStreamDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as Role
  const orgId = (session.user as any).organizationId as string
  const canEdit = role === 'admin' || role === 'contributor'

  const [vs, capabilityList] = await Promise.all([
    getValueStream(params.id),
    getCapabilities(orgId),
  ])

  if (!vs) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Back link */}
      <Link href="/value-streams" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Value Streams
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{vs.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[vs.status])}>
              {vs.status.charAt(0).toUpperCase() + vs.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[vs.visibility])}>
              {VISIBILITY_LABELS[vs.visibility]}
            </span>
          </div>
        </div>

        {vs.description && (
          <p className="text-muted-foreground">{vs.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          <div>
            <span className="text-muted-foreground">Stakeholder: </span>
            {vs.stakeholderPersona
              ? <span className="font-medium">{vs.stakeholderPersona.name}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
          <div>
            <span className="text-muted-foreground">Value delivered: </span>
            {vs.valueItem
              ? <span className="font-medium">{vs.valueItem}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
          <div>
            <span className="text-muted-foreground">Stages: </span>
            <span className="font-medium">{vs.stages.length}</span>
          </div>
        </div>
      </div>

      <hr />

      {/* Stages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stages</h2>
          <span className="text-sm text-muted-foreground">
            {vs.stages.length === 0 ? 'No stages yet' : `${vs.stages.length} stage${vs.stages.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {vs.stages.length === 0 && !canEdit && (
          <p className="text-sm text-muted-foreground py-4">No stages have been defined for this value stream yet.</p>
        )}

        {/* Existing stages (read view) */}
        {vs.stages.length > 0 && (
          <div className="space-y-3">
            {vs.stages.map((stage, idx) => (
              <div key={stage.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{stage.name}</span>
                </div>
                {stage.description && (
                  <p className="text-sm text-muted-foreground pl-9">{stage.description}</p>
                )}
                {stage.stageCapabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {stage.stageCapabilities.map(({ capability }) => (
                      <span
                        key={capability.id}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {capability.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stage manager for editors */}
        {canEdit && (
          <StageManager
            valueStreamId={vs.id}
            stages={vs.stages}
            capabilities={capabilityList}
          />
        )}
      </div>
    </div>
  )
}
