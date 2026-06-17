import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { db } from '@/db/client'
import { getServices } from '@/actions/services'
import { serviceCapabilities, serviceValueStreams, capabilities, valueStreams } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { escapeCsv } from '@/lib/csv'

/**
 * Service CSV export (#748). Org-scoped. `channels` is a semicolon list;
 * `personas`, `capabilities`, and `value_streams` are semicolon-joined name
 * lists. Round-trips with importServices.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getServices()
  const own = all.filter(s => s.organizationId === orgId)
  const ids = own.map(s => s.id)

  // Relationship names — resolved via org-scoped lookups by id.
  const [capLinks, vsLinks, orgCaps, orgVs] = await Promise.all([
    ids.length ? db.select().from(serviceCapabilities).where(inArray(serviceCapabilities.serviceId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(serviceValueStreams).where(inArray(serviceValueStreams.serviceId, ids)) : Promise.resolve([]),
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ id: valueStreams.id, name: valueStreams.name }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
  ])
  const capNameById = new Map(orgCaps.map(c => [c.id, c.name]))
  const vsNameById = new Map(orgVs.map(v => [v.id, v.name]))
  const capsByService = new Map<string, string[]>()
  for (const l of capLinks) {
    const n = capNameById.get(l.capabilityId); if (!n) continue
    capsByService.set(l.serviceId, [...(capsByService.get(l.serviceId) ?? []), n])
  }
  const vsByService = new Map<string, string[]>()
  for (const l of vsLinks) {
    const n = vsNameById.get(l.valueStreamId); if (!n) continue
    vsByService.set(l.serviceId, [...(vsByService.get(l.serviceId) ?? []), n])
  }

  const headers = ['name', 'description', 'service_owner', 'channels', 'status', 'visibility', 'personas', 'capabilities', 'value_streams']
  const rows = own.map(s => {
    const personaNames = s.servicePersonas.map(sp => sp.persona?.name).filter((n): n is string => Boolean(n)).join('; ')
    return [
      s.name, s.description ?? '', s.serviceOwner ?? '', s.channels.join('; '), s.status, s.visibility,
      personaNames, (capsByService.get(s.id) ?? []).join('; '), (vsByService.get(s.id) ?? []).join('; '),
    ].map(escapeCsv).join(',')
  })

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="services-${date}.csv"`,
    },
  })
}
