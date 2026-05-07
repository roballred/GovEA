import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getObjective } from '@/actions/objectives'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkObjectiveCapability, unlinkObjectiveCapability,
  linkObjectiveValueStream, unlinkObjectiveValueStream,
} from '@/actions/links'
import { getGoals } from '@/actions/goals'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { dedupeById } from '@/lib/dedup'
import { MarkdownContent } from '@/components/markdown-content'
import { TaxonomyChips } from '@/components/taxonomy-ui'

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

  const [objective, enabledModules] = await Promise.all([getObjective(id), getEnabledModules()])
  if (!objective) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && objective.organizationId === orgId

  const [allCapabilities, allValueStreams, allGoals] = editor
    ? await Promise.all([
        getCapabilities(),
        getValueStreams(),
        getGoals(orgId),
      ])
    : [[], [], []]

  const addCapability = linkObjectiveCapability.bind(null, id)
  const removeCapability = unlinkObjectiveCapability.bind(null, id)
  const addValueStream = linkObjectiveValueStream.bind(null, id)
  const removeValueStream = unlinkObjectiveValueStream.bind(null, id)

  // Goals this objective belongs to — derived from allGoals
  const linkedGoals = allGoals.filter(g => g.goalObjectives.some(go => go.objective.id === id))

  const capabilityApps = dedupeById(
    objective.objectiveCapabilities.flatMap(({ capability }) =>
      capability.applicationCapabilities.map(({ application }) => ({
        id: application.id,
        name: application.name,
        href: `/applications/${application.id}`,
        meta: application.vendor ?? undefined,
      }))
    )
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/objectives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Strategic Objectives
        </Link>
        <Link
          href={`/traceability?from=objective&id=${id}`}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View traceability →
        </Link>
      </div>

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
          <MarkdownContent>{objective.description}</MarkdownContent>
        )}

        <TaxonomyChips
          definitions={objective.taxonomyDefinitions}
          selectedTermIds={objective.taxonomyValues.map(v => v.taxonomyTermId)}
        />

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
        title="Goals"
        items={linkedGoals.map(g => ({
          id: g.id,
          name: g.name,
          href: `/goals/${g.id}`,
          meta: g.planningHorizon ?? undefined,
        }))}
        gapMessage="No goals linked — link this objective to a goal to show how it fits your strategic direction."
        canEdit={false}
      />

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={objective.objectiveCapabilities.map(({ capability }) => ({
            id: capability.id, name: capability.name,
            href: `/capabilities/${capability.id}`, meta: capability.domain,
          }))}
          gapMessage="No capabilities linked — this objective has no organisational foundation mapped."
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'value-streams') && (
        <RelationshipPanel
          title="Value Streams"
          items={objective.objectiveValueStreams.map(({ valueStream }) => ({
            id: valueStream.id, name: valueStream.name,
            href: `/value-streams/${valueStream.id}`,
          }))}
          canEdit={canMutate}
          available={allValueStreams.filter(vs => vs.organizationId === orgId).map(vs => ({ id: vs.id, name: vs.name }))}
          addAction={addValueStream}
          removeAction={removeValueStream}
        />
      )}

      {isModuleEnabled(enabledModules, 'applications') && (
        <RelationshipPanel
          title="Applications"
          items={capabilityApps}
          gapMessage="Applications appear here through capabilities — link capabilities above to map your application landscape."
          canEdit={false}
        />
      )}

      {isModuleEnabled(enabledModules, 'initiatives') && (
        <RelationshipPanel
          title="Initiatives"
          items={objective.initiativeObjectives.map(({ initiative }) => ({
            id: initiative.id, name: initiative.name,
            href: `/initiatives/${initiative.id}`, meta: initiative.status,
          }))}
          canEdit={false}
        />
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(objective.createdAt).toLocaleDateString()} · Updated {new Date(objective.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
