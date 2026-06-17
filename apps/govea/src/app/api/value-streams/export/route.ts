import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { db } from '@/db/client'
import { getValueStreams } from '@/actions/value-streams'
import { valueStreamPersonas, valueStreamCapabilities, personas, capabilities } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { escapeCsv } from '@/lib/csv'

/**
 * Value stream CSV export (#748). Org-scoped. `personas` and `capabilities`
 * (stream-level) are semicolon name lists. `stages` is an ordered, best-effort
 * flat encoding — pipe-separated stages, each `Stage name: Cap A, Cap B` (the
 * capability suffix omitted when a stage has none). This round-trips the common
 * case; deeply structured stage metadata still lives in the editor.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getValueStreams()
  const own = all.filter(v => v.organizationId === orgId)
  const ids = own.map(v => v.id)

  const [personaLinks, capLinks, orgPersonas, orgCaps] = await Promise.all([
    ids.length ? db.select().from(valueStreamPersonas).where(inArray(valueStreamPersonas.valueStreamId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(valueStreamCapabilities).where(inArray(valueStreamCapabilities.valueStreamId, ids)) : Promise.resolve([]),
    db.select({ id: personas.id, name: personas.name }).from(personas).where(eq(personas.organizationId, orgId)),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
  ])
  const personaName = new Map(orgPersonas.map(p => [p.id, p.name]))
  const capName = new Map(orgCaps.map(c => [c.id, c.name]))
  const personasByVs = new Map<string, string[]>()
  for (const l of personaLinks) {
    const n = personaName.get(l.personaId); if (!n) continue
    personasByVs.set(l.valueStreamId, [...(personasByVs.get(l.valueStreamId) ?? []), n])
  }
  const capsByVs = new Map<string, string[]>()
  for (const l of capLinks) {
    const n = capName.get(l.capabilityId); if (!n) continue
    capsByVs.set(l.valueStreamId, [...(capsByVs.get(l.valueStreamId) ?? []), n])
  }

  const headers = ['name', 'description', 'value_item', 'status', 'visibility', 'personas', 'capabilities', 'stages']
  const rows = own.map(v => {
    const stages = v.stages.map(s => {
      const caps = s.stageCapabilities.map(sc => sc.capability?.name).filter((n): n is string => Boolean(n))
      return caps.length > 0 ? `${s.name}: ${caps.join(', ')}` : s.name
    }).join(' | ')
    return [
      v.name, v.description ?? '', v.valueItem ?? '', v.status, v.visibility,
      (personasByVs.get(v.id) ?? []).join('; '), (capsByVs.get(v.id) ?? []).join('; '), stages,
    ].map(escapeCsv).join(',')
  })

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="value-streams-${date}.csv"`,
    },
  })
}
