import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, adrs, initiatives,
  strategicObjectives, valueStreams, principles, glossaryTerms,
  auditLog, users,
} from '@/db/schema'
import { and, count, eq, gt, isNotNull, desc, asc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DomainBadge } from '@/components/domain-badge'
import Link from 'next/link'

const REVIEW_WINDOW_DAYS = 90

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

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return null
  return Math.round((numerator / denominator) * 100)
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

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is intentional
  const staleThreshold = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [
    personaRows, capabilityRows, applicationRows, adrRows,
    initiativeRows, objectiveRows, valueStreamRows, principleRows, glossaryRows,
    recentActivity,
    capsByDomain,
    // Review health: total + recently modified + recently reviewed for each of 3 entity types
    capTotal, capModified, capReviewed,
    appTotal, appModified, appReviewed,
    personaTotal, personaModified, personaReviewed,
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
    db
      .select({ domain: capabilities.domain, count: count() })
      .from(capabilities)
      .where(eq(capabilities.organizationId, orgId))
      .groupBy(capabilities.domain)
      .orderBy(asc(capabilities.domain)),
    // Capability review health
    db.select({ count: count() }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ count: count() }).from(capabilities).where(and(eq(capabilities.organizationId, orgId), gt(capabilities.updatedAt, staleThreshold))),
    db.select({ count: count() }).from(capabilities).where(and(eq(capabilities.organizationId, orgId), isNotNull(capabilities.lastReviewedAt), gt(capabilities.lastReviewedAt, staleThreshold))),
    // Application review health
    db.select({ count: count() }).from(applications).where(eq(applications.organizationId, orgId)),
    db.select({ count: count() }).from(applications).where(and(eq(applications.organizationId, orgId), gt(applications.updatedAt, staleThreshold))),
    db.select({ count: count() }).from(applications).where(and(eq(applications.organizationId, orgId), isNotNull(applications.lastReviewedAt), gt(applications.lastReviewedAt, staleThreshold))),
    // Persona review health
    db.select({ count: count() }).from(personas).where(eq(personas.organizationId, orgId)),
    db.select({ count: count() }).from(personas).where(and(eq(personas.organizationId, orgId), gt(personas.updatedAt, staleThreshold))),
    db.select({ count: count() }).from(personas).where(and(eq(personas.organizationId, orgId), isNotNull(personas.lastReviewedAt), gt(personas.lastReviewedAt, staleThreshold))),
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

  const reviewHealth = [
    { label: 'Capabilities', href: '/capabilities', total: Number(capTotal[0].count),    modified: Number(capModified[0].count),    reviewed: Number(capReviewed[0].count) },
    { label: 'Applications', href: '/applications', total: Number(appTotal[0].count),    modified: Number(appModified[0].count),    reviewed: Number(appReviewed[0].count) },
    { label: 'Personas',     href: '/personas',     total: Number(personaTotal[0].count), modified: Number(personaModified[0].count), reviewed: Number(personaReviewed[0].count) },
  ]

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

      {/* Review Health */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Review Health <span className="font-normal normal-case">({REVIEW_WINDOW_DAYS}-day window)</span>
        </p>
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="divide-y">
              {reviewHealth.map(row => {
                const modifiedPct = pct(row.modified, row.total)
                const reviewedPct = pct(row.reviewed, row.total)
                return (
                  <div key={row.label} className="py-3 flex items-center gap-4">
                    <Link href={row.href} className="w-28 text-sm font-medium hover:underline shrink-0">{row.label}</Link>
                    <div className="flex-1 flex items-center gap-6 text-sm">
                      <span className="text-muted-foreground">
                        Modified:{' '}
                        <span className={modifiedPct !== null && modifiedPct < 50 ? 'text-amber-600 font-medium' : 'font-medium'}>
                          {modifiedPct !== null ? `${modifiedPct}%` : '—'}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Reviewed:{' '}
                        <span className={reviewedPct !== null && reviewedPct < 50 ? 'text-amber-600 font-medium' : 'font-medium'}>
                          {reviewedPct !== null ? `${reviewedPct}%` : '—'}
                        </span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{row.total} total</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capabilities by Domain */}
      {capsByDomain.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Capabilities by Domain</p>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3">
                {capsByDomain.map(row => (
                  <Link
                    key={row.domain ?? '__none__'}
                    href={`/capabilities${row.domain ? `?domain=${encodeURIComponent(row.domain)}` : ''}`}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    {row.domain
                      ? <DomainBadge domain={row.domain} />
                      : <span className="text-xs text-muted-foreground">Uncategorized</span>
                    }
                    <span className="text-sm font-semibold">{Number(row.count)}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
