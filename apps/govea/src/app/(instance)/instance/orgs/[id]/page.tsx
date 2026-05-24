import { notFound } from 'next/navigation'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users, breakGlassSessions } from '@/db/schema'
import { eq, and, isNull, gt, ne, desc, count } from 'drizzle-orm'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmWithReason } from '@/components/confirm-with-reason'
import { BreakGlassGrantForm } from '@/components/break-glass-grant-form'
import {
  suspendOrg,
  unsuspendOrg,
  grantBreakGlass,
  revokeBreakGlass,
  approveBreakGlass,
  getOrgGovernanceHistory,
} from '@/actions/instance'
import { startActAs } from '@/actions/act-as'
import { getActiveActAsSession } from '@/lib/act-as'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { OrgGovernanceForm } from './org-governance-form'

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  community: { label: 'Community', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  standard:  { label: 'Standard',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  premium:   { label: 'Premium',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  enterprise:{ label: 'Enterprise',cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
}

const ACTION_LABELS: Record<string, string> = {
  'instance.org.create':              'Created',
  'instance.org.suspend':             'Suspended',
  'instance.org.unsuspend':           'Unsuspended',
  'instance.org.governance.update':   'Governance updated',
  'instance.break_glass.grant':       'Break-glass granted',
  'instance.break_glass.approve':     'Break-glass approved',
  'instance.break_glass.revoke':      'Break-glass revoked',
}

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireInstanceAdmin()

  const now = new Date()
  const [org, userCountRow, myActiveSession, pendingFromOthers, bgHistory, govHistory] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, id) }),
    // #436 — only the COUNT is metadata. Full user rows are loaded below,
    // and only when the caller has earned the right to see them.
    db.select({ n: count(users.id) }).from(users).where(eq(users.organizationId, id)),
    db.query.breakGlassSessions.findFirst({
      where: and(
        eq(breakGlassSessions.instanceAdminId, session.user.id),
        eq(breakGlassSessions.targetOrgId, id),
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, now),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    }),
    db.query.breakGlassSessions.findMany({
      where: and(
        eq(breakGlassSessions.targetOrgId, id),
        eq(breakGlassSessions.requiresApproval, true),
        isNull(breakGlassSessions.approvedAt),
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, now),
        ne(breakGlassSessions.instanceAdminId, session.user.id),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
    }),
    db.query.breakGlassSessions.findMany({
      where: eq(breakGlassSessions.targetOrgId, id),
      orderBy: [desc(breakGlassSessions.grantedAt)],
      limit: 10,
    }),
    getOrgGovernanceHistory(id),
  ])

  const activeActAs = await getActiveActAsSession()
  const isActingOnThisOrg = !!activeActAs && activeActAs.targetOrgId === id

  const myActiveIsPending = !!myActiveSession && myActiveSession.requiresApproval && !myActiveSession.approvedAt

  if (!org) notFound()

  const userCount = userCountRow[0]?.n ?? 0

  // #436 — gate user PII on active+approved break-glass. The caller can also
  // see their own home org without break-glass (no cross-tenant boundary
  // being crossed there).
  const isHomeOrg = id === session.user.organizationId
  const canSeeUserPii = isHomeOrg || (!!myActiveSession && !myActiveIsPending)
  const orgUsers = canSeeUserPii
    ? await db.query.users.findMany({
        where: eq(users.organizationId, id),
        orderBy: (u, { asc }) => [asc(u.name)],
      })
    : []

  const tierBadge = org.supportTier ? TIER_BADGE[org.supportTier] : null

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
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-muted-foreground font-mono text-sm">{org.slug}</p>
            {tierBadge && (
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                tierBadge.cls,
              )}>
                {tierBadge.label}
              </span>
            )}
          </div>
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
          <div><dt className="text-muted-foreground">Users</dt><dd className="mt-0.5 font-medium">{userCount}</dd></div>
        </dl>
      </section>

      {/* Governance */}
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Governance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Internal-only metadata. Support tier and notes are never shown to the tenant.
          </p>
        </div>

        <OrgGovernanceForm
          orgId={id}
          initialTier={org.supportTier}
          initialNotes={org.internalNotes}
        />

        {govHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance history</h3>
            <div className="divide-y rounded-md border text-sm">
              {govHistory.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 text-muted-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Break-glass */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Break-Glass Access</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Time-limited access to this organisation&apos;s data for incident investigation. Sessions over 1 hour require a second instance admin to approve. All sessions are audited.
            </p>
          </div>
          {!myActiveSession && !org.isSystemOrg && (
            <BreakGlassGrantForm
              trigger={<Button variant="outline" size="sm">Grant Access</Button>}
              orgName={org.name}
              onConfirm={async (reason, ttlMinutes) => {
                'use server'
                await grantBreakGlass(id, reason, ttlMinutes)
              }}
            />
          )}
        </div>

        {/* Pending sessions from OTHER admins — caller can approve them */}
        {pendingFromOthers.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Awaiting your approval
            </h3>
            {pendingFromOthers.map(s => (
              <div
                key={s.id}
                className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300">
                      Pending approval — granted by another admin
                    </p>
                    <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                      Requested {s.grantedAt.toLocaleString()} · expires {s.expiresAt.toLocaleString()} · Reason: {s.reason}
                    </p>
                  </div>
                  <form action={async () => {
                    'use server'
                    await approveBreakGlass(s.id)
                  }}>
                    <Button type="submit" variant="default" size="sm">Approve</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {myActiveSession ? (
          <div
            className={cn(
              'rounded-md p-4 border',
              myActiveIsPending
                ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p
                  className={cn(
                    'font-medium',
                    myActiveIsPending
                      ? 'text-slate-800 dark:text-slate-300'
                      : 'text-amber-800 dark:text-amber-300',
                  )}
                >
                  {myActiveIsPending ? 'Pending approval' : 'Active session'}
                </p>
                <p
                  className={cn(
                    'mt-0.5',
                    myActiveIsPending
                      ? 'text-slate-700 dark:text-slate-400'
                      : 'text-amber-700 dark:text-amber-400',
                  )}
                >
                  {myActiveIsPending
                    ? `Awaiting approval from another instance admin · expires ${myActiveSession.expiresAt.toLocaleString()} regardless of when approved · Reason: ${myActiveSession.reason}`
                    : `Expires ${myActiveSession.expiresAt.toLocaleString()} · Reason: ${myActiveSession.reason}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!myActiveIsPending && !isActingOnThisOrg && (
                  <form action={async () => {
                    'use server'
                    await startActAs(id)
                  }}>
                    <Button type="submit" variant="default" size="sm">Act as tenant</Button>
                  </form>
                )}
                {isActingOnThisOrg && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Acting as this tenant
                  </span>
                )}
                <form action={async () => {
                  'use server'
                  await revokeBreakGlass(myActiveSession.id, id)
                }}>
                  <Button type="submit" variant="destructive" size="sm">Revoke</Button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active session.</p>
        )}

        {bgHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Session history</h3>
            <div className="divide-y rounded-md border text-sm">
              {bgHistory.map(s => {
                const expired = s.expiresAt < new Date()
                const pending = !s.revokedAt && !expired && s.requiresApproval && !s.approvedAt
                const status = s.revokedAt
                  ? 'Revoked'
                  : expired
                    ? 'Expired'
                    : pending
                      ? 'Pending'
                      : 'Active'
                const cls = s.revokedAt || expired
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  : pending
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className={cn(
                      'shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                      cls,
                    )}>
                      {status}
                    </span>
                    <span className="flex-1 truncate text-muted-foreground">{s.reason}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.grantedAt.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Users — #436 gates PII behind active+approved break-glass. */}
      <section>
        <h2 className="text-base font-semibold mb-3">Users <span className="text-muted-foreground font-normal text-sm">({userCount})</span></h2>
        {canSeeUserPii ? (
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
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              User PII hidden — break-glass required
            </p>
            <p className="text-amber-800 dark:text-amber-400 mt-1">
              {userCount === 0
                ? 'This organisation has no users to display.'
                : `${userCount} user${userCount === 1 ? '' : 's'} on file. Grant break-glass access above to see names, emails, roles, and account status. Sessions over one hour require a second instance admin to approve.`}
            </p>
            {myActiveSession && myActiveIsPending && (
              <p className="text-amber-700 dark:text-amber-500 mt-2 text-xs">
                Your break-glass request is pending approval from another instance admin.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
