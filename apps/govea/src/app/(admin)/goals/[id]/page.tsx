import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getGoal } from '@/actions/goals'
import { getObjectives } from '@/actions/objectives'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import { linkGoalObjective, unlinkGoalObjective, linkGoalStrategy, unlinkGoalStrategy } from '@/actions/links'
import { getStrategies } from '@/actions/strategies'
import { MarkdownContent } from '@/components/markdown-content'
import { dedupeById } from '@/lib/dedup'

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

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const goal = await getGoal(id)
  if (!goal) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && goal.organizationId === orgId

  const [allObjectives, allStrategies] = editor
    ? await Promise.all([getObjectives(), getStrategies(orgId, session.user.role)])
    : [[], []]

  const addObjective = linkGoalObjective.bind(null, id)
  const removeObjective = unlinkGoalObjective.bind(null, id)
  const addStrategy = linkGoalStrategy.bind(null, id)
  const removeStrategy = unlinkGoalStrategy.bind(null, id)
  const linkedStrategyIds = new Set(goal.strategyGoals.map(sg => sg.strategyId))

  // Aggregate rollup through linked objectives
  const initiatives = dedupeById(
    goal.goalObjectives.flatMap(({ objective }) =>
      objective.initiativeObjectives.map(({ initiative }) => ({
        id: initiative.id,
        name: initiative.name,
        href: `/initiatives/${initiative.id}`,
        meta: initiative.status,
      }))
    )
  )

  const capabilities = dedupeById(
    goal.goalObjectives.flatMap(({ objective }) =>
      objective.objectiveCapabilities.map(({ capability }) => ({
        id: capability.id,
        name: capability.name,
        href: `/capabilities/${capability.id}`,
        meta: capability.domain ?? undefined,
      }))
    )
  )


  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/goals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Goals
        </Link>
        <Link
          href={`/traceability?from=goal&id=${id}`}
          className="text-sm text-primary hover:underline underline-offset-4"
        >
          View traceability →
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{goal.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[goal.status])}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[goal.visibility])}>
              {VISIBILITY_LABELS[goal.visibility]}
            </span>
          </div>
        </div>

        {goal.description && (
          <MarkdownContent>{goal.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          {goal.planningHorizon && (
            <div>
              <span className="text-muted-foreground">Planning horizon: </span>
              <span className="font-medium">{goal.planningHorizon}</span>
            </div>
          )}
          {goal.owner && (
            <div>
              <span className="text-muted-foreground">Owner: </span>
              <span className="font-medium">{goal.owner}</span>
            </div>
          )}
        </div>
      </div>

      <hr />

      <RelationshipPanel
        title="Strategies pursuing this goal"
        items={goal.strategyGoals.map(({ strategy }) => ({
          id: strategy.id,
          name: strategy.name,
          href: `/strategies/${strategy.id}`,
          meta: strategy.status,
        }))}
        gapMessage="No strategies pursue this goal yet."
        canEdit={canMutate}
        available={allStrategies.filter(s => s.organizationId === orgId && !linkedStrategyIds.has(s.id)).map(s => ({ id: s.id, name: s.name }))}
        addAction={addStrategy}
        removeAction={removeStrategy}
      />

      <RelationshipPanel
        title="Objectives"
        items={goal.goalObjectives.map(({ objective }) => ({
          id: objective.id,
          name: objective.name,
          href: `/objectives/${objective.id}`,
          meta: objective.timeHorizon ?? undefined,
        }))}
        gapMessage="No objectives linked — link measurable objectives to show how this goal will be achieved."
        canEdit={canMutate}
        available={allObjectives.filter(o => o.organizationId === orgId).map(o => ({ id: o.id, name: o.name }))}
        addAction={addObjective}
        removeAction={removeObjective}
      />

      {initiatives.length > 0 && (
        <RelationshipPanel
          title="Initiatives"
          items={initiatives}
          canEdit={false}
        />
      )}

      {capabilities.length > 0 && (
        <RelationshipPanel
          title="Capabilities"
          items={capabilities}
          canEdit={false}
        />
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(goal.createdAt).toLocaleDateString()} · Updated {new Date(goal.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
