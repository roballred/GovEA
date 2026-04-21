import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { getTaxonomyDomains } from '@/actions/taxonomy'
import { CapabilityTable } from './capability-table'
export default async function CapabilitiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [capabilityList, personaList, domainTerms] = await Promise.all([
    getCapabilities(orgId, role),
    getPersonas(orgId, role),
    getTaxonomyDomains(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capabilities</h1>
        <p className="text-muted-foreground mt-1">What your organization must be able to do, traced back to persona needs.</p>
      </div>
      <CapabilityTable capabilities={capabilityList} personas={personaList} domainTerms={domainTerms} role={role} currentOrgId={orgId} />
    </div>
  )
}
