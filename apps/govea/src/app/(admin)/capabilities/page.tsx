import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { CapabilityTable } from './capability-table'
import type { Role } from '@/lib/rbac'

export default async function CapabilitiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const role = (session.user as any).role as Role

  const [capabilityList, personaList] = await Promise.all([
    getCapabilities(orgId),
    getPersonas(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capabilities</h1>
        <p className="text-muted-foreground mt-1">What your organization must be able to do, traced back to persona needs.</p>
      </div>
      <CapabilityTable capabilities={capabilityList} personas={personaList} role={role} />
    </div>
  )
}
