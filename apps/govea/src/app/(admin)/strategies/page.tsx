import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStrategies } from '@/actions/strategies'
import { getOrgUsersForPicker } from '@/actions/org-users'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { StrategyTable } from './strategy-table'

export default async function StrategiesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

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
        <ListScopeToggle scope={scope} />
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
