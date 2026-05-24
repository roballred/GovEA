import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getInitiatives } from '@/actions/initiatives'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { escapeCsv } from '@/lib/csv'

type InitiativeForExport = Awaited<ReturnType<typeof getInitiatives>>[number]

function buildCsv(
  rows: InitiativeForExport[],
  taxDefs: EnrichedTaxonomyDefinition[],
  taxValueMap: Record<string, { taxonomyTermId: string }[]>,
): string {
  const termNames = new Map<string, string>()
  for (const def of taxDefs) {
    for (const term of def.values) {
      termNames.set(term.id, term.name)
    }
  }

  const fixedHeaders = [
    'name', 'description', 'status', 'start_date', 'end_date', 'visibility',
    'capabilities', 'objectives',
  ]
  const taxHeaders = taxDefs.map(d => d.typeName)
  const headers = [...fixedHeaders, ...taxHeaders]

  const lines = rows.map(i => {
    const join = (xs: { name?: string | null }[]) =>
      xs.map(x => x.name).filter((n): n is string => Boolean(n)).join('; ')

    const fixed = [
      i.name,
      i.description ?? '',
      i.status,
      i.startDate ?? '',
      i.endDate ?? '',
      i.visibility,
      join(i.initiativeCapabilities.map(x => x.capability)),
      join(i.initiativeObjectives.map(x => x.objective)),
    ]

    const termIds = (taxValueMap[i.id] ?? []).map(v => v.taxonomyTermId)
    const tax = taxDefs.map(def => {
      const defTermIds = new Set(def.values.map(v => v.id))
      return termIds
        .filter(id => defTermIds.has(id))
        .map(id => termNames.get(id) ?? id)
        .join(', ')
    })

    return [...fixed, ...tax].map(escapeCsv).join(',')
  })

  return [headers.map(escapeCsv).join(','), ...lines].join('\n')
}

/**
 * Initiative CSV export — #629 continuation of the per-entity pattern.
 * Capabilities + Objectives appear as semicolon-joined name columns.
 * The application junction is intentionally not exported — it carries an
 * `impact` label that needs richer CSV semantics; pair it with a future
 * slice when there's persona pull.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [all, taxDefs] = await Promise.all([
    getInitiatives(),
    getEntityTaxonomyDefinitions(orgId, 'initiative'),
  ])

  const own = all.filter(i => i.organizationId === orgId)
  const ids = own.map(i => i.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'initiative', ids)

  const csv = buildCsv(own, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="initiatives-${date}.csv"`,
    },
  })
}
