import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  capabilities, applications, applicationCapabilities,
  initiatives, strategicObjectives, organizations,
} from '@/db/schema'
import { and, count, desc, eq, inArray, isNull, lt } from 'drizzle-orm'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { getActiveStrategies } from '@/actions/strategies'
import { ConfidenceSummary } from '@/components/confidence-summary'
import { PrintExportButton } from '@/components/print-export'
import { PrintCoverSheet } from '@/components/print-cover-sheet'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Constants ─────────────────────────────────────────────────────────────────

const STALE_MONTHS = 12
const APP_LIFECYCLE_ORDER = ['active', 'planned', 'sunset', 'decommissioned'] as const

const LIFECYCLE_LABELS: Record<string, string> = {
  active: 'Active',
  planned: 'Planned',
  sunset: 'Sunsetting',
  decommissioned: 'Decommissioned',
}

const LIFECYCLE_STYLES: Record<string, string> = {
  active:         'bg-emerald-500',
  planned:        'bg-blue-400',
  sunset:         'bg-amber-400',
  decommissioned: 'bg-slate-300 dark:bg-slate-600',
}

const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  active:   'Active',
  'on-hold':'On Hold',
  complete: 'Complete',
  cancelled:'Cancelled',
}

const INITIATIVE_STATUS_STYLES: Record<string, string> = {
  proposed: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800',
  active:   'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800',
  'on-hold':'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800',
  complete: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
  cancelled:'text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-800 dark:border-slate-700',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  href,
  warn,
}: {
  label: string
  value: string | number
  sub?: string
  href?: string
  warn?: boolean
}) {
  const inner = (
    <div className={cn(
      'rounded-xl border p-5 space-y-1',
      warn ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'bg-card',
      href && 'hover:bg-muted/50 transition-colors cursor-pointer'
    )}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-3xl font-bold tabular-nums', warn && 'text-amber-700 dark:text-amber-400')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{children}</p>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ExecutiveDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'
  const enabledModules = await getEnabledModules()

  const hasApps        = isModuleEnabled(enabledModules, 'applications')
  const hasCapabilities= isModuleEnabled(enabledModules, 'capabilities')
  const hasInitiatives = isModuleEnabled(enabledModules, 'initiatives')
  const hasObjectives  = isModuleEnabled(enabledModules, 'objectives')
  const hasStrategies  = isModuleEnabled(enabledModules, 'strategies')

  // Active strategies (course-of-action; multiple may be active). Read-only
  // leadership surface (ADR-0005 R5).
  const activeStrategies = hasStrategies ? await getActiveStrategies(orgId) : []

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is intentional
  const staleThreshold = new Date(Date.now() - STALE_MONTHS * 30 * 24 * 60 * 60 * 1000)

  // ── Parallel data fetch ───────────────────────────────────────────────────

  const [
    org,
    // Applications: lifecycle breakdown (published only)
    appLifecycleRows,
    appStaleRow,
    // Capabilities: total published + gap count (no application link)
    capTotalRow,
    capGapRow,
    // Initiatives: status breakdown
    initiativeStatusRows,
    // Strategic objectives: count
    objectivesPublishedRow,
    // Recent updates: last 5 published records per type, merged in JS
    recentApps,
    recentCaps,
    recentInitiatives,
    recentObjectives,
  ] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),

    // App lifecycle counts for published apps
    hasApps
      ? db.select({ lifecycleStatus: applications.lifecycleStatus, count: count() })
          .from(applications)
          .where(and(eq(applications.organizationId, orgId), eq(applications.status, 'published')))
          .groupBy(applications.lifecycleStatus)
      : Promise.resolve([]),

    // Apps not updated in >12 months
    hasApps
      ? db.select({ count: count() })
          .from(applications)
          .where(and(
            eq(applications.organizationId, orgId),
            eq(applications.status, 'published'),
            lt(applications.updatedAt, staleThreshold),
          ))
      : Promise.resolve([{ count: 0 }]),

    // Total published capabilities
    hasCapabilities
      ? db.select({ count: count() })
          .from(capabilities)
          .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published')))
      : Promise.resolve([{ count: 0 }]),

    // Capabilities with no application link (gap)
    hasCapabilities && hasApps
      ? db.select({ count: count() })
          .from(capabilities)
          .leftJoin(applicationCapabilities, eq(applicationCapabilities.capabilityId, capabilities.id))
          .where(and(
            eq(capabilities.organizationId, orgId),
            eq(capabilities.status, 'published'),
            isNull(applicationCapabilities.capabilityId),
          ))
      : Promise.resolve([{ count: 0 }]),

    // Initiative status counts (viewers: active + complete only, per #202)
    hasInitiatives
      ? db.select({ status: initiatives.status, count: count() })
          .from(initiatives)
          .where(and(
            eq(initiatives.organizationId, orgId),
            ...(isViewer ? [inArray(initiatives.status, ['active', 'complete'])] : []),
          ))
          .groupBy(initiatives.status)
      : Promise.resolve([]),

    // Published objectives
    hasObjectives
      ? db.select({ count: count() })
          .from(strategicObjectives)
          .where(and(
            eq(strategicObjectives.organizationId, orgId),
            eq(strategicObjectives.status, 'published'),
          ))
      : Promise.resolve([{ count: 0 }]),

    // Recent published apps
    hasApps
      ? db.select({ id: applications.id, name: applications.name, updatedAt: applications.updatedAt })
          .from(applications)
          .where(and(eq(applications.organizationId, orgId), eq(applications.status, 'published')))
          .orderBy(desc(applications.updatedAt))
          .limit(5)
      : Promise.resolve([]),

    // Recent published capabilities
    hasCapabilities
      ? db.select({ id: capabilities.id, name: capabilities.name, updatedAt: capabilities.updatedAt })
          .from(capabilities)
          .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published')))
          .orderBy(desc(capabilities.updatedAt))
          .limit(5)
      : Promise.resolve([]),

    // Recent initiatives (viewers: active + complete only, per #202)
    hasInitiatives
      ? db.select({ id: initiatives.id, name: initiatives.name, updatedAt: initiatives.updatedAt })
          .from(initiatives)
          .where(and(
            eq(initiatives.organizationId, orgId),
            ...(isViewer ? [inArray(initiatives.status, ['active', 'complete'])] : []),
          ))
          .orderBy(desc(initiatives.updatedAt))
          .limit(5)
      : Promise.resolve([]),

    // Recent objectives
    hasObjectives
      ? db.select({ id: strategicObjectives.id, name: strategicObjectives.name, updatedAt: strategicObjectives.updatedAt })
          .from(strategicObjectives)
          .where(and(
            eq(strategicObjectives.organizationId, orgId),
            eq(strategicObjectives.status, 'published'),
          ))
          .orderBy(desc(strategicObjectives.updatedAt))
          .limit(5)
      : Promise.resolve([]),
  ])

  // ── Derived values ────────────────────────────────────────────────────────

  // Application portfolio
  const appByLifecycle = new Map<string, number>()
  let totalPublishedApps = 0
  for (const row of appLifecycleRows) {
    const n = Number(row.count)
    appByLifecycle.set(row.lifecycleStatus, n)
    totalPublishedApps += n
  }
  const activeApps     = appByLifecycle.get('active')     ?? 0
  const staleAppCount  = Number(appStaleRow[0]?.count ?? 0)
  const currentApps    = totalPublishedApps - staleAppCount

  // Capabilities
  const totalCaps = Number(capTotalRow[0]?.count ?? 0)
  const gapCaps   = Number(capGapRow[0]?.count  ?? 0)

  // Initiatives
  const initiativeByStatus = new Map<string, number>()
  let totalInitiatives = 0
  for (const row of initiativeStatusRows) {
    const n = Number(row.count)
    initiativeByStatus.set(row.status, n)
    totalInitiatives += n
  }
  const activeInitiatives = initiativeByStatus.get('active') ?? 0

  // Objectives
  const objectivesCount = Number(objectivesPublishedRow[0]?.count ?? 0)

  // Freshness stat: only show if apps are enabled and there are apps
  const freshnessLabel = totalPublishedApps > 0
    ? `${currentApps} of ${totalPublishedApps} updated in past ${STALE_MONTHS} months`
    : null

  // Recent changes: merge and sort, top 5
  const recentChanges = [
    ...recentApps.map(r => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, type: 'Application', href: `/applications/${r.id}` })),
    ...recentCaps.map(r => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, type: 'Capability',  href: `/capabilities/${r.id}` })),
    ...recentInitiatives.map(r => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, type: 'Initiative', href: `/initiatives/${r.id}` })),
    ...recentObjectives.map(r => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, type: 'Objective',   href: `/objectives/${r.id}` })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)

  // App lifecycle bar segments (ordered, non-zero only)
  const lifecycleSegments = APP_LIFECYCLE_ORDER
    .map(k => ({ key: k, label: LIFECYCLE_LABELS[k] ?? k, count: appByLifecycle.get(k) ?? 0 }))
    .filter(s => s.count > 0)

  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Print-only cover sheet (#559) — first page of the handout. */}
      <PrintCoverSheet orgName={org?.name ?? 'Your organisation'} title="Executive Summary" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Summary</h1>
          <p className="text-muted-foreground mt-1">
            {org?.name ?? 'Your organisation'} · {generatedDate}
          </p>
        </div>
        <PrintExportButton />
      </div>

      {/* Repository confidence — shown when org has authenticated visibility on (#380 PR-4) */}
      <ConfidenceSummary orgId={orgId} />

      {/* ── Hero stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {hasApps && (
          <StatCard
            label="Active applications"
            value={activeApps}
            sub={totalPublishedApps > 0 ? `${totalPublishedApps} total` : undefined}
            href="/applications"
          />
        )}
        {hasInitiatives && (
          <StatCard
            label="Active projects"
            value={activeInitiatives}
            sub={totalInitiatives > 0 ? `${totalInitiatives} total` : undefined}
            href="/initiatives"
          />
        )}
        {hasObjectives && (
          <StatCard
            label="Strategic objectives"
            value={objectivesCount}
            href="/objectives"
          />
        )}
        {hasCapabilities && hasApps && (
          <StatCard
            label="Coverage gaps"
            value={gapCaps}
            sub={gapCaps > 0 ? 'capabilities need technology coverage' : 'all capabilities covered'}
            href="/capabilities"
            warn={gapCaps > 0}
          />
        )}
        {hasCapabilities && !hasApps && (
          <StatCard
            label="Capabilities"
            value={totalCaps}
            href="/capabilities"
          />
        )}
        {hasApps && freshnessLabel && (
          <StatCard
            label="Portfolio currency"
            value={`${totalPublishedApps > 0 ? Math.round((currentApps / totalPublishedApps) * 100) : 0}%`}
            sub={freshnessLabel}
            warn={totalPublishedApps > 0 && staleAppCount > 0}
          />
        )}
      </div>

      {/* ── Active strategy ─────────────────────────────────────────────────── */}
      {hasStrategies && activeStrategies.length > 0 && (
        <div>
          <SectionLabel>Active Strategy</SectionLabel>
          <div className="space-y-3">
            {activeStrategies.map(s => {
              const goals = s.strategyGoals
                .map(sg => sg.goal)
                .filter(g => g.status === 'published')
              const rollup = [
                `pursues ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}`,
                `impacts ${s.strategyCapabilities.length} ${s.strategyCapabilities.length === 1 ? 'capability' : 'capabilities'}`,
                `${s.strategyValueStreams.length} ${s.strategyValueStreams.length === 1 ? 'value stream' : 'value streams'}`,
                `delivered by ${s.strategyInitiatives.length} ${s.strategyInitiatives.length === 1 ? 'initiative' : 'initiatives'}`,
              ].join(' · ')
              return (
                <div key={s.id} className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <Link href={`/strategies/${s.id}`} className="font-semibold hover:text-primary transition-colors">
                      {s.name}
                    </Link>
                    <Link href={`/traceability?from=strategy&id=${s.id}`} className="text-xs text-primary hover:underline underline-offset-4 shrink-0">
                      View traceability →
                    </Link>
                  </div>
                  {s.summary && <p className="text-sm text-muted-foreground">{s.summary}</p>}
                  {goals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {goals.map(g => (
                        <Link key={g.id} href={`/goals/${g.id}`}
                          className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted transition-colors">
                          {g.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2 capitalize">{rollup}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Application portfolio ───────────────────────────────────────────── */}
      {hasApps && totalPublishedApps > 0 && (
        <div>
          <SectionLabel>Application Portfolio</SectionLabel>
          <div className="rounded-xl border bg-card p-5 space-y-4">

            {/* Proportional bar */}
            <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
              {lifecycleSegments.map(seg => (
                <div
                  key={seg.key}
                  className={cn('h-full', LIFECYCLE_STYLES[seg.key] ?? 'bg-slate-400')}
                  style={{ width: `${(seg.count / totalPublishedApps) * 100}%` }}
                  title={`${seg.label}: ${seg.count}`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {lifecycleSegments.map(seg => (
                <div key={seg.key} className="flex items-center gap-2 text-sm">
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', LIFECYCLE_STYLES[seg.key] ?? 'bg-slate-400')} />
                  <span className="text-muted-foreground">{seg.label}</span>
                  <span className="font-semibold tabular-nums">{seg.count}</span>
                </div>
              ))}
            </div>

            {/* Freshness */}
            {staleAppCount > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 border-t pt-3">
                {staleAppCount} application{staleAppCount !== 1 ? 's' : ''} not updated in over {STALE_MONTHS} months —
                {' '}<Link href="/applications" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">review portfolio →</Link>
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              <Link href="/applications" className="underline underline-offset-2 hover:text-foreground">
                View full application inventory →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Transformation progress ─────────────────────────────────────────── */}
      {hasInitiatives && totalInitiatives > 0 && (
        <div>
          <SectionLabel>Transformation Progress</SectionLabel>
          <div className="rounded-xl border bg-card divide-y">
            {Object.entries(INITIATIVE_STATUS_LABELS).map(([key, label]) => {
              const c = initiativeByStatus.get(key) ?? 0
              if (c === 0) return null
              return (
                <div key={key} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
                      INITIATIVE_STATUS_STYLES[key] ?? INITIATIVE_STATUS_STYLES.proposed
                    )}>
                      {label}
                    </span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{c}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/roadmap" className="underline underline-offset-2 hover:text-foreground">
              View roadmap →
            </Link>
          </p>
        </div>
      )}

      {/* ── Capability coverage gap ─────────────────────────────────────────── */}
      {hasCapabilities && hasApps && gapCaps > 0 && (
        <div>
          <SectionLabel>Architecture Gaps</SectionLabel>
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 px-5 py-4 space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {gapCaps} {gapCaps === 1 ? 'capability' : 'capabilities'} without supporting technology
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              These business capabilities have no application recorded as delivering them.
              The gap may reflect missing documentation or a genuine technology need.{' '}
              <Link href="/capabilities" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
                Review capabilities →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Recent updates ──────────────────────────────────────────────────── */}
      {recentChanges.length > 0 && (
        <div>
          <SectionLabel>Recent Updates</SectionLabel>
          <div className="rounded-xl border bg-card divide-y">
            {recentChanges.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-5 py-3">
                <span className="inline-flex shrink-0 items-center rounded border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground w-24 justify-center">
                  {item.type}
                </span>
                <Link
                  href={item.href}
                  className="flex-1 text-sm font-medium hover:text-primary transition-colors truncate"
                >
                  {item.name}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalPublishedApps === 0 && totalCaps === 0 && totalInitiatives === 0 && (
        <div className="rounded-xl border bg-card px-6 py-12 text-center space-y-2">
          <p className="text-sm font-medium">No published content yet</p>
          <p className="text-xs text-muted-foreground">
            This summary reflects published content only.
            Add and publish capabilities, applications, and initiatives to see your portfolio health here.
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            <Link href="/dashboard" className="underline underline-offset-2 hover:text-foreground">
              Go to practitioner dashboard →
            </Link>
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-4">
        Reflects published content only. Draft and archived records are excluded.
      </p>
    </div>
  )
}
