import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { db } from '@/db/client'
import { getStrategies } from '@/actions/strategies'
import {
  strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives,
  goals, capabilities, valueStreams, initiatives,
} from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { escapeCsv } from '@/lib/csv'

/**
 * Strategy CSV export (#748). Org-scoped. `owner_email` is the owner's email;
 * `goals`, `capabilities`, `value_streams`, `initiatives` are semicolon-joined
 * name lists. Round-trips with importStrategies.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getStrategies(orgId, session.user.role)
  const own = all.filter(s => s.organizationId === orgId)
  const ids = own.map(s => s.id)

  const [gLinks, cLinks, vLinks, iLinks, orgGoals, orgCaps, orgVs, orgInits] = await Promise.all([
    ids.length ? db.select().from(strategyGoals).where(inArray(strategyGoals.strategyId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(strategyCapabilities).where(inArray(strategyCapabilities.strategyId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(strategyValueStreams).where(inArray(strategyValueStreams.strategyId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(strategyInitiatives).where(inArray(strategyInitiatives.strategyId, ids)) : Promise.resolve([]),
    db.select({ id: goals.id, name: goals.name }).from(goals).where(eq(goals.organizationId, orgId)),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ id: valueStreams.id, name: valueStreams.name }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
    db.select({ id: initiatives.id, name: initiatives.name }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
  ])
  const nameMap = (rows: { id: string; name: string }[]) => new Map(rows.map(r => [r.id, r.name]))
  const goalName = nameMap(orgGoals), capName = nameMap(orgCaps), vsName = nameMap(orgVs), initName = nameMap(orgInits)
  const group = <T,>(links: T[], key: (l: T) => string, idOf: (l: T) => string, names: Map<string, string>) => {
    const m = new Map<string, string[]>()
    for (const l of links) {
      const n = names.get(idOf(l)); if (!n) continue
      m.set(key(l), [...(m.get(key(l)) ?? []), n])
    }
    return m
  }
  const gBy = group(gLinks, l => l.strategyId, l => l.goalId, goalName)
  const cBy = group(cLinks, l => l.strategyId, l => l.capabilityId, capName)
  const vBy = group(vLinks, l => l.strategyId, l => l.valueStreamId, vsName)
  const iBy = group(iLinks, l => l.strategyId, l => l.initiativeId, initName)

  const headers = ['name', 'summary', 'planning_horizon', 'status', 'visibility', 'owner_email', 'start_date', 'end_date', 'goals', 'capabilities', 'value_streams', 'initiatives']
  const rows = own.map(s => [
    s.name, s.summary ?? '', s.planningHorizon ?? '', s.status, s.visibility,
    s.owner?.email ?? '', s.startDate ?? '', s.endDate ?? '',
    (gBy.get(s.id) ?? []).join('; '), (cBy.get(s.id) ?? []).join('; '),
    (vBy.get(s.id) ?? []).join('; '), (iBy.get(s.id) ?? []).join('; '),
  ].map(escapeCsv).join(','))

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="strategies-${date}.csv"`,
    },
  })
}
