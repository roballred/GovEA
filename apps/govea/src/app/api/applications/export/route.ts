import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getApplications } from '@/actions/applications'
import { getCustomFieldSchema } from '@/actions/custom-fields'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/actions/taxonomy'
import type { CustomFieldDefinition } from '@/db/schema'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function buildCsv(
  apps: Awaited<ReturnType<typeof getApplications>>,
  fieldDefs: CustomFieldDefinition[],
  taxDefs: EnrichedTaxonomyDefinition[],
  taxValueMap: Record<string, { taxonomyTermId: string }[]>,
): string {
  // Build termId → name lookup from enriched defs
  const termNames = new Map<string, string>()
  for (const def of taxDefs) {
    for (const term of def.values) {
      termNames.set(term.id, term.name)
    }
  }

  const fixedHeaders = ['name', 'description', 'vendor', 'version', 'hosting_model', 'lifecycle_status', 'status', 'visibility']
  const taxHeaders = taxDefs.map(d => d.typeName)
  const customHeaders = fieldDefs.map(f => f.name)
  const headers = [...fixedHeaders, ...taxHeaders, ...customHeaders]

  const rows = apps.map(app => {
    const fixed = [
      app.name,
      app.description ?? '',
      app.vendor ?? '',
      app.version ?? '',
      app.hostingModel ?? '',
      app.lifecycleStatus,
      app.status,
      app.visibility,
    ]

    const termIds = (taxValueMap[app.id] ?? []).map(v => v.taxonomyTermId)
    const tax = taxDefs.map(def => {
      const defTermIds = new Set(def.values.map(v => v.id))
      return termIds
        .filter(id => defTermIds.has(id))
        .map(id => termNames.get(id) ?? id)
        .join(', ')
    })

    const custom = fieldDefs.map(f => String((app as unknown as { customData: Record<string, string> }).customData?.[f.name] ?? ''))

    return [...fixed, ...tax, ...custom].map(escapeCsv).join(',')
  })

  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!canEdit(session.user)) return new Response('Forbidden', { status: 403 })

  const orgId = session.user.organizationId!

  const [apps, fieldDefs, taxDefs] = await Promise.all([
    getApplications(),
    getCustomFieldSchema(orgId, 'application'),
    getEntityTaxonomyDefinitions(orgId, 'application'),
  ])

  const appIds = apps.map(a => a.id)
  const taxValueMap = await getEntityTaxonomyValuesForMany(orgId, 'application', appIds)

  const csv = buildCsv(apps, fieldDefs, taxDefs, taxValueMap)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="applications-${date}.csv"`,
    },
  })
}
