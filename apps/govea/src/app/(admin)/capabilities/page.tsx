import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { getTaxonomyDomains, getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/actions/taxonomy'
import { CapabilityTable } from './capability-table'
export default async function CapabilitiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [capabilityList, personaList, domainTerms, taxonomyDefinitions] = await Promise.all([
    getCapabilities(),
    getPersonas(),
    getTaxonomyDomains(),
    getEntityTaxonomyDefinitions(orgId, 'capability'),
  ])

  const capabilityIds = capabilityList.map(c => c.id)
  const taxonomyValueMap = capabilityIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'capability', capabilityIds)
    : {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capabilities</h1>
        <p className="text-muted-foreground mt-1">What your organization must be able to do, traced back to persona needs.</p>
      </div>
      <CapabilityTable
        capabilities={capabilityList}
        personas={personaList}
        domainTerms={domainTerms}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
