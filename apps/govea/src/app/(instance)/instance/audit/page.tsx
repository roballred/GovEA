import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { auditLog, users, breakGlassSessions, organizations } from '@/db/schema'
import { eq, desc, isNull } from 'drizzle-orm'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function InstanceAuditPage() {
  await requireInstanceAdmin()

  const [instanceEvents, bgSessions] = await Promise.all([
    db
      .select({ log: auditLog, actor: users })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(isNull(auditLog.organizationId))
      .orderBy(desc(auditLog.createdAt))
      .limit(200),
    db
      .select({ session: breakGlassSessions, admin: users, org: organizations })
      .from(breakGlassSessions)
      .leftJoin(users, eq(breakGlassSessions.instanceAdminId, users.id))
      .leftJoin(organizations, eq(breakGlassSessions.targetOrgId, organizations.id))
      .orderBy(desc(breakGlassSessions.grantedAt))
      .limit(100),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Audit Log</h1>
        <p className="text-muted-foreground mt-1">Instance-level events and break-glass session history.</p>
      </div>

      {/* Instance events */}
      <section>
        <h2 className="text-base font-semibold mb-3">Platform Events</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instanceEvents.map(({ log, actor }) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {log.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{actor?.email ?? 'system'}</TableCell>
                </TableRow>
              ))}
              {instanceEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No platform events recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Break-glass sessions */}
      <section>
        <h2 className="text-base font-semibold mb-3">Break-Glass Sessions</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Granted</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Target Org</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Expires / Revoked</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bgSessions.map(({ session: s, admin, org }) => {
                const now = new Date()
                const status = s.revokedAt ? 'Revoked' : s.expiresAt < now ? 'Expired' : 'Active'
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {s.grantedAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{admin?.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">{org?.name ?? s.targetOrgId.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.revokedAt ? s.revokedAt.toLocaleString() : s.expiresAt.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={
                        status === 'Active'
                          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }>
                        {status}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
              {bgSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No break-glass sessions recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
