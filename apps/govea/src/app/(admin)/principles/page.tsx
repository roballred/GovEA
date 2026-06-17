import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrinciples, importPrinciples } from '@/actions/principles'
import { getADRs } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { getPrincipleTypes } from '@/actions/taxonomy'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { CsvImportExportControls } from '@/components/csv-import-export-controls'
import { PrincipleTable } from './principle-table'

export default async function PrinciplesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)
  const canEdit = role === 'admin' || role === 'contributor'

  const [principleList, adrList, capabilityList, principleTypes, taxonomyDefinitions] = await Promise.all([
    getPrinciples(scope),
    getADRs(),
    getCapabilities(),
    getPrincipleTypes(),
    getEntityTaxonomyDefinitions(orgId, 'principle'),
  ])

  const principleIds = principleList.map(p => p.id)
  const taxonomyValueMap = principleIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'principle', principleIds)
    : {}

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Principles</h1>
          <p className="text-muted-foreground mt-1">
            Guiding statements that shape how the organization approaches architecture and technology decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ListScopeToggle scope={scope} />
          {canEdit && (
            <CsvImportExportControls
              entityLabel="Principle"
              exportHref="/api/principles/export"
              importAction={importPrinciples}
              columnsHint={<>Columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">title</code>, <code className="bg-muted px-1 rounded">rationale</code>, <code className="bg-muted px-1 rounded">implications</code>, <code className="bg-muted px-1 rounded">principle_type</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">adrs</code> (ADR numbers), <code className="bg-muted px-1 rounded">capabilities</code> (names).</>}
            />
          )}
        </div>
      </div>
      <PrincipleTable
        principles={principleList}
        adrs={adrList}
        capabilities={capabilityList}
        principleTypes={principleTypes}
        role={role}
        currentOrgId={orgId}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
      />
    </div>
  )
}
