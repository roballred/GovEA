import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrinciples } from '@/actions/principles'
import { getADRs } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { getPrincipleTypes } from '@/actions/taxonomy'
import { getEntityTaxonomyDefinitions, getEntityTaxonomyValuesForMany } from '@/lib/entity-taxonomy-helpers'
import { PrincipleTable } from './principle-table'

export default async function PrinciplesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [principleList, adrList, capabilityList, principleTypes, taxonomyDefinitions] = await Promise.all([
    getPrinciples(),
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Principles</h1>
        <p className="text-muted-foreground mt-1">
          Guiding statements that shape how the organization approaches architecture and technology decisions.
        </p>
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
