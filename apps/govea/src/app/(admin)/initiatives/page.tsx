import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInitiatives } from '@/actions/initiatives'
import { getCapabilities } from '@/actions/capabilities'
import { getObjectives } from '@/actions/objectives'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/actions/taxonomy'
import { InitiativeTable } from './initiative-table'
export default async function InitiativesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [initiativeList, capabilityList, objectiveList, taxonomyDefinitions] = await Promise.all([
    getInitiatives(orgId, role),
    getCapabilities(orgId),
    getObjectives(orgId),
    getEntityTaxonomyDefinitions(orgId, 'initiative'),
  ])

  const initiativeIds = initiativeList.map(i => i.id)
  const taxonomyValueMap = initiativeIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'initiative', initiativeIds)
    : {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Initiatives</h1>
        <p className="text-muted-foreground mt-1">
          Time-bounded work efforts that build, improve, or retire capabilities in pursuit of strategic objectives.
        </p>
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
