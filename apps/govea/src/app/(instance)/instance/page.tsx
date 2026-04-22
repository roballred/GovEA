import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users, auditLog, breakGlassSessions } from '@/db/schema'
import { count, eq, desc, isNull, gt, and, ilike } from 'drizzle-orm'
import { cn } from '@/lib/utils'

export default async function InstanceDashboardPage() {
  await requireInstanceAdmin()

  const now = new Date()

  const [[{ orgCount }], [{ userCount }], [{ bgCount }], recentEvents] = await Promise.all([
    db.select({ orgCount: count() }).from(organizations).where(eq(organizations.isSystemOrg, false)),
    db.select({ userCount: count() }).from(users),
    db.select({ bgCount: count() }).from(breakGlassSessions).where(
      and(isNull(breakGlassSessions.revokedAt), gt(breakGlassSessions.expiresAt, now))
    ),
    db.select().from(auditLog)
      .where(ilike(auditLog.action, 'instance.%'))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">Instance-level overview for GovEA Platform administrators.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tenant Organisations" value={orgCount} />
        <StatCard label="Total Users" value={userCount} />
        <StatCard label="Active Break-Glass Sessions" value={bgCount} warn={bgCount > 0} />
      </div>

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
