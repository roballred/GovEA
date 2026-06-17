import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStrategies, importStrategies } from '@/actions/strategies'
import { getOrgUsersForPicker } from '@/actions/org-users'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { CsvImportExportControls } from '@/components/csv-import-export-controls'
import { StrategyTable } from './strategy-table'

export default async function StrategiesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)
  const canEdit = role === 'admin' || role === 'contributor'

  const [strategyList, orgUsers] = await Promise.all([
    getStrategies(orgId, role, scope),
    getOrgUsersForPicker(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategies</h1>
          <p className="text-muted-foreground mt-1">
            Your chosen <strong>courses of action</strong> — the approaches you&apos;re taking to achieve your goals, and the capabilities, value streams, and initiatives each one leverages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ListScopeToggle scope={scope} />
          {canEdit && (
            <CsvImportExportControls
              entityLabel="Strategy"
              entityLabelPlural="Strategies"
              exportHref="/api/strategies/export"
              importAction={importStrategies}
              columnsHint={<>Columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">summary</code>, <code className="bg-muted px-1 rounded">planning_horizon</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">owner_email</code>, <code className="bg-muted px-1 rounded">start_date</code>, <code className="bg-muted px-1 rounded">end_date</code>, <code className="bg-muted px-1 rounded">goals</code>, <code className="bg-muted px-1 rounded">capabilities</code>, <code className="bg-muted px-1 rounded">value_streams</code>, <code className="bg-muted px-1 rounded">initiatives</code>.</>}
            />
          )}
        </div>
      </div>
      <StrategyTable
        strategies={strategyList}
        orgUsers={orgUsers}
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
