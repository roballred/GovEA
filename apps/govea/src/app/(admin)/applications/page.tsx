import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplications } from '@/actions/applications'
import { getCapabilities } from '@/actions/capabilities'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { getCustomFieldSchema } from '@/actions/custom-fields'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { ApplicationTable } from './application-table'
import { getOrgUsersForPicker } from '@/actions/org-users'

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [applicationList, capabilityList, taxonomyDefinitions, customFieldDefs, orgUsers] = await Promise.all([
    getApplications(scope),
    getCapabilities(),
    getEntityTaxonomyDefinitions(orgId, 'application'),
    getCustomFieldSchema(orgId, 'application'),
    getOrgUsersForPicker(),
  ])

  const applicationIds = applicationList.map(a => a.id)
  const taxonomyValueMap = await getEntityTaxonomyValuesForMany(orgId, 'application', applicationIds)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground mt-1">Your application portfolio, linked to the capabilities they support.</p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <ApplicationTable
        applications={applicationList}
        capabilities={capabilityList}
        role={role}
        currentOrgId={orgId}
        currentUserId={session.user.id}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
        customFieldDefs={customFieldDefs}
        orgUsers={orgUsers}
      />
    </div>
  )
}
