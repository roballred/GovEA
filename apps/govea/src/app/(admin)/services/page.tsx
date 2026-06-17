import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getServices } from '@/actions/services'
import { getPersonas } from '@/actions/personas'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { ServiceTable } from './service-table'

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [serviceList, personas, taxonomyDefinitions] = await Promise.all([
    getServices(scope),
    getPersonas(),
    getEntityTaxonomyDefinitions(orgId, 'service'),
  ])

  const serviceIds = serviceList.map(s => s.id)
  const taxonomyValueMap = await getEntityTaxonomyValuesForMany(orgId, 'service', serviceIds)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">
            Government-facing services that residents and staff interact with — the direct interface between personas and capabilities.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <ServiceTable
        services={serviceList}
        personas={personas}
        role={role}
        currentOrgId={orgId}
        taxonomyDefinitions={taxonomyDefinitions}
        taxonomyValueMap={taxonomyValueMap}
      />
    </div>
  )
}
