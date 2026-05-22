import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit, isAdmin } from '@/lib/rbac'
import {
  getAuditEntries, getAuditActorOptions, getAuditActionNamespaces,
  timeWindowToDate, type AuditTimeWindow,
} from '@/lib/audit-view'
import { AuditLogFilters } from '@/components/audit-log-filters'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const VALID_WINDOWS: AuditTimeWindow[] = ['24h', '7d', '30d', '90d', 'all']

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; since?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/dashboard')

  const isUserAdmin = isAdmin(session.user)
  const role: 'admin' | 'contributor' = isUserAdmin ? 'admin' : 'contributor'
  const orgId = session.user.organizationId!

  const params = await searchParams
  const actorUserId = params.actor || null
  const actionNamespaces = params.action ? params.action.split(',').filter(Boolean) : []
  const windowKey = (VALID_WINDOWS.includes((params.since ?? '30d') as AuditTimeWindow)
    ? (params.since ?? '30d')
    : '30d') as AuditTimeWindow
  const since = timeWindowToDate(windowKey)

  const [entries, actorOptions, namespaceOptions] = await Promise.all([
    getAuditEntries(orgId, role, { actorUserId, actionNamespaces, since }),
    getAuditActorOptions(orgId, role),
    getAuditActionNamespaces(orgId, role),
  ])

  const filteredOut = actorUserId || actionNamespaces.length > 0 || windowKey !== '30d'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          {isUserAdmin
            ? 'A record of all actions taken in this organization.'
            : 'Changes to architecture content in this organization. Authentication, user management, and organization settings stay admin-only.'}
        </p>
      </div>

      <AuditLogFilters actors={actorOptions} actionNamespaces={namespaceOptions} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Performed by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ log, user: u }) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{log.createdAt.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-muted-foreground">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</TableCell>
                <TableCell className="text-muted-foreground">{u?.email ?? 'system'}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {filteredOut
                    ? 'No audit entries match the current filters.'
                    : 'No audit entries yet'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
