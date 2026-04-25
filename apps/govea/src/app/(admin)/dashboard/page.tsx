import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, adrs, initiatives,
  strategicObjectives, valueStreams, principles, glossaryTerms,
  auditLog, users, crossOrgLinks,
} from '@/db/schema'
import { and, count, eq, gt, isNotNull, desc, asc, inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CoverageTileLabel } from './coverage-tile-label'
import { DomainBadge } from '@/components/domain-badge'
import { ConfidenceSummary } from '@/components/confidence-summary'
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
  { label: 'Capabilities',   key: 'capabilities' as const,  href: '/capabilities',   draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Applications',   key: 'applications' as const,  href: '/applications',   draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Personas',       key: 'personas'     as const,  href: '/personas',       draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Value Streams',  key: 'valueStreams'  as const,  href: '/value-streams',  draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Objectives',     key: 'objectives'   as const,  href: '/objectives',     draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Initiatives',    key: 'initiatives'  as const,  href: '/initiatives',    draftKey: 'proposed', tooltip: undefined                         },
  { label: 'Decisions',      key: 'adrs'         as const,  href: '/adrs',           draftKey: 'proposed', tooltip: 'Architecture Decision Records'   },
  { label: 'Principles',     key: 'principles'   as const,  href: '/principles',     draftKey: 'draft',    tooltip: undefined                         },
  { label: 'Glossary',       key: 'glossary'     as const,  href: '/glossary',       draftKey: 'draft',    tooltip: undefined                         },
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
    fedInboundLinks, fedOutboundRows,
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
    // Federation: inbound pending links targeting this org (needs approval)
    db.query.crossOrgLinks.findMany({
      where: and(eq(crossOrgLinks.targetOrgId, orgId), eq(crossOrgLinks.status, 'pending')),
      orderBy: (l, { asc }) => [asc(l.createdAt)],
    }),
    // Federation: outbound link status counts (this org is the source)
    db.select({ status: crossOrgLinks.status, count: count() })
      .from(crossOrgLinks)
      .where(eq(crossOrgLinks.sourceOrgId, orgId))
      .groupBy(crossOrgLinks.status),
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

  // Resolve target entity names for inbound pending links
  const fedCapIds = fedInboundLinks.filter(l => l.targetEntityType === 'capability').map(l => l.targetEntityId)
  const fedPersonaIds = fedInboundLinks.filter(l => l.targetEntityType === 'persona').map(l => l.targetEntityId)
  const [fedCaps, fedPersonas] = await Promise.all([
    fedCapIds.length ? db.query.capabilities.findMany({ where: inArray(capabilities.id, fedCapIds) }) : Promise.resolve([]),
    fedPersonaIds.length ? db.query.personas.findMany({ where: inArray(personas.id, fedPersonaIds) }) : Promise.resolve([]),
  ])
  const fedEntityMap = new Map<string, { name: string; href: string }>([
    ...fedCaps.map(c => [c.id, { name: c.name, href: `/capabilities/${c.id}` }] as const),
    ...fedPersonas.map(p => [p.id, { name: p.name, href: `/personas/${p.id}` }] as const),
  ])

  const fedByStatus: Record<string, number> = {}
  for (const row of fedOutboundRows) fedByStatus[row.status] = (fedByStatus[row.status] ?? 0) + Number(row.count)

  const federation = {
    inboundPending: fedInboundLinks.map(l => ({
      id: l.id,
      linkType: l.linkType,
      entity: fedEntityMap.get(l.targetEntityId) ?? null,
    })),
    outboundPending:  fedByStatus['pending']  ?? 0,
    outboundRejected: fedByStatus['rejected'] ?? 0,
    totalActive:      fedByStatus['active']   ?? 0,
    hasAny: Object.values(fedByStatus).some(n => n > 0) || fedInboundLinks.length > 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{session.user.name ? `, ${session.user.name}` : ''}.
        </p>
      </div>

      <ConfidenceSummary orgId={orgId} />

      {/* Coverage */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coverage</p>
        <TooltipProvider>
          <div className="grid gap-3 grid-cols-3">
            {COVERAGE_ENTITIES.map(e => {
              const s = stats[e.key]
              const draftCount = s.byStatus[e.draftKey] ?? 0
              return (
                <Link key={e.key} href={e.href}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        <CoverageTileLabel label={e.label} tooltip={e.tooltip} />
                      </CardTitle>
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
        </TooltipProvider>
      </div>

      {/* Federation Activity */}
      {federation.hasAny && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Federation Activity</p>
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              {federation.inboundPending.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-amber-600">
                    {federation.inboundPending.length} link request{federation.inboundPending.length !== 1 ? 's' : ''} awaiting your approval
                  </p>
                  <ul className="space-y-1">
                    {federation.inboundPending.map(link => (
                      <li key={link.id}>
                        {link.entity ? (
                          <Link
                            href={link.entity.href}
                            className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="font-medium">{link.entity.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{link.linkType.replaceAll('_', ' ')} →</span>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground px-2">Unknown entity</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(federation.outboundPending > 0 || federation.outboundRejected > 0) && (
                <div className="space-y-1 border-t pt-3">
                  {federation.outboundRejected > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-destructive font-medium">{federation.outboundRejected}</span> outbound request{federation.outboundRejected !== 1 ? 's' : ''} rejected by the target org
                    </p>
                  )}
                  {federation.outboundPending > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{federation.outboundPending}</span> outbound request{federation.outboundPending !== 1 ? 's' : ''} pending the target org&apos;s approval
                    </p>
                  )}
                </div>
              )}
              {federation.inboundPending.length === 0 && federation.outboundPending === 0 && federation.outboundRejected === 0 && (
                <p className="text-sm text-muted-foreground">
                  {federation.totalActive} active cross-org link{federation.totalActive !== 1 ? 's' : ''} — no pending actions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
