import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplications } from '@/actions/applications'
import { getCapabilities } from '@/actions/capabilities'
import { ApplicationTable } from './application-table'
import type { Role } from '@/lib/rbac'

export default async function ApplicationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const role = (session.user as any).role as Role

  const [applicationList, capabilityList] = await Promise.all([
    getApplications(orgId),
    getCapabilities(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-1">Your application portfolio, linked to the capabilities they support.</p>
      </div>
      <ApplicationTable applications={applicationList} capabilities={capabilityList} role={role} />
    </div>
  )
}
