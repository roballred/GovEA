import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getObjective } from '@/actions/objectives'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { getApplications } from '@/actions/applications'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkObjectiveCapability, unlinkObjectiveCapability,
  linkObjectiveValueStream, unlinkObjectiveValueStream,
  linkObjectiveApplication, unlinkObjectiveApplication,
} from '@/actions/links'

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

  const objective = await getObjective(id)
  if (!objective) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!

  const [allCapabilities, allValueStreams, allApplications] = editor
    ? await Promise.all([
        getCapabilities(orgId),
        getValueStreams(orgId),
        getApplications(orgId),
      ])
    : [[], [], []]

  const addCapability = linkObjectiveCapability.bind(null, id)
  const removeCapability = unlinkObjectiveCapability.bind(null, id)
  const addValueStream = linkObjectiveValueStream.bind(null, id)
  const removeValueStream = unlinkObjectiveValueStream.bind(null, id)
  const addApplication = linkObjectiveApplication.bind(null, id)
  const removeApplication = unlinkObjectiveApplication.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/objectives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Strategic Objectives
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{objective.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[objective.status])}>
              {objective.status.charAt(0).toUpperCase() + objective.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[objective.visibility])}>
              {VISIBILITY_LABELS[objective.visibility]}
            </span>
          </div>
        </div>

        {objective.description && (
          <p className="text-muted-foreground">{objective.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          {objective.successMetric && (
            <div>
              <span className="text-muted-foreground">Success metric: </span>
              <span className="font-medium">{objective.successMetric}</span>
            </div>
          )}
          {objective.timeHorizon && (
            <div>
              <span className="text-muted-foreground">Time horizon: </span>
              <span className="font-medium">{objective.timeHorizon}</span>
            </div>
          )}
        </div>
      </div>

      <hr />

      <RelationshipPanel
        title="Capabilities"
        items={objective.objectiveCapabilities.map(({ capability }) => ({
          id: capability.id, name: capability.name,
          href: `/capabilities/${capability.id}`, meta: capability.domain,
        }))}
        canEdit={editor}
        available={allCapabilities.map(c => ({ id: c.id, name: c.name }))}
        addAction={addCapability}
        removeAction={removeCapability}
      />

      <RelationshipPanel
        title="Value Streams"
        items={objective.objectiveValueStreams.map(({ valueStream }) => ({
          id: valueStream.id, name: valueStream.name,
          href: `/value-streams/${valueStream.id}`,
        }))}
        canEdit={editor}
        available={allValueStreams.map(vs => ({ id: vs.id, name: vs.name }))}
        addAction={addValueStream}
        removeAction={removeValueStream}
      />

      <RelationshipPanel
        title="Applications"
        items={objective.objectiveApplications.map(({ application }) => ({
          id: application.id, name: application.name,
          href: `/applications/${application.id}`, meta: application.vendor,
        }))}
        canEdit={editor}
        available={allApplications.map(a => ({ id: a.id, name: a.name }))}
        addAction={addApplication}
        removeAction={removeApplication}
      />

      <RelationshipPanel
        title="Initiatives"
        items={objective.initiativeObjectives.map(({ initiative }) => ({
          id: initiative.id, name: initiative.name,
          href: `/initiatives/${initiative.id}`, meta: initiative.status,
        }))}
        canEdit={false}
      />

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(objective.createdAt).toLocaleDateString()} · Updated {new Date(objective.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
