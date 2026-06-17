import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGoals, importGoals } from '@/actions/goals'
import { getObjectives } from '@/actions/objectives'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { CsvImportExportControls } from '@/components/csv-import-export-controls'
import { GoalTable } from './goal-table'

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)
  const canEdit = role === 'admin' || role === 'contributor'

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
        <div className="flex items-center gap-2">
          <ListScopeToggle scope={scope} />
          {canEdit && (
            <CsvImportExportControls
              entityLabel="Goal"
              exportHref="/api/goals/export"
              importAction={importGoals}
              columnsHint={<>Columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">planning_horizon</code>, <code className="bg-muted px-1 rounded">owner</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">objectives</code> (semicolon-separated names).</>}
            />
          )}
        </div>
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
