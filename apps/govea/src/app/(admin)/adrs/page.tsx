import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getADRs } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { getApplications } from '@/actions/applications'
import { getInitiatives } from '@/actions/initiatives'
import { getObjectives } from '@/actions/objectives'
import { ADRTable } from './adr-table'

export default async function ADRsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [adrList, capabilityList, applicationList, initiativeList, objectiveList] = await Promise.all([
    getADRs(orgId, role),
    getCapabilities(orgId),
    getApplications(orgId),
    getInitiatives(orgId),
    getObjectives(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Architecture Decision Records</h1>
        <p className="text-muted-foreground mt-1">
          Documented decisions that shaped the architecture — what was decided, why, and what it means going forward.
        </p>
      </div>
      <ADRTable
        adrs={adrList}
        capabilities={capabilityList}
        applications={applicationList}
        initiatives={initiativeList}
        objectives={objectiveList}
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
