import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getServices } from '@/actions/services'
import { getPersonas } from '@/actions/personas'
import { ServiceTable } from './service-table'

export default async function ServicesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [services, personas] = await Promise.all([
    getServices(orgId),
    getPersonas(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">
          Government-facing services that residents and staff interact with — the direct interface between personas and capabilities.
        </p>
      </div>
      <ServiceTable services={services} personas={personas} role={role} />
    </div>
  )
}
