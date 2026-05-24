import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getPersonas } from '@/actions/personas'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { escapeCsv } from '@/lib/csv'

type PersonaForExport = Awaited<ReturnType<typeof getPersonas>>[number]

function buildCsv(
  rows: PersonaForExport[],
  taxDefs: EnrichedTaxonomyDefinition[],
  taxValueMap: Record<string, { taxonomyTermId: string }[]>,
): string {
  const termNames = new Map<string, string>()
  for (const def of taxDefs) {
    for (const term of def.values) {
      termNames.set(term.id, term.name)
    }
  }

  // `tags` mirrors capabilities' `personas` convention: semicolon-joined names
  // pulled from the persona_tags junction (which points to taxonomy terms).
  const fixedHeaders = [
    'name', 'description', 'type', 'status', 'visibility', 'tags',
  ]
  const taxHeaders = taxDefs.map(d => d.typeName)
  const headers = [...fixedHeaders, ...taxHeaders]

  const lines = rows.map(p => {
    const tagNames = p.personaTags
      .map(pt => pt.tag?.name)
      .filter((n): n is string => Boolean(n))
      .join('; ')

    const fixed = [
      p.name,
      p.description ?? '',
      p.type ?? '',
      p.status,
      p.visibility,
      tagNames,
    ]

    const termIds = (taxValueMap[p.id] ?? []).map(v => v.taxonomyTermId)
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
 * Persona CSV export — #596 continuation. Mirrors the capabilities pattern:
 * fixed columns + per-entity taxonomy columns, org-scoped to keep round-trip
 * import safe (re-importing won't silently duplicate federated rows).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [allPersonas, taxDefs] = await Promise.all([
    getPersonas(),
    getEntityTaxonomyDefinitions(orgId, 'persona'),
  ])

  const own = allPersonas.filter(p => p.organizationId === orgId)
  const ids = own.map(p => p.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'persona', ids)

  const csv = buildCsv(own, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="personas-${date}.csv"`,
    },
  })
}
