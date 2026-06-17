import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGoals } from '@/actions/goals'
import { getObjectives } from '@/actions/objectives'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { GoalTable } from './goal-table'

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [goalList, objectiveList] = await Promise.all([
    getGoals(orgId, role, scope),
    getObjectives(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1">
            Broad strategic outcomes that guide your organization&apos;s direction. Each goal is advanced by one or more measurable objectives.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <GoalTable
        goals={goalList}
        objectives={objectiveList}
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
