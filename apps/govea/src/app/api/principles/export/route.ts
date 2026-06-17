import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getPrinciples } from '@/actions/principles'
import { escapeCsv } from '@/lib/csv'

/**
 * Principle CSV export (#748). Org-scoped. Relationships use human-readable
 * keys: `adrs` is a semicolon list of ADR numbers, `capabilities` a semicolon
 * list of capability names. Round-trips with importPrinciples.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getPrinciples()
  const own = all.filter(p => p.organizationId === orgId)

  const headers = ['name', 'description', 'title', 'rationale', 'implications', 'principle_type', 'status', 'visibility', 'adrs', 'capabilities']
  const rows = own.map(p => {
    const adrNumbers = p.principleAdrs.map(pa => pa.adr?.number).filter((n): n is string => Boolean(n)).join('; ')
    const capabilityNames = p.principleCapabilities.map(pc => pc.capability?.name).filter((n): n is string => Boolean(n)).join('; ')
    return [
      p.name, p.description ?? '', p.title ?? '', p.rationale ?? '', p.implications ?? '',
      p.principleType, p.status, p.visibility, adrNumbers, capabilityNames,
    ].map(escapeCsv).join(',')
  })

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="principles-${date}.csv"`,
    },
  })
}
