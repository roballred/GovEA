import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getGlossaryTerms } from '@/actions/glossary'
import { escapeCsv } from '@/lib/csv'

type GlossaryForExport = Awaited<ReturnType<typeof getGlossaryTerms>>[number]

// Columns mirror importGlossary (#721) exactly so a glossary round-trips:
// export → import is a no-op.
function buildCsv(rows: GlossaryForExport[]): string {
  const headers = ['term', 'definition', 'domain', 'notes', 'status', 'visibility']
  const lines = rows.map(t => [
    t.term,
    t.definition,
    t.domain ?? '',
    t.notes ?? '',
    t.status,
    t.visibility,
  ].map(escapeCsv).join(','))
  return [headers.map(escapeCsv).join(','), ...lines].join('\n')
}

/**
 * Glossary CSV export — #723. Round-trip parity with the importer (#721). Same
 * per-entity shape + auth as the other export routes (Capabilities, Objectives,
 * etc.). Org-scoped: only the caller's own terms (federated/instance-wide terms
 * from other orgs are excluded so an export re-imports cleanly into this org).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!
  const all = await getGlossaryTerms()
  const own = all.filter(t => t.organizationId === orgId)

  const csv = buildCsv(own)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="glossary-${date}.csv"`,
    },
  })
}
