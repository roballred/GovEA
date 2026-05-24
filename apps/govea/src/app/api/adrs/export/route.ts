import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getADRs } from '@/actions/adrs'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { escapeCsv } from '@/lib/csv'

type ADRForExport = Awaited<ReturnType<typeof getADRs>>[number]

function buildCsv(
  rows: ADRForExport[],
  numberById: Map<string, string>,
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
    'number', 'title', 'context', 'decision', 'consequences',
    'status', 'visibility', 'superseded_by',
    'capabilities', 'applications', 'initiatives', 'objectives',
  ]
  const taxHeaders = taxDefs.map(d => d.typeName)
  const headers = [...fixedHeaders, ...taxHeaders]

  const lines = rows.map(a => {
    const join = (xs: { name?: string | null }[]) =>
      xs.map(x => x.name).filter((n): n is string => Boolean(n)).join('; ')

    const fixed = [
      a.number,
      a.title,
      a.context ?? '',
      a.decision ?? '',
      a.consequences ?? '',
      a.status,
      a.visibility,
      a.supersededBy ? (numberById.get(a.supersededBy) ?? '') : '',
      join(a.adrCapabilities.map(x => x.capability)),
      join(a.adrApplications.map(x => x.application)),
      join(a.adrInitiatives.map(x => x.initiative)),
      join(a.adrObjectives.map(x => x.objective)),
    ]

    const termIds = (taxValueMap[a.id] ?? []).map(v => v.taxonomyTermId)
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
 * ADR CSV export — #596 continuation. ADRs have four junction tables
 * (capabilities, applications, initiatives, objectives) which all appear as
 * semicolon-joined name columns. `superseded_by` is exported as the
 * referenced ADR's number (not its UUID) so the CSV is portable.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [allADRs, taxDefs] = await Promise.all([
    getADRs(),
    getEntityTaxonomyDefinitions(orgId, 'adr'),
  ])

  const own = allADRs.filter(a => a.organizationId === orgId)
  // Map ADR.id → ADR.number so `superseded_by` exports as a portable number.
  // Includes federated rows in case an own-org ADR references a remote one
  // (still safe — number-by-number resolution only happens at import time).
  const numberById = new Map<string, string>()
  for (const a of allADRs) numberById.set(a.id, a.number)

  const ids = own.map(a => a.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'adr', ids)

  const csv = buildCsv(own, numberById, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="adrs-${date}.csv"`,
    },
  })
}
