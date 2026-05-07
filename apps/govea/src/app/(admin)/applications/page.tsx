import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplications } from '@/actions/applications'
import { getCapabilities } from '@/actions/capabilities'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/actions/taxonomy'
import { getCustomFieldSchema } from '@/actions/custom-fields'
import { ApplicationTable } from './application-table'

export default async function ApplicationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [applicationList, capabilityList, taxonomyDefinitions, customFieldDefs] = await Promise.all([
    getApplications(),
    getCapabilities(),
    getEntityTaxonomyDefinitions(orgId, 'application'),
    getCustomFieldSchema(orgId, 'application'),
  ])

  const applicationIds = applicationList.map(a => a.id)
  const taxonomyValueMap = await getEntityTaxonomyValuesForMany(orgId, 'application', applicationIds)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-1">Your application portfolio, linked to the capabilities they support.</p>
      </div>
      <ApplicationTable
        applications={applicationList}
        capabilities={capabilityList}
        role={role}
        currentOrgId={orgId}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
        customFieldDefs={customFieldDefs}
      />
    </div>
  )
}
