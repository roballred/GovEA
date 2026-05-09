import Link from 'next/link'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users, auditLog, breakGlassSessions } from '@/db/schema'
import { count, eq, desc, isNull, isNotNull, gt, and, or, ilike } from 'drizzle-orm'
import { cn } from '@/lib/utils'

export default async function InstanceDashboardPage() {
  const session = await requireInstanceAdmin()

  const now = new Date()

  const [
    [{ orgCount }],
    [{ userCount }],
    [{ activeBgCount }],
    [{ pendingBgCount }],
    pendingSessions,
    recentEvents,
  ] = await Promise.all([
    db.select({ orgCount: count() }).from(organizations).where(eq(organizations.isSystemOrg, false)),
    db.select({ userCount: count() }).from(users),
    // Active = non-revoked, non-expired, AND (no approval needed OR already approved).
    // Pending sessions are counted separately below.
    db.select({ activeBgCount: count() }).from(breakGlassSessions).where(
      and(
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, now),
        or(
          eq(breakGlassSessions.requiresApproval, false),
          isNotNull(breakGlassSessions.approvedAt),
        ),
      ),
    ),
    db.select({ pendingBgCount: count() }).from(breakGlassSessions).where(
      and(
        eq(breakGlassSessions.requiresApproval, true),
        isNull(breakGlassSessions.approvedAt),
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, now),
      ),
    ),
    db.query.breakGlassSessions.findMany({
      where: and(
        eq(breakGlassSessions.requiresApproval, true),
        isNull(breakGlassSessions.approvedAt),
        isNull(breakGlassSessions.revokedAt),
        gt(breakGlassSessions.expiresAt, now),
      ),
      orderBy: (s, { desc }) => [desc(s.grantedAt)],
      limit: 10,
    }),
    db.select().from(auditLog)
      .where(ilike(auditLog.action, 'instance.%'))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ])

  // Resolve org names for pending sessions in a single query.
  const orgNamesById = new Map<string, string>()
  if (pendingSessions.length > 0) {
    const ids = Array.from(new Set(pendingSessions.map(s => s.targetOrgId)))
    const orgs = await db.query.organizations.findMany({
      where: (o, { inArray }) => inArray(o.id, ids),
      columns: { id: true, name: true },
    })
    orgs.forEach(o => orgNamesById.set(o.id, o.name))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">Instance-level overview for GovEA Platform administrators.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tenant Organisations" value={orgCount} />
        <StatCard label="Total Users" value={userCount} />
        <StatCard label="Active Break-Glass Sessions" value={activeBgCount} warn={activeBgCount > 0} />
      </div>

      {pendingBgCount > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Pending Break-Glass Approvals <span className="text-muted-foreground text-base font-normal">({pendingBgCount})</span>
          </h2>
          <div className="rounded-lg border divide-y bg-card">
            {pendingSessions.map(s => {
              const isOwn = s.instanceAdminId === session.user.id
              const orgName = orgNamesById.get(s.targetOrgId) ?? s.targetOrgId
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    {isOwn ? 'Your request' : 'Awaiting your approval'}
                  </span>
                  <Link href={`/instance/orgs/${s.targetOrgId}`} className="flex-1 truncate hover:underline">
                    <span className="font-medium">{orgName}</span>
                    <span className="text-muted-foreground"> · {s.reason}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">expires {s.expiresAt.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Platform Events</h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No platform-level events recorded yet.</p>
        ) : (
          <div className="rounded-lg border divide-y bg-card">
            {recentEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <code className="shrink-0 text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{e.action}</code>
                <span className="text-muted-foreground flex-1 truncate">
                  {e.entityType}{e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ''}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{e.createdAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-5', warn ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'bg-card')}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-3xl font-bold mt-1', warn && 'text-amber-700 dark:text-amber-400')}>{value}</p>
    </div>
  )
}
