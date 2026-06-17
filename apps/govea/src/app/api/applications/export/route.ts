import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { getApplications } from '@/actions/applications'
import { getCustomFieldSchema } from '@/actions/custom-fields'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import type { CustomFieldDefinition } from '@/db/schema'
import type { EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
// #763 — use the shared escaper so this export gets formula-injection
// neutralization too; a local copy silently missed the centralized fix.
import { escapeCsv } from '@/lib/csv'

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

  // `capabilities` is a semicolon-joined name list — the same human-readable,
  // environment-independent convention Capabilities use for `personas` (#696).
  // The CSV round-trips: Export → unchanged → Import produces no new rows and
  // no data drift.
  const fixedHeaders = ['name', 'description', 'vendor', 'version', 'hosting_model', 'lifecycle_status', 'status', 'visibility', 'capabilities']
  const taxHeaders = taxDefs.map(d => d.typeName)
  const customHeaders = fieldDefs.map(f => f.name)
  const headers = [...fixedHeaders, ...taxHeaders, ...customHeaders]

  const rows = apps.map(app => {
    const capabilityNames = app.applicationCapabilities
      .map(ac => ac.capability?.name)
      .filter((n): n is string => Boolean(n))
      .join('; ')

    const fixed = [
      app.name,
      app.description ?? '',
      app.vendor ?? '',
      app.version ?? '',
      app.hostingModel ?? '',
      app.lifecycleStatus,
      app.status,
      app.visibility,
      capabilityNames,
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

  const [allApps, fieldDefs, taxDefs] = await Promise.all([
    getApplications(),
    getCustomFieldSchema(orgId, 'application'),
    getEntityTaxonomyDefinitions(orgId, 'application'),
  ])

  // Export is org-scoped. getApplications() returns federated (instance-visible
  // + connected-org) rows too, but those are read-only views; including them
  // would make a re-import either duplicate external records in the caller's
  // org or require per-row collision handling — both break round-trip safety.
  // Mirrors the Capability export (#696).
  const apps = allApps.filter(a => a.organizationId === orgId)
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
