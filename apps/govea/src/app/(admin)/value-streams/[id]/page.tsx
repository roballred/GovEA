import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getValueStream } from '@/actions/value-streams'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'
import { RelationshipPanel } from '@/components/relationship-panel'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { MarkdownContent } from '@/components/markdown-content'

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

export default async function ValueStreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!

  const [vs, enabledModules] = await Promise.all([
    getValueStream(id),
    getEnabledModules(),
  ])

  if (!vs) notFound()
  // #726 — the detail page is read-oriented. Editing stages, stage
  // capabilities, stream-level capabilities, and personas lives on the
  // dedicated edit route; here we only show whether to offer the edit link.
  const canMutate = editor && vs.organizationId === orgId

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link href="/value-streams" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Value Streams
        </Link>
        <ViewTraceabilityLink from="value-stream" id={id} />
      </div>

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
          <MarkdownContent>{vs.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
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

      {canMutate && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/value-streams/${id}/edit`}>Edit value stream</Link>
          </Button>
        </div>
      )}

      <hr />

      {/* Stages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stages</h2>
          <span className="text-sm text-muted-foreground">
            {vs.stages.length === 0 ? 'No stages yet' : `${vs.stages.length} stage${vs.stages.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {vs.stages.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No stages have been defined for this value stream yet.
            {canMutate && <> Use <Link href={`/value-streams/${id}/edit`} className="underline hover:text-foreground">Edit value stream</Link> to add some.</>}
          </p>
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
                {isModuleEnabled(enabledModules, 'capabilities') && stage.stageCapabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {stage.stageCapabilities.map(({ capability }) => (
                      <Link
                        key={capability.id}
                        href={`/capabilities/${capability.id}`}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        {capability.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <div className="space-y-1.5">
          <RelationshipPanel
            title="Business Capabilities"
            items={vs.valueStreamCapabilities.map(({ capability }) => ({
              id: capability.id, name: capability.name,
              href: `/capabilities/${capability.id}`,
            }))}
            canEdit={false}
            emptyMessage="No stream-level capabilities linked yet."
          />
          <p className="text-xs text-muted-foreground">
            These capabilities apply to the whole value stream. Capabilities tied to a single step appear as tags on each stage above.
          </p>
        </div>
      )}

      {isModuleEnabled(enabledModules, 'personas') && (
        <RelationshipPanel
          title="Personas"
          items={vs.valueStreamPersonas.map(({ persona }) => ({
            id: persona.id, name: persona.name,
            href: `/personas/${persona.id}`,
          }))}
          canEdit={false}
        />
      )}

      {isModuleEnabled(enabledModules, 'objectives') && (
        <RelationshipPanel
          title="Strategic Objectives"
          items={vs.objectiveValueStreams.map(({ objective }) => ({
            id: objective.id, name: objective.name,
            href: `/objectives/${objective.id}`, meta: objective.timeHorizon,
          }))}
          canEdit={false}
        />
      )}

      {isModuleEnabled(enabledModules, 'strategies') && vs.strategyValueStreams.length > 0 && (
        <RelationshipPanel
          title="Strategies impacting this"
          items={vs.strategyValueStreams.map(({ strategy }) => ({
            id: strategy.id, name: strategy.name,
            href: `/strategies/${strategy.id}`, meta: strategy.status,
          }))}
          canEdit={false}
        />
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(vs.createdAt).toLocaleDateString()} · Updated {new Date(vs.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
