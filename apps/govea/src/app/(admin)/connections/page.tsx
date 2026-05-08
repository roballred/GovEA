import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/rbac'
import { getConnections, getOtherOrganizations } from '@/actions/connections'
import { ConnectionsTable } from './connections-table'

export default async function ConnectionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')

  const orgId = session.user.organizationId!

  const [connections, otherOrgs] = await Promise.all([
    getConnections(),
    getOtherOrganizations(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Org Connections</h1>
        <p className="text-muted-foreground mt-1">
          Connect with other organizations to share capabilities, personas, and applications across organizational boundaries.
        </p>
      </div>
      {otherOrgs.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border bg-card p-8 text-center">
          This is the only organization on this installation. Connections are available when multiple organizations are present.
        </p>
      ) : (
        <ConnectionsTable connections={connections} otherOrgs={otherOrgs} orgId={orgId} />
      )}
    </div>
  )
}
