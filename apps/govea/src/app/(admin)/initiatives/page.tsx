import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInitiatives } from '@/actions/initiatives'
import { getCapabilities } from '@/actions/capabilities'
import { getObjectives } from '@/actions/objectives'
import { InitiativeTable } from './initiative-table'
import type { Role } from '@/lib/rbac'

export default async function InitiativesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const role = (session.user as any).role as Role

  const [initiativeList, capabilityList, objectiveList] = await Promise.all([
    getInitiatives(orgId),
    getCapabilities(orgId),
    getObjectives(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Initiatives</h1>
        <p className="text-muted-foreground mt-1">
          Time-bounded work efforts that build, improve, or retire capabilities in pursuit of strategic objectives.
        </p>
      </div>
      <InitiativeTable
        initiatives={initiativeList}
        capabilities={capabilityList}
        objectives={objectiveList}
        role={role}
      />
    </div>
  )
}
