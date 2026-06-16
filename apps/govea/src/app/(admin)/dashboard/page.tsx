import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  personas, capabilities, applications, adrs, initiatives,
  strategicObjectives, valueStreams, principles, glossaryTerms,
  auditLog, users, crossOrgLinks,
  organizations,
  DEFAULT_COMPLETENESS_SETTINGS,
} from '@/db/schema'
import { and, count, eq, gt, isNotNull, desc, asc, inArray, or } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CoverageTileLabel } from './coverage-tile-label'
import { DomainBadge } from '@/components/domain-badge'
import { ConfidenceSummary } from '@/components/confidence-summary'
import { CompletenessTrend } from '@/components/completeness-trend'
import { getConfidenceSummary } from '@/lib/confidence'
import { canEdit, isAdmin } from '@/lib/rbac'
import { isEmailConfigured } from '@/actions/email-settings'
import {
  getCategorizedSignals,
  getMostNeededActions,
  getDomainRagBuckets,
  type RagBucket,
} from '@/lib/completeness-signals'
import Link from 'next/link'
import { FirstSignInModal } from '@/components/first-sign-in-modal'
import { ViewerDashboard } from './viewer-dashboard'
import { getActiveStrategies } from '@/actions/strategies'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'

const RAG_TEXT_CLASS: Record<RagBucket, string> = {
  green:   'text-green-700 dark:text-green-400',
  amber:   'text-amber-700 dark:text-amber-400',
  red:     'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
}

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

  // #548 — Viewer-mode dashboard. Auth-redirect routes Viewers to /executive
  // by default; this branch covers the case where they navigate to /dashboard
  // directly. The admin metrics surface is technically and behaviorally wrong
  // for non-authoring stakeholders.
  if (session.user.role === 'viewer') {
    return <ViewerDashboard orgId={orgId} userName={session.user.name ?? null} />
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { completenessSettings: true },
  })
  const stalenessDays = orgRow?.completenessSettings?.stalenessDays ?? DEFAULT_COMPLETENESS_SETTINGS.stalenessDays

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is intentional
  const staleThreshold = new Date(Date.now() - stalenessDays * 24 * 60 * 60 * 1000)

  const [
    personaRows, capabilityRows, applicationRows, adrRows,
    initiativeRows, objectiveRows, valueStreamRows, principleRows, glossaryRows,
    recentActivity,
    capsByDomain,
    // Review health: total + recently modified + recently reviewed for each of 3 entity types
    capTotal, capModified, capReviewed,
    appTotal, appModified, appReviewed,
    personaTotal, personaModified, personaReviewed,
    fedInboundLinks, fedOutboundRows, fedFlaggedRows,
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
    // Federation: links flagged for review (either direction)
    db.select({ count: count() })
      .from(crossOrgLinks)
      .where(and(
        or(eq(crossOrgLinks.sourceOrgId, orgId), eq(crossOrgLinks.targetOrgId, orgId)),
        eq(crossOrgLinks.flaggedForReview, true),
      )),
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

  // PR-3: completeness drill-down counts, top-5 ranked actions, per-domain RAG.
  // Most-Needed Actions is gated to Admin/Contributor per `rm-repository-completeness`.
  // PR-4: confidence summary fetched here so the dashboard can show the
  // suppression banner when the score is currently below threshold.
  const showRanked = canEdit(session.user)
  const isAdminUser = isAdmin(session.user)
  const [signals, mostNeeded, domainRag, confSummary, emailConfigured, lastExport] = await Promise.all([
    getCategorizedSignals(orgId),
    showRanked ? getMostNeededActions(orgId) : Promise.resolve([]),
    getDomainRagBuckets(orgId),
    getConfidenceSummary(orgId, 'authenticated'),
    // Email banner is admin-only — contributors and viewers shouldn't see
    // an org-config nudge they can't act on (#528 capability rule).
    isAdminUser ? isEmailConfigured(orgId) : Promise.resolve(true),
    // Last-backup surface (#529 capability rule). Admin-only; contributors
    // and viewers cannot trigger backups so the surface is noise for them.
    isAdminUser ? db.select({
      lastExportAt: organizations.lastExportAt,
      lastExportBytes: organizations.lastExportBytes,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1).then(rows => rows[0] ?? null) : Promise.resolve(null),
  ])
  const summarySuppressed =
    (confSummary.settings.authenticatedVisibility ?? confSummary.settings.enabled) &&
    confSummary.score < confSummary.settings.suppressBelowPercent
  const ragByDomain = new Map<string, RagBucket>(
    domainRag.map(r => [r.domain || '__uncategorized__', r.bucket]),
  )
  const targetByDomain = new Map<string, number | null>(
    domainRag.map(r => [r.domain || '__uncategorized__', r.target]),
  )
  const publishedPctByDomain = new Map<string, number>(
    domainRag.map(r => [r.domain || '__uncategorized__', r.publishedPct]),
  )

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
  const flaggedCount = Number(fedFlaggedRows[0]?.count ?? 0)

  const federation = {
    inboundPending: fedInboundLinks.map(l => ({
      id: l.id,
      linkType: l.linkType,
      entity: fedEntityMap.get(l.targetEntityId) ?? null,
    })),
    outboundPending:  fedByStatus['pending']  ?? 0,
    outboundRejected: fedByStatus['rejected'] ?? 0,
    totalActive:      fedByStatus['active']   ?? 0,
    flaggedCount,
    hasAny: Object.values(fedByStatus).some(n => n > 0) || fedInboundLinks.length > 0 || flaggedCount > 0,
  }

  const enabledModules = await getEnabledModules()
  const activeStrategies = isModuleEnabled(enabledModules, 'strategies')
    ? await getActiveStrategies(orgId)
    : []

  return (
    <div className="space-y-6">
      {/* First-sign-in modal (#587 follow-up). Self-managed via localStorage;
          renders nothing on subsequent visits. Admin-only. */}
      <FirstSignInModal role={session.user.role} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{session.user.name ? `, ${session.user.name}` : ''}.
        </p>
      </div>

      {/* Active strategies — quick context on the live course-of-action plans (ADR-0005 R5) */}
      {activeStrategies.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Active strategies</p>
          <div className="flex flex-wrap gap-2">
            {activeStrategies.map(s => (
              <Link key={s.id} href={`/strategies/${s.id}`}
                className="inline-flex items-center rounded-md border bg-card px-2.5 py-1 text-sm font-medium hover:text-primary transition-colors">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdminUser && !emailConfigured && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Email is not configured
          </p>
          <p className="text-amber-800 dark:text-amber-300/80 mt-0.5">
            Password reset and notifications are unavailable until you save SMTP settings.{' '}
            <Link href="/settings#email-configuration" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
              Configure email in Settings
            </Link>
            .
          </p>
        </div>
      )}

      {/* Last-backup surface (#529 ac-backup-export capability rule).
          Admin-only; rendered as a compact line, not a full alert, since
          a fresh install has never exported and we don't want that to
          read as an error. Links to /settings/backup. */}
      {isAdminUser && (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-2 text-xs">
          <span className="text-muted-foreground">
            Last backup:{' '}
            {lastExport?.lastExportAt ? (
              <>
                <span className="text-foreground font-medium">
                  {lastExport.lastExportAt.toLocaleString()}
                </span>
                {lastExport.lastExportBytes != null && (
                  <span className="text-muted-foreground">
                    {' '}({lastExport.lastExportBytes < 1024
                      ? `${lastExport.lastExportBytes} B`
                      : lastExport.lastExportBytes < 1024 * 1024
                        ? `${(lastExport.lastExportBytes / 1024).toFixed(1)} KB`
                        : `${(lastExport.lastExportBytes / (1024 * 1024)).toFixed(1)} MB`})
                  </span>
                )}
              </>
            ) : (
              <span className="text-foreground">Never exported</span>
            )}
          </span>
          <Link
            href="/settings/backup"
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            Back up now →
          </Link>
        </div>
      )}

      {summarySuppressed && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Confidence summary is currently suppressed
          </p>
          <p className="text-amber-800 dark:text-amber-300/80 mt-0.5">
            Score is {confSummary.score}% — below the {confSummary.settings.suppressBelowPercent}% publication threshold.
            Stakeholders will not see the summary until the score recovers.
          </p>
        </div>
      )}

      <ConfidenceSummary orgId={orgId} />

      <CompletenessTrend orgId={orgId} />

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
                        <p className="text-xs text-amber-700 mt-0.5">{draftCount} draft</p>
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
                  <p className="text-xs font-medium text-amber-700">
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
              {federation.flaggedCount > 0 && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs text-amber-700 font-medium">
                    {federation.flaggedCount} link{federation.flaggedCount !== 1 ? 's' : ''} flagged for review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A connected org restricted content visibility — open the affected capability or persona to withdraw or revoke the link.
                  </p>
                </div>
              )}
              {federation.inboundPending.length === 0 && federation.outboundPending === 0 && federation.outboundRejected === 0 && federation.flaggedCount === 0 && (
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
          Review Health <span className="font-normal normal-case">({stalenessDays}-day window)</span>
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
                        <span className={modifiedPct !== null && modifiedPct < 50 ? 'text-amber-700 font-medium' : 'font-medium'}>
                          {modifiedPct !== null ? `${modifiedPct}%` : '—'}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Reviewed:{' '}
                        <span className={reviewedPct !== null && reviewedPct < 50 ? 'text-amber-700 font-medium' : 'font-medium'}>
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

      {/* Capabilities by Domain — RAG-colored vs domainTargets */}
      {capsByDomain.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Capabilities by Domain</p>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3">
                {capsByDomain.map(row => {
                  const key = row.domain ?? '__uncategorized__'
                  const bucket = ragByDomain.get(key) ?? 'neutral'
                  const target = targetByDomain.get(key) ?? null
                  const publishedPct = publishedPctByDomain.get(key) ?? 0
                  return (
                    <Link
                      key={row.domain ?? '__none__'}
                      href={`/capabilities${row.domain ? `?domain=${encodeURIComponent(row.domain)}` : ''}`}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 hover:bg-muted/50 transition-colors"
                      title={target != null ? `${publishedPct}% published vs ${target}% target` : undefined}
                    >
                      {row.domain
                        ? <DomainBadge domain={row.domain} />
                        : <span className="text-xs text-muted-foreground">Uncategorized</span>
                      }
                      <span className={`text-sm font-semibold ${RAG_TEXT_CLASS[bucket]}`}>{Number(row.count)}</span>
                      {target != null && (
                        <span className={`text-xs ${RAG_TEXT_CLASS[bucket]}`}>
                          {publishedPct}/{target}%
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Needs Attention — categorized drill-down */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {(signals.stale + signals.unpublished + signals.incompleteRelationships + signals.openDebt) === 0 ? (
              <p className="text-sm text-muted-foreground">Repository is current — nothing to flag.</p>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-center justify-between text-sm">
                  <span>
                    Stale <span className="text-xs text-muted-foreground">(past staleness window)</span>
                  </span>
                  <span className={`font-medium ${signals.stale > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {signals.stale}
                  </span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span>Unpublished <span className="text-xs text-muted-foreground">(drafts)</span></span>
                  <span className={`font-medium ${signals.unpublished > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {signals.unpublished}
                  </span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span>
                    Incomplete relationships <span className="text-xs text-muted-foreground">(capability ↔ application / persona)</span>
                  </span>
                  <span className={`font-medium ${signals.incompleteRelationships > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {signals.incompleteRelationships}
                  </span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <Link href="/debt" className="hover:underline">
                    Open debt <span className="text-xs text-muted-foreground">(draft / published / in-progress)</span>
                  </Link>
                  <span className={`font-medium ${signals.openDebt > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {signals.openDebt}
                  </span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Most-Needed Actions — top 5 ranked items, Admin/Contributor only */}
        {showRanked && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Most-Needed Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {mostNeeded.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing pressing — everything is current.</p>
              ) : (
                <ol className="space-y-2">
                  {mostNeeded.map(action => (
                    <li key={action.key} className="text-sm">
                      <Link href={action.href} className="font-medium hover:underline">{action.name}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        )}

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
