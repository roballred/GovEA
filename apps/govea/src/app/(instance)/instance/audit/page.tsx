import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { auditLog, users, breakGlassSessions, organizations } from '@/db/schema'
import { and, eq, desc, isNull, gte, inArray } from 'drizzle-orm'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AuditFilters } from './audit-filters'
import { getFailedLoginSummary } from '@/lib/audit-view'

function cutoffForSince(since: string | undefined): Date | null {
  switch (since) {
    case '24h': return new Date(Date.now() - 24 * 60 * 60 * 1000)
    case '7d':  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    default:    return null
  }
}

export default async function InstanceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; since?: string }>
}) {
  await requireInstanceAdmin()

  const params = await searchParams
  const actor = params.actor ?? ''
  const actionFilter = params.action ? params.action.split(',').filter(Boolean) : []
  const since = params.since ?? 'all'
  const cutoff = cutoffForSince(since)

  // Platform Events: instance-scoped audit (organizationId IS NULL) + filters
  const eventWhere = and(
    isNull(auditLog.organizationId),
    actor ? eq(auditLog.userId, actor) : undefined,
    actionFilter.length > 0 ? inArray(auditLog.action, actionFilter) : undefined,
    cutoff ? gte(auditLog.createdAt, cutoff) : undefined,
  )

  // Break-Glass Sessions: same actor / time filters where applicable
  const bgWhere = and(
    actor ? eq(breakGlassSessions.instanceAdminId, actor) : undefined,
    cutoff ? gte(breakGlassSessions.grantedAt, cutoff) : undefined,
  )

  // #720 — repeated failed-login telemetry (across all orgs), last 7 days.
  const failedLogins = await getFailedLoginSummary({ sinceDays: 7, limit: 10 })

  const [instanceEvents, bgSessions, adminRows, actionRows] = await Promise.all([
    db
      .select({ log: auditLog, actor: users })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(eventWhere)
      .orderBy(desc(auditLog.createdAt))
      .limit(200),
    db
      .select({ session: breakGlassSessions, admin: users, org: organizations })
      .from(breakGlassSessions)
      .leftJoin(users, eq(breakGlassSessions.instanceAdminId, users.id))
      .leftJoin(organizations, eq(breakGlassSessions.targetOrgId, organizations.id))
      .where(bgWhere)
      .orderBy(desc(breakGlassSessions.grantedAt))
      .limit(100),
    db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.instanceRole, 'instance_admin'))
      .orderBy(users.email),
    db
      .selectDistinct({ action: auditLog.action })
      .from(auditLog)
      .where(isNull(auditLog.organizationId))
      .orderBy(auditLog.action),
  ])

  const knownActions = actionRows.map(r => r.action).filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Audit Log</h1>
        <p className="text-muted-foreground mt-1">Instance-level events and break-glass session history.</p>
      </div>

      <AuditFilters
        admins={adminRows}
        actions={knownActions}
        current={{ actor, action: actionFilter, since }}
      />

      {/* Failed-login telemetry (#720) — repeated-failure review across orgs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            Failed Logins <span className="text-muted-foreground text-sm font-normal">(last 7 days)</span>
          </h2>
          <a
            href="/api/instance/audit/export"
            className="text-sm text-primary underline underline-offset-2 hover:no-underline"
          >
            Export CSV (30d)
          </a>
        </div>
        {failedLogins.byEmail.length === 0 && failedLogins.byIp.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border bg-card p-4">
            No failed logins in the last 7 days.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">By attempted email</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">IPs</TableHead>
                    <TableHead>Last</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLogins.byEmail.map(r => (
                    <TableRow key={r.email}>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-right font-medium">{r.attempts}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.distinctIps}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.lastAttempt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {failedLogins.byEmail.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-sm">None</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">By source IP</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead>Last</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLogins.byIp.map(r => (
                    <TableRow key={r.ip}>
                      <TableCell className="font-mono text-xs">{r.ip}</TableCell>
                      <TableCell className="text-right font-medium">{r.attempts}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.distinctEmails}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.lastAttempt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {failedLogins.byIp.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-sm">None</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* Instance events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            Platform Events <span className="text-muted-foreground text-sm font-normal">({instanceEvents.length})</span>
          </h2>
          <a
            href="/api/instance/audit/export?scope=platform"
            className="text-sm text-primary underline underline-offset-2 hover:no-underline"
          >
            Export CSV (30d)
          </a>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Source IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instanceEvents.map(({ log, actor }) => {
                // #720 — proxy-aware client telemetry captured on the event.
                const meta = (log.metadata ?? null) as { ip?: string | null; userAgent?: string | null } | null
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {log.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{actor?.email ?? 'system'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground" title={meta?.userAgent ?? undefined}>
                      {meta?.ip ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
              {instanceEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No platform events match these filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Break-glass sessions */}
      <section>
        <h2 className="text-base font-semibold mb-3">
          Break-Glass Sessions <span className="text-muted-foreground text-sm font-normal">({bgSessions.length})</span>
        </h2>
        {actionFilter.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            Action filter applies to Platform Events only; break-glass sessions are unfiltered by action.
          </p>
        )}
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
                    No break-glass sessions match these filters
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
