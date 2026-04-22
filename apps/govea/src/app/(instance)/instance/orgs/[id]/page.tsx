import { notFound } from 'next/navigation'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users, breakGlassSessions } from '@/db/schema'
import { eq, and, isNull, gt, desc } from 'drizzle-orm'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmWithReason } from '@/components/confirm-with-reason'
import { suspendOrg, unsuspendOrg, grantBreakGlass, revokeBreakGlass } from '@/actions/instance'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireInstanceAdmin()

  const [org, orgUsers, activeBG, bgHistory] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, id) }),
    db.query.users.findMany({
      where: eq(users.organizationId, id),
      orderBy: (u, { asc }) => [asc(u.name)],
    }),
    db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, session.user.id),
        eq(breakGlassSessions.targetOrgId, id),
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, new Date()),
      ),
    }),
    db.query.breakGlassSessions.findMany({
      where: eq(breakGlassSessions.targetOrgId, id),
      orderBy: [desc(breakGlassSessions.grantedAt)],
      limit: 10,
    }),
  ])

  if (!org) notFound()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/instance/orgs" className="hover:underline">Organisations</Link>
            <span>/</span>
            <span>{org.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-0.5">{org.slug}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            org.suspendedAt
              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          )}>
            {org.suspendedAt ? 'Suspended' : 'Active'}
          </span>
          {!org.isSystemOrg && (
            org.suspendedAt ? (
              <form action={async () => {
                'use server'
                await unsuspendOrg(id)
              }}>
                <Button type="submit" variant="outline" size="sm">Unsuspend</Button>
              </form>
            ) : (
              <ConfirmWithReason
                trigger={<Button variant="destructive" size="sm">Suspend</Button>}
                title={`Suspend "${org.name}"`}
                description="This will mark the organisation as suspended. Enter a reason for the audit log."
                placeholder="e.g. Non-payment, policy violation…"
                confirmLabel="Suspend Organisation"
                destructive
                onConfirm={async (reason) => {
                  'use server'
                  await suspendOrg(id, reason)
                }}
              />
            )
          )}
        </div>
      </div>

      {/* Suspension notice */}
      {org.suspendedAt && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
          <strong>Suspended</strong> on {org.suspendedAt.toLocaleString()}
          {org.suspendedReason && <> — {org.suspendedReason}</>}
        </div>
      )}

      {/* Org metadata */}
      <section>
        <h2 className="text-base font-semibold mb-3">Details</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Created</dt><dd className="mt-0.5 font-medium">{org.createdAt.toLocaleDateString()}</dd></div>
          <div><dt className="text-muted-foreground">Theme</dt><dd className="mt-0.5 font-medium">{org.theme}</dd></div>
          <div><dt className="text-muted-foreground">System org</dt><dd className="mt-0.5 font-medium">{org.isSystemOrg ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-muted-foreground">Users</dt><dd className="mt-0.5 font-medium">{orgUsers.length}</dd></div>
        </dl>
      </section>

      {/* Break-glass */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Break-Glass Access</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Time-limited read-only access to this organisation&apos;s data for incident investigation. All sessions are audited.
            </p>
          </div>
          {!activeBG && !org.isSystemOrg && (
            <ConfirmWithReason
              trigger={<Button variant="outline" size="sm">Grant Access</Button>}
              title="Grant break-glass access"
              description={`You will have read-only access to "${org.name}" for 24 hours. Enter a reason for the audit log.`}
              placeholder="e.g. User support request, incident investigation…"
              confirmLabel="Grant 24h Access"
              onConfirm={async (reason) => {
                'use server'
                await grantBreakGlass(id, reason)
              }}
            />
          )}
        </div>

        {activeBG ? (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Active session</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Expires {activeBG.expiresAt.toLocaleString()} · Reason: {activeBG.reason}
                </p>
              </div>
              <form action={async () => {
                'use server'
                await revokeBreakGlass(activeBG.id, id)
              }}>
                <Button type="submit" variant="destructive" size="sm">Revoke</Button>
              </form>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active session.</p>
        )}

        {bgHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Session history</h3>
            <div className="divide-y rounded-md border text-sm">
              {bgHistory.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <span className={cn(
                    'shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                    s.revokedAt
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : s.expiresAt < new Date()
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  )}>
                    {s.revokedAt ? 'Revoked' : s.expiresAt < new Date() ? 'Expired' : 'Active'}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">{s.reason}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.grantedAt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Users */}
      <section>
        <h2 className="text-base font-semibold mb-3">Users <span className="text-muted-foreground font-normal text-sm">({orgUsers.length})</span></h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className="capitalize text-sm">{u.role}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      u.isActive === 'true'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {u.isActive === 'true' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {orgUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users in this organisation
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
