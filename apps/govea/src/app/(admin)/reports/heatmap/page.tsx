import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  applications, applicationCapabilities, capabilities,
} from '@/db/schema'
import { and, count, eq } from 'drizzle-orm'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Constants ─────────────────────────────────────────────────────────────────

const LIFECYCLE_COLS = ['active', 'planned', 'sunset', 'decommissioned'] as const
type LifecycleStatus = typeof LIFECYCLE_COLS[number]

const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  active:         'Active',
  planned:        'Planned',
  sunset:         'Sunsetting',
  decommissioned: 'Decommissioned',
}

// Cell bg classes indexed [0..3] for intensity buckets: empty, low, mid, high
const LIFECYCLE_INTENSITY: Record<LifecycleStatus, [string, string, string, string]> = {
  active:         ['', 'bg-emerald-100 dark:bg-emerald-950/40', 'bg-emerald-300 dark:bg-emerald-800/60', 'bg-emerald-500 dark:bg-emerald-700'],
  planned:        ['', 'bg-blue-100 dark:bg-blue-950/40',     'bg-blue-300 dark:bg-blue-800/60',     'bg-blue-500 dark:bg-blue-700'],
  sunset:         ['', 'bg-amber-100 dark:bg-amber-950/40',   'bg-amber-300 dark:bg-amber-800/60',   'bg-amber-500 dark:bg-amber-700'],
  decommissioned: ['', 'bg-red-100 dark:bg-red-950/40',       'bg-red-300 dark:bg-red-800/60',       'bg-red-500 dark:bg-red-700'],
}

const LIFECYCLE_TEXT: Record<LifecycleStatus, [string, string, string, string]> = {
  active:         ['text-muted-foreground', 'text-emerald-800 dark:text-emerald-200', 'text-emerald-900 dark:text-emerald-100', 'text-white'],
  planned:        ['text-muted-foreground', 'text-blue-800 dark:text-blue-200',       'text-blue-900 dark:text-blue-100',       'text-white'],
  sunset:         ['text-muted-foreground', 'text-amber-800 dark:text-amber-200',     'text-amber-900 dark:text-amber-100',     'text-white'],
  decommissioned: ['text-muted-foreground', 'text-red-800 dark:text-red-200',         'text-red-900 dark:text-red-100',         'text-white'],
}

const HOSTING_STYLES: Record<string, string> = {
  saas:    'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'on-prem':'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  hybrid:  'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  other:   'bg-muted text-muted-foreground border-border',
}

const HOSTING_LABELS: Record<string, string> = {
  saas:    'SaaS',
  'on-prem':'On-Premises',
  hybrid:  'Hybrid',
  other:   'Unspecified',
}

