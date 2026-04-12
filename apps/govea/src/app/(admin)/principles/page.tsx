import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrinciples } from '@/actions/principles'
import { getADRs } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { PrincipleTable } from './principle-table'

export default async function PrinciplesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [principleList, adrList, capabilityList] = await Promise.all([
    getPrinciples(orgId),
    getADRs(orgId),
    getCapabilities(orgId),
  ])

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
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
