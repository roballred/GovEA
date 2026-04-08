import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getObjectives } from '@/actions/objectives'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { ObjectiveTable } from './objective-table'
import type { Role } from '@/lib/rbac'

export default async function ObjectivesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const role = (session.user as any).role as Role

  const [objectiveList, capabilityList, valueStreamList] = await Promise.all([
    getObjectives(orgId),
    getCapabilities(orgId),
    getValueStreams(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategic Objectives</h1>
        <p className="text-muted-foreground mt-1">
          Measurable goals that justify capability investment and drive portfolio decisions.
        </p>
      </div>
      <ObjectiveTable
        objectives={objectiveList}
        capabilities={capabilityList}
        valueStreams={valueStreamList}
        role={role}
        currentOrgId={orgId}
      />
    </div>
  )
}
