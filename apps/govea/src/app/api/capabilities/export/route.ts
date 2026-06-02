import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getCapabilities } from '@/actions/capabilities'

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

type CapabilityForExport = Awaited<ReturnType<typeof getCapabilities>>[number]

function buildCsv(capabilities: CapabilityForExport[]): string {
  const headers = ['name', 'description', 'domain', 'behaviors', 'rules', 'status', 'visibility', 'personas']
  const rows = capabilities.map(capability => {
    const personas = capability.capabilityPersonas
      .map(({ persona }) => persona.name)
      .filter(Boolean)
      .join('; ')

    return [
      capability.name,
      capability.description ?? '',
      capability.domain ?? '',
      capability.behaviors ?? '',
      capability.rules ?? '',
      capability.status,
      capability.visibility,
      personas,
    ].map(escapeCsv).join(',')
  })

  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const readableCapabilities = await getCapabilities(orgId, session.user.role)
  const ownCapabilities = readableCapabilities.filter(capability => capability.organizationId === orgId)
  const csv = buildCsv(ownCapabilities)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="capabilities-${date}.csv"`,
    },
  })
}
