import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getStrategy, adoptStrategy } from '@/actions/strategies'
import { getGoals } from '@/actions/goals'
import { linkStrategyGoal, unlinkStrategyGoal } from '@/actions/links'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import { MarkdownContent } from '@/components/markdown-content'
import { Button } from '@/components/ui/button'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  adopted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  superseded: 'bg-amber-100 text-amber-800 border-amber-200',
  retired: 'bg-zinc-100 text-zinc-600 border-zinc-200',
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
  const adopt = adoptStrategy.bind(null, id)
  const addGoal = linkStrategyGoal.bind(null, id)
  const removeGoal = unlinkStrategyGoal.bind(null, id)

  // Offer only un-containered goals (strategy_id null) to add here; moving a goal
  // out of another strategy is done from the goal's edit flow (slice 3).
  const availableGoals = canMutate
    ? (await getGoals(orgId, session.user.role))
        .filter(g => g.organizationId === orgId && g.strategyId === null)
        .map(g => ({ id: g.id, name: g.name }))
    : []

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

        {canMutate && strategy.status !== 'adopted' && (
          <form action={adopt} className="pt-1">
            <Button type="submit" size="sm">Adopt as current strategy</Button>
          </form>
        )}
      </div>

      <hr />

      <RelationshipPanel
        title="Goals"
        items={strategy.goals.map(g => ({
          id: g.id,
          name: g.name,
          href: `/goals/${g.id}`,
          meta: g.status,
        }))}
        gapMessage="No goals belong to this strategy yet. Add un-containered goals here, or set this strategy from a goal's edit flow."
        canEdit={canMutate}
        available={availableGoals}
        addAction={addGoal}
        removeAction={removeGoal}
      />

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(strategy.createdAt).toLocaleDateString()} · Updated {new Date(strategy.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