const UNASSIGNED = '(Unassigned)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function intensityBucket(n: number, rowMax: number): 0 | 1 | 2 | 3 {
  if (n === 0 || rowMax === 0) return 0
  const ratio = n / rowMax
  if (ratio <= 0.25) return 1
  if (ratio <= 0.6)  return 2
  return 3
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HeatmapPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'viewer') redirect('/dashboard')

  const orgId = session.user.organizationId!
  const enabledModules = await getEnabledModules()

  const hasApps = isModuleEnabled(enabledModules, 'applications')
  const hasCaps = isModuleEnabled(enabledModules, 'capabilities')

  // ── Data fetch ────────────────────────────────────────────────────────────

  const [
    lifecycleDomainRows,
    hostingRows,
    capCoverageRows,
  ] = await Promise.all([
    // Lifecycle × Domain: apps (published) joined through capabilities to get domain
    hasApps && hasCaps
      ? db.select({
          domain:          capabilities.domain,
          lifecycleStatus: applications.lifecycleStatus,
          appCount:        count(applications.id),
        })
          .from(applications)
          .innerJoin(applicationCapabilities, eq(applicationCapabilities.applicationId, applications.id))
          .innerJoin(capabilities, eq(capabilities.id, applicationCapabilities.capabilityId))
          .where(and(
            eq(applications.organizationId, orgId),
            eq(applications.status, 'published'),
          ))
          .groupBy(capabilities.domain, applications.lifecycleStatus)
      : Promise.resolve([]),

    // Hosting model distribution
    hasApps
      ? db.select({ hostingModel: applications.hostingModel, appCount: count() })
          .from(applications)
          .where(and(eq(applications.organizationId, orgId), eq(applications.status, 'published')))
          .groupBy(applications.hostingModel)
      : Promise.resolve([]),

    // Capability coverage: each published capability with its app link count
    hasApps && hasCaps
      ? db.select({
          id:      capabilities.id,
          domain:  capabilities.domain,
          appCount: count(applicationCapabilities.applicationId),
        })
          .from(capabilities)
          .leftJoin(applicationCapabilities, eq(applicationCapabilities.capabilityId, capabilities.id))
          .where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published')))
          .groupBy(capabilities.id, capabilities.domain)
      : Promise.resolve([]),
  ])

  // ── Derive Lifecycle × Domain matrix ──────────────────────────────────────

  // Build: { domain → { lifecycleStatus → count } }
  const lifecycleMatrix: Record<string, Partial<Record<LifecycleStatus, number>>> = {}
  for (const row of lifecycleDomainRows) {
    const domain = row.domain ?? UNASSIGNED
    const status = row.lifecycleStatus as LifecycleStatus
    if (!lifecycleMatrix[domain]) lifecycleMatrix[domain] = {}
    lifecycleMatrix[domain][status] = (lifecycleMatrix[domain][status] ?? 0) + Number(row.appCount)
  }
  const lifecycleDomains = Object.keys(lifecycleMatrix).sort((a, b) =>
    a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b)
  )

  // Also include apps with no capability link (no domain) in Unassigned
  // (They won't appear in the innerJoin above — handle by noting this in the UI)

  // ── Derive Hosting model breakdown ────────────────────────────────────────

  const hostingMap: Record<string, number> = {}
  let totalHosting = 0
  for (const row of hostingRows) {
    const key = row.hostingModel?.toLowerCase() ?? 'other'
    const canonKey = ['saas', 'on-prem', 'hybrid'].includes(key) ? key : 'other'
    hostingMap[canonKey] = (hostingMap[canonKey] ?? 0) + Number(row.appCount)
    totalHosting += Number(row.appCount)
  }

  // ── Derive Capability Coverage by Domain ──────────────────────────────────

  const coverageByDomain: Record<string, { supported: number; unsupported: number }> = {}
  for (const row of capCoverageRows) {
    const domain = row.domain ?? UNASSIGNED
    if (!coverageByDomain[domain]) coverageByDomain[domain] = { supported: 0, unsupported: 0 }
    if (Number(row.appCount) > 0) {
      coverageByDomain[domain].supported++
    } else {
      coverageByDomain[domain].unsupported++
    }
  }
  const coverageDomains = Object.keys(coverageByDomain).sort((a, b) =>
    a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b)
  )

  const totalUnsupported = Object.values(coverageByDomain).reduce((s, d) => s + d.unsupported, 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/reports" className="hover:text-foreground transition-colors">Reports</Link>
            <span>›</span>
            <span>Heatmap Analysis</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Heatmap Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Portfolio pattern view — at-a-glance signals across lifecycle status, hosting model, and capability coverage.
          </p>
        </div>
      </div>

      {/* ── 1. Lifecycle Health ── */}
      {hasApps && hasCaps ? (
        <section>
          <SectionHeading
            title="Application Lifecycle by Domain"
            description="How lifecycle status is distributed across capability domains. Darker cells indicate higher concentration."
          />

          {lifecycleDomains.length === 0 ? (
            <EmptySection message="No published applications with capability links found. Link applications to capabilities to see domain breakdown." />
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">Domain</th>
                    {LIFECYCLE_COLS.map(col => (
                      <th key={col} className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-24">
                        {LIFECYCLE_LABELS[col]}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lifecycleDomains.map((domain, i) => {
                    const row = lifecycleMatrix[domain]
                    const rowTotal = LIFECYCLE_COLS.reduce((s, c) => s + (row[c] ?? 0), 0)
                    const rowMax   = Math.max(...LIFECYCLE_COLS.map(c => row[c] ?? 0))
                    return (
                      <tr key={domain} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                        <td className="px-4 py-2 font-medium text-sm truncate max-w-40" title={domain}>
                          {domain}
                        </td>
                        {LIFECYCLE_COLS.map(col => {
                          const n      = row[col] ?? 0
                          const bucket = intensityBucket(n, rowMax)
                          return (
                            <td key={col} className={cn('px-3 py-2 text-center tabular-nums font-semibold transition-colors', LIFECYCLE_INTENSITY[col][bucket], LIFECYCLE_TEXT[col][bucket])}>
                              {n > 0 ? n : <span className="text-muted-foreground/40 font-normal">—</span>}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground font-medium">
                          {rowTotal}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/20">
                Applications without capability links are excluded. An app spanning multiple domains is counted in each domain.
              </p>
            </div>
          )}

          {/* Attention callout: sunset/decommissioned concentration */}
          {(() => {
            const atRiskDomains = lifecycleDomains.filter(d => {
              const row = lifecycleMatrix[d]
              return (row.sunset ?? 0) + (row.decommissioned ?? 0) > 0
            })
            if (atRiskDomains.length === 0) return null
            return (
              <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Retirement exposure in {atRiskDomains.length} domain{atRiskDomains.length > 1 ? 's' : ''}:{' '}
                  <span className="font-normal">{atRiskDomains.join(', ')}</span>
                </p>
              </div>
            )
          })()}
        </section>
      ) : !hasApps ? (
        <section>
          <SectionHeading title="Application Lifecycle by Domain" description="Requires the Applications module." />
          <EmptySection message="Enable the Applications module in Settings to see lifecycle analysis." />
        </section>
      ) : null}

      {/* ── 2. Hosting Model Distribution ── */}
      {hasApps ? (
        <section>
          <SectionHeading
            title="Hosting Model Distribution"
            description="Cloud adoption progress across the published application portfolio."
          />

          {totalHosting === 0 ? (
            <EmptySection message="No published applications found." />
          ) : (
            <>
              {/* Proportional bar */}
              <div className="flex h-8 rounded-lg overflow-hidden border border-border mb-4">
                {(['saas', 'on-prem', 'hybrid', 'other'] as const).map(key => {
                  const n = hostingMap[key] ?? 0
                  if (n === 0) return null
                  const pct = Math.round((n / totalHosting) * 100)
                  const barStyle: Record<string, string> = {
                    saas:     'bg-blue-400 dark:bg-blue-600',
                    'on-prem':'bg-slate-400 dark:bg-slate-600',
                    hybrid:   'bg-violet-400 dark:bg-violet-600',
                    other:    'bg-muted',
                  }
                  return (
                    <div
                      key={key}
                      className={cn('flex items-center justify-center text-xs font-semibold text-white', barStyle[key])}
                      style={{ width: `${pct}%` }}
                      title={`${HOSTING_LABELS[key]}: ${n} (${pct}%)`}
                    >
                      {pct >= 12 ? `${pct}%` : null}
                    </div>
                  )
                })}
              </div>

              {/* Legend cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['saas', 'on-prem', 'hybrid', 'other'] as const).map(key => {
                  const n   = hostingMap[key] ?? 0
                  const pct = totalHosting > 0 ? Math.round((n / totalHosting) * 100) : 0
                  return (
                    <div key={key} className={cn('rounded-lg border px-4 py-3', HOSTING_STYLES[key])}>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{HOSTING_LABELS[key]}</p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">{n}</p>
                      <p className="text-xs opacity-60 mt-0.5">{pct}% of portfolio</p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ── 3. Capability Coverage ── */}
      {hasApps && hasCaps ? (
        <section>
          <SectionHeading
            title="Capability Coverage by Domain"
            description="Which domains have capabilities not yet supported by any application."
          />

          {coverageDomains.length === 0 ? (
            <EmptySection message="No published capabilities found." />
          ) : (
            <>
              {totalUnsupported > 0 && (
                <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {totalUnsupported} {totalUnsupported === 1 ? 'capability' : 'capabilities'} across{' '}
                    {coverageDomains.filter(d => (coverageByDomain[d]?.unsupported ?? 0) > 0).length} domain{coverageDomains.filter(d => (coverageByDomain[d]?.unsupported ?? 0) > 0).length > 1 ? 's' : ''}{' '}
                    have no application support.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Domain</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground min-w-28">Supported</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground min-w-28">Unsupported</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground min-w-20">Total</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground min-w-24">Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageDomains.map((domain, i) => {
                      const { supported, unsupported } = coverageByDomain[domain]
                      const total    = supported + unsupported
                      const coverage = total > 0 ? Math.round((supported / total) * 100) : 0
                      const hasGap   = unsupported > 0
                      return (
                        <tr key={domain} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                          <td className="px-4 py-2 font-medium truncate max-w-48" title={domain}>{domain}</td>
                          <td className="px-4 py-2 text-center tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                            {supported > 0 ? supported : <span className="text-muted-foreground/40 font-normal">—</span>}
                          </td>
                          <td className={cn('px-4 py-2 text-center tabular-nums font-semibold', hasGap ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground/40')}>
                            {unsupported > 0 ? unsupported : '—'}
                          </td>
                          <td className="px-4 py-2 text-center tabular-nums text-muted-foreground">{total}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', coverage === 100 ? 'bg-emerald-500' : coverage >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                                  style={{ width: `${coverage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">{coverage}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* Footer */}
      <p className="text-xs text-muted-foreground pb-4">
        Reflects published content only. Draft and archived records are excluded.
      </p>
    </div>
  )
}
