import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getValueStream } from '@/actions/value-streams'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { canEdit } from '@/lib/rbac'
import { StageManager } from './stage-manager'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkValueStreamPersona, unlinkValueStreamPersona,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'

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

  const [vs, capabilityList, allPersonas, enabledModules] = await Promise.all([
    getValueStream(id),
    getCapabilities(orgId),
    editor ? getPersonas(orgId) : Promise.resolve([]),
    getEnabledModules(),
  ])

  if (!vs) notFound()
  const canMutate = editor && vs.organizationId === orgId

  const addPersona = linkValueStreamPersona.bind(null, id)
  const removePersona = unlinkValueStreamPersona.bind(null, id)

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

        {vs.stages.length === 0 && !canMutate && (
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

        {/* Stage manager for editors */}
        {canMutate && (
          <StageManager
            valueStreamId={vs.id}
            stages={vs.stages}
            capabilities={capabilityList.filter(c => c.organizationId === orgId)}
          />
        )}
      </div>

      {isModuleEnabled(enabledModules, 'personas') && (
        <RelationshipPanel
          title="Personas"
          items={vs.valueStreamPersonas.map(({ persona }) => ({
            id: persona.id, name: persona.name,
            href: `/personas/${persona.id}`,
          }))}
          canEdit={canMutate}
          available={allPersonas.filter(p => p.organizationId === orgId).map(p => ({ id: p.id, name: p.name }))}
          addAction={addPersona}
          removeAction={removePersona}
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

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(vs.createdAt).toLocaleDateString()} · Updated {new Date(vs.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
