import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInitiatives } from '@/actions/initiatives'
import { getCapabilities } from '@/actions/capabilities'
import { getObjectives } from '@/actions/objectives'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { InitiativeTable } from './initiative-table'
export default async function InitiativesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [initiativeList, capabilityList, objectiveList, taxonomyDefinitions] = await Promise.all([
    getInitiatives(scope),
    getCapabilities(),
    getObjectives(),
    getEntityTaxonomyDefinitions(orgId, 'initiative'),
  ])

  const initiativeIds = initiativeList.map(i => i.id)
  const taxonomyValueMap = initiativeIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'initiative', initiativeIds)
    : {}

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Initiatives</h1>
          <p className="text-muted-foreground mt-1">
            Time-bounded work efforts that build, improve, or retire capabilities in pursuit of strategic objectives.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <InitiativeTable
        initiatives={initiativeList}
        capabilities={capabilityList}
        objectives={objectiveList}
        role={role}
        currentOrgId={orgId}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
      />
    </div>
  )
}
