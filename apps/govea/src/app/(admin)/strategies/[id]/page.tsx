import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getStrategy } from '@/actions/strategies'
import { getGoals } from '@/actions/goals'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { getInitiatives } from '@/actions/initiatives'
import {
  linkStrategyGoal, unlinkStrategyGoal,
  linkStrategyCapability, unlinkStrategyCapability,
  linkStrategyValueStream, unlinkStrategyValueStream,
  linkStrategyInitiative, unlinkStrategyInitiative,
} from '@/actions/links'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import { MarkdownContent } from '@/components/markdown-content'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  achieved: 'bg-blue-100 text-blue-800 border-blue-200',
  abandoned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
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

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const strategy = await getStrategy(id)
  if (!strategy) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && strategy.organizationId === orgId

  // Link/unlink actions bound to this strategy id (each takes the target id).
  const addGoal = linkStrategyGoal.bind(null, id)
  const removeGoal = unlinkStrategyGoal.bind(null, id)
  const addCapability = linkStrategyCapability.bind(null, id)
  const removeCapability = unlinkStrategyCapability.bind(null, id)
  const addValueStream = linkStrategyValueStream.bind(null, id)
  const removeValueStream = unlinkStrategyValueStream.bind(null, id)
  const addInitiative = linkStrategyInitiative.bind(null, id)
  const removeInitiative = unlinkStrategyInitiative.bind(null, id)

  // Available pickers: org entities not already linked here. Only loaded for editors.
  const linkedGoalIds = new Set(strategy.strategyGoals.map(sg => sg.goalId))
  const linkedCapIds = new Set(strategy.strategyCapabilities.map(sc => sc.capabilityId))
  const linkedVsIds = new Set(strategy.strategyValueStreams.map(sv => sv.valueStreamId))
  const linkedInitIds = new Set(strategy.strategyInitiatives.map(si => si.initiativeId))

  const [availableGoals, availableCapabilities, availableValueStreams, availableInitiatives] = canMutate
    ? await Promise.all([
        getGoals(orgId, session.user.role).then(rows => rows.filter(g => g.organizationId === orgId && !linkedGoalIds.has(g.id)).map(g => ({ id: g.id, name: g.name }))),
        getCapabilities().then(rows => rows.filter(c => c.organizationId === orgId && !linkedCapIds.has(c.id)).map(c => ({ id: c.id, name: c.name }))),
        getValueStreams().then(rows => rows.filter(v => v.organizationId === orgId && !linkedVsIds.has(v.id)).map(v => ({ id: v.id, name: v.name }))),
        getInitiatives().then(rows => rows.filter(i => i.organizationId === orgId && !linkedInitIds.has(i.id)).map(i => ({ id: i.id, name: i.name }))),
      ])
    : [[], [], [], []]

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/strategies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Strategies
        </Link>
        <ViewTraceabilityLink from="strategy" id={id} />
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{strategy.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[strategy.status])}>
              {titleCase(strategy.status)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[strategy.visibility])}>
              {VISIBILITY_LABELS[strategy.visibility]}
            </span>
          </div>
        </div>

        {strategy.summary && (
          <MarkdownContent>{strategy.summary}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          {strategy.planningHorizon && (
            <div>
              <span className="text-muted-foreground">Planning horizon: </span>
              <span className="font-medium">{strategy.planningHorizon}</span>
            </div>
          )}
          {strategy.owner?.name && (
            <div>
              <span className="text-muted-foreground">Owner: </span>
              <span className="font-medium">{strategy.owner.name}</span>
            </div>
          )}
          {(strategy.startDate || strategy.endDate) && (
            <div>
              <span className="text-muted-foreground">Dates: </span>
              <span className="font-medium">{strategy.startDate ?? '…'} → {strategy.endDate ?? '…'}</span>
            </div>
          )}
        </div>

      </div>

      <hr />

      <RelationshipPanel
        title="Goals pursued"
        items={strategy.strategyGoals.map(({ goal }) => ({
          id: goal.id,
          name: goal.name,
          href: `/goals/${goal.id}`,
          meta: goal.status,
        }))}
        gapMessage="This strategy doesn't pursue any goals yet. Link the goals this approach is meant to achieve."
        canEdit={canMutate}
        available={availableGoals}
        addAction={addGoal}
        removeAction={removeGoal}
      />

      <RelationshipPanel
        title="Capabilities impacted"
        items={strategy.strategyCapabilities.map(({ capability }) => ({
          id: capability.id,
          name: capability.name,
          href: `/capabilities/${capability.id}`,
          meta: capability.domain ?? undefined,
        }))}
        gapMessage="No capabilities linked — map the organisational abilities this approach leverages or changes."
        canEdit={canMutate}
        available={availableCapabilities}
        addAction={addCapability}
        removeAction={removeCapability}
      />

      <RelationshipPanel
        title="Value streams impacted"
        items={strategy.strategyValueStreams.map(({ valueStream }) => ({
          id: valueStream.id,
          name: valueStream.name,
          href: `/value-streams/${valueStream.id}`,
        }))}
        gapMessage="No value streams linked — map the value streams this approach affects."
        canEdit={canMutate}
        available={availableValueStreams}
        addAction={addValueStream}
        removeAction={removeValueStream}
      />

      <RelationshipPanel
        title="Delivered by initiatives"
        items={strategy.strategyInitiatives.map(({ initiative }) => ({
          id: initiative.id,
          name: initiative.name,
          href: `/initiatives/${initiative.id}`,
          meta: initiative.status,
        }))}
        gapMessage="No initiatives linked — link the funded work that delivers this approach."
        canEdit={canMutate}
        available={availableInitiatives}
        addAction={addInitiative}
        removeAction={removeInitiative}
      />

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(strategy.createdAt).toLocaleDateString()} · Updated {new Date(strategy.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
