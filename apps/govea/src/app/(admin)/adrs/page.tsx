import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getADRs } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { getApplications } from '@/actions/applications'
import { getInitiatives } from '@/actions/initiatives'
import { getObjectives } from '@/actions/objectives'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { ADRTable } from './adr-table'
import { getOrgUsersForPicker } from '@/actions/org-users'

export default async function ADRsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [adrList, capabilityList, applicationList, initiativeList, objectiveList, taxonomyDefinitions, orgUsers] = await Promise.all([
    getADRs(scope),
    getCapabilities(),
    getApplications(),
    getInitiatives(),
    getObjectives(),
    getEntityTaxonomyDefinitions(orgId, 'adr'),
    getOrgUsersForPicker(),
  ])

  const adrIds = adrList.map(a => a.id)
  const taxonomyValueMap = adrIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'adr', adrIds)
    : {}

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Architecture Decision Records</h1>
          <p className="text-muted-foreground mt-1">
            Documented decisions that shaped the architecture — what was decided, why, and what it means going forward.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <ADRTable
        adrs={adrList}
        capabilities={capabilityList}
        applications={applicationList}
        initiatives={initiativeList}
        objectives={objectiveList}
        role={role}
        currentOrgId={orgId}
        currentUserId={session.user.id}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
        orgUsers={orgUsers}
      />
    </div>
  )
}
