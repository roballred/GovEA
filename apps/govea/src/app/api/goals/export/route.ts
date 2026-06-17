import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getGoals } from '@/actions/goals'
import { escapeCsv } from '@/lib/csv'

/**
 * Goal CSV export (#748). Org-scoped — getGoals() returns federated rows, but
 * only the caller's own org is exported so a re-import can't duplicate external
 * records. `objectives` is a semicolon-joined name list (the shared #748
 * relationship convention). Round-trips with importGoals.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getGoals(orgId, session.user.role)
  const own = all.filter(g => g.organizationId === orgId)

  const headers = ['name', 'description', 'planning_horizon', 'owner', 'status', 'visibility', 'objectives']
  const rows = own.map(g => {
    const objectiveNames = g.goalObjectives
      .map(go => go.objective?.name)
      .filter((n): n is string => Boolean(n))
      .join('; ')
    return [g.name, g.description ?? '', g.planningHorizon ?? '', g.owner ?? '', g.status, g.visibility, objectiveNames]
      .map(escapeCsv).join(',')
  })

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="goals-${date}.csv"`,
    },
  })
}
