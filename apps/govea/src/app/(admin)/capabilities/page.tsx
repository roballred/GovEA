import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { getTaxonomyDomains } from '@/actions/taxonomy'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { CapabilityTable } from './capability-table'
import { getOrgUsersForPicker } from '@/actions/org-users'
export default async function CapabilitiesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [capabilityList, personaList, domainTerms, taxonomyDefinitions, orgUsers] = await Promise.all([
    getCapabilities(scope),
    getPersonas(),
    getTaxonomyDomains(),
    getEntityTaxonomyDefinitions(orgId, 'capability'),
    getOrgUsersForPicker(),
  ])

  const capabilityIds = capabilityList.map(c => c.id)
  const taxonomyValueMap = capabilityIds.length > 0
    ? await getEntityTaxonomyValuesForMany(orgId, 'capability', capabilityIds)
    : {}

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Capabilities</h1>
          <p className="text-muted-foreground mt-1">What your organization must be able to do, traced back to persona needs.</p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <CapabilityTable
        capabilities={capabilityList}
        personas={personaList}
        domainTerms={domainTerms}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
        role={role}
        currentOrgId={orgId}
        currentUserId={session.user.id}
        orgUsers={orgUsers}
      />
    </div>
  )
}
