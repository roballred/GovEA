import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getCapabilities } from '@/actions/capabilities'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { escapeCsv } from '@/lib/csv'

type CapabilityForExport = Awaited<ReturnType<typeof getCapabilities>>[number]

function buildCsv(
  caps: CapabilityForExport[],
  taxDefs: EnrichedTaxonomyDefinition[],
  taxValueMap: Record<string, { taxonomyTermId: string }[]>,
): string {
  const termNames = new Map<string, string>()
  for (const def of taxDefs) {
    for (const term of def.values) {
      termNames.set(term.id, term.name)
    }
  }

  // Fixed headers track the capability schema 1:1. `personas` is a
  // semicolon-joined name list (same convention Applications uses for the
  // `capabilities` column). The CSV round-trips: Export → unchanged → Import
  // produces zero changes.
  const fixedHeaders = [
    'name', 'description', 'domain', 'behaviors', 'rules',
    'capability_type', 'status', 'visibility', 'personas',
  ]
  const taxHeaders = taxDefs.map(d => d.typeName)
  const headers = [...fixedHeaders, ...taxHeaders]

  const rows = caps.map(c => {
    const personaNames = c.capabilityPersonas
      .map(cp => cp.persona?.name)
      .filter((n): n is string => Boolean(n))
      .join('; ')

    const fixed = [
      c.name,
      c.description ?? '',
      c.domain ?? '',
      c.behaviors ?? '',
      c.rules ?? '',
      c.capabilityType ?? '',
      c.status,
      c.visibility,
      personaNames,
    ]

    const termIds = (taxValueMap[c.id] ?? []).map(v => v.taxonomyTermId)
    const tax = taxDefs.map(def => {
      const defTermIds = new Set(def.values.map(v => v.id))
      return termIds
        .filter(id => defTermIds.has(id))
        .map(id => termNames.get(id) ?? id)
        .join(', ')
    })

    return [...fixed, ...tax].map(escapeCsv).join(',')
  })

  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

/**
 * Capability CSV export — first beachhead of #596 (extend per-entity CSV
 * import/export beyond Applications). Honors getCapabilities()'s federation
 * + viewer-status rules so a contributor only exports rows they can read.
 *
 * Round-trip property: Export → unchanged content → Import succeeds with
 * zero changes (exercised by the import action's `dryRun` mode).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [allCaps, taxDefs] = await Promise.all([
    getCapabilities(),
    getEntityTaxonomyDefinitions(orgId, 'capability'),
  ])

  // Export is org-scoped — even though getCapabilities() returns federated
  // (instance-visible + connected-org) rows, those are read-only views, and
  // including them in the CSV would mean a re-import either silently duplicated
  // them as native rows in the caller's org or required name-collision
  // resolution per row. Either path breaks round-trip safety. The export of
  // the caller's own org is the unambiguously safe shape; consumers needing a
  // federated read can use the on-screen list view.
  const caps = allCaps.filter(c => c.organizationId === orgId)
  const capIds = caps.map(c => c.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'capability', capIds)

  const csv = buildCsv(caps, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="capabilities-${date}.csv"`,
    },
  })
}
