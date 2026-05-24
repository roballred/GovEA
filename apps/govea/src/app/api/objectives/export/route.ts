import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getObjectives } from '@/actions/objectives'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { escapeCsv } from '@/lib/csv'

type ObjectiveForExport = Awaited<ReturnType<typeof getObjectives>>[number]

function buildCsv(
  rows: ObjectiveForExport[],
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
    'name', 'description', 'success_metric', 'time_horizon',
    'status', 'visibility', 'capabilities', 'value_streams',
  ]
  const taxHeaders = taxDefs.map(d => d.typeName)
  const headers = [...fixedHeaders, ...taxHeaders]

  const lines = rows.map(o => {
    const join = (xs: { name?: string | null }[]) =>
      xs.map(x => x.name).filter((n): n is string => Boolean(n)).join('; ')

    const fixed = [
      o.name,
      o.description ?? '',
      o.successMetric ?? '',
      o.timeHorizon ?? '',
      o.status,
      o.visibility,
      join(o.objectiveCapabilities.map(x => x.capability)),
      join(o.objectiveValueStreams.map(x => x.valueStream)),
    ]

    const termIds = (taxValueMap[o.id] ?? []).map(v => v.taxonomyTermId)
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
 * Strategic Objective CSV export — #629. Same per-entity shape used by
 * Capabilities, Personas, ADRs, and Initiatives. Capabilities and Value
 * Streams appear as semicolon-joined name columns. Goal junctions (an
 * orthogonal hierarchy) are out of this slice.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [all, taxDefs] = await Promise.all([
    getObjectives(),
    getEntityTaxonomyDefinitions(orgId, 'objective'),
  ])

  const own = all.filter(o => o.organizationId === orgId)
  const ids = own.map(o => o.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'objective', ids)

  const csv = buildCsv(own, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="objectives-${date}.csv"`,
    },
  })
}
