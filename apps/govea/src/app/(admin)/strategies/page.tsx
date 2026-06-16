import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStrategies } from '@/actions/strategies'
import { getOrgUsersForPicker } from '@/actions/org-users'
import { StrategyTable } from './strategy-table'

export default async function StrategiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [strategyList, orgUsers] = await Promise.all([
    getStrategies(orgId, role),
    getOrgUsersForPicker(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategies</h1>
        <p className="text-muted-foreground mt-1">
          Your chosen <strong>courses of action</strong> — the approaches you&apos;re taking to achieve your goals, and the capabilities, value streams, and initiatives each one leverages.
        </p>
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
