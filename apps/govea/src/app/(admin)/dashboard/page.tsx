import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, adrs, initiatives,
  strategicObjectives, valueStreams, principles, glossaryTerms,
  auditLog, users,
} from '@/db/schema'
import { count, eq, desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

function pivotCounts(rows: { status: string; count: number | string }[]) {
  const byStatus: Record<string, number> = {}
  let total = 0
  for (const r of rows) {
    const n = Number(r.count)
    byStatus[r.status] = n
    total += n
  }
  return { total, byStatus }
}

const COVERAGE_ENTITIES = [
  { label: 'Capabilities',   key: 'capabilities' as const,  href: '/capabilities',   draftKey: 'draft'     },
  { label: 'Applications',   key: 'applications' as const,  href: '/applications',   draftKey: 'draft'     },
  { label: 'Personas',       key: 'personas'     as const,  href: '/personas',       draftKey: 'draft'     },
  { label: 'Value Streams',  key: 'valueStreams'  as const,  href: '/value-streams',  draftKey: 'draft'     },
  { label: 'Objectives',     key: 'objectives'   as const,  href: '/objectives',     draftKey: 'draft'     },
  { label: 'Initiatives',    key: 'initiatives'  as const,  href: '/initiatives',    draftKey: 'proposed'  },
  { label: 'Decisions',      key: 'adrs'         as const,  href: '/adrs',           draftKey: 'proposed'  },
  { label: 'Principles',     key: 'principles'   as const,  href: '/principles',     draftKey: 'draft'     },
  { label: 'Glossary',       key: 'glossary'     as const,  href: '/glossary',       draftKey: 'draft'     },
]

const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  proposed:   'Proposed',
  active:     'Active',
  'on-hold':  'On Hold',
  complete:   'Complete',
  cancelled:  'Cancelled',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const [
    personaRows, capabilityRows, applicationRows, adrRows,
    initiativeRows, objectiveRows, valueStreamRows, principleRows, glossaryRows,
    recentActivity,
  ] = await Promise.all([
    db.select({ status: personas.status,           count: count() }).from(personas)           .where(eq(personas.organizationId,           orgId)).groupBy(personas.status),
    db.select({ status: capabilities.status,       count: count() }).from(capabilities)       .where(eq(capabilities.organizationId,       orgId)).groupBy(capabilities.status),
    db.select({ status: applications.status,       count: count() }).from(applications)       .where(eq(applications.organizationId,       orgId)).groupBy(applications.status),
    db.select({ status: adrs.status,               count: count() }).from(adrs)               .where(eq(adrs.organizationId,               orgId)).groupBy(adrs.status),
    db.select({ status: initiatives.status,        count: count() }).from(initiatives)        .where(eq(initiatives.organizationId,        orgId)).groupBy(initiatives.status),
    db.select({ status: strategicObjectives.status, count: count() }).from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId)).groupBy(strategicObjectives.status),
    db.select({ status: valueStreams.status,        count: count() }).from(valueStreams)        .where(eq(valueStreams.organizationId,        orgId)).groupBy(valueStreams.status),
    db.select({ status: principles.status,          count: count() }).from(principles)          .where(eq(principles.organizationId,          orgId)).groupBy(principles.status),
    db.select({ status: glossaryTerms.status,       count: count() }).from(glossaryTerms)       .where(eq(glossaryTerms.organizationId,       orgId)).groupBy(glossaryTerms.status),
    db
      .select({ log: auditLog, user: users })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(eq(auditLog.organizationId, orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ])

  const stats = {
    capabilities: pivotCounts(capabilityRows),
    applications: pivotCounts(applicationRows),
    personas:     pivotCounts(personaRows),
    valueStreams:  pivotCounts(valueStreamRows),
    objectives:   pivotCounts(objectiveRows),
    initiatives:  pivotCounts(initiativeRows),
    adrs:         pivotCounts(adrRows),
    principles:   pivotCounts(principleRows),
    glossary:     pivotCounts(glossaryRows),
  }

  const needsAttention = COVERAGE_ENTITIES
    .map(e => ({ ...e, draftCount: stats[e.key].byStatus[e.draftKey] ?? 0 }))
    .filter(e => e.draftCount > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{session.user.name ? `, ${session.user.name}` : ''}.
        </p>
      </div>

      {/* Coverage */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coverage</p>
        <div className="grid gap-3 grid-cols-3">
          {COVERAGE_ENTITIES.map(e => {
            const s = stats[e.key]
            const draftCount = s.byStatus[e.draftKey] ?? 0
            return (
              <Link key={e.key} href={e.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{e.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    <p className="text-2xl font-bold">{s.total}</p>
                    {draftCount > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">{draftCount} draft</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Needs Attention */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts — all content is published.</p>
            ) : (
              <ul className="space-y-2">
                {needsAttention.map(e => (
                  <li key={e.key} className="flex items-center justify-between text-sm">
                    <Link href={e.href} className="hover:underline">{e.label}</Link>
                    <span className="font-medium text-amber-600">{e.draftCount} draft</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Initiative breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Initiatives</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.initiatives.total === 0 ? (
              <p className="text-sm text-muted-foreground">No initiatives yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(INITIATIVE_STATUS_LABELS).map(([key, label]) => {
                  const c = stats.initiatives.byStatus[key] ?? 0
                  if (c === 0) return null
                  return (
                    <li key={key} className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-medium">{c}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {recentActivity.map(({ log, user: u }) => (
                <li key={log.id} className="py-2 flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground whitespace-nowrap shrink-0 w-32">
                    {log.createdAt.toLocaleDateString()} {log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0 w-40 truncate">{log.action}</span>
                  <span className="text-muted-foreground capitalize flex-1">{log.entityType}</span>
                  <span className="text-muted-foreground truncate max-w-[160px]">{u?.email ?? 'system'}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
