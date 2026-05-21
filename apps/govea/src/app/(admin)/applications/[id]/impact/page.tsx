import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getApplicationImpactAnalysis } from '@/actions/impact-analysis'
import { cn } from '@/lib/utils'

const LIFECYCLE_STYLES: Record<string, string> = {
  active:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  planned:        'bg-blue-50 text-blue-700 border-blue-200',
  sunset:         'bg-amber-50 text-amber-700 border-amber-200',
  decommissioned: 'bg-red-50 text-red-700 border-red-200',
}

const INITIATIVE_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  'on-hold':'bg-amber-50 text-amber-700 border-amber-200',
  complete: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled:'bg-red-50 text-red-700 border-red-200',
}

const IMPACT_LABEL_STYLES: Record<string, string> = {
  build:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  improve: 'bg-blue-50 text-blue-700 border-blue-200',
  retire:  'bg-red-50 text-red-700 border-red-200',
  migrate: 'bg-amber-50 text-amber-700 border-amber-200',
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  )
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground italic px-4 py-3 border border-dashed rounded-md">
      {message}
    </p>
  )
}

/**
 * Application Impact Analysis page (#578).
 *
 * Answers the Programme Director persona's canonical question — *"what
 * breaks if I decommission Y?"* — in one screen, by aggregating
 * dependency information that's already in the model.
 *
 * Three sections, in the order a delivery decision is made:
 *
 *   1. If you decommission this   — orphans + initiatives + replacements + coverage-sharers + services
 *   2. What this depends on        — capabilities + ADRs
 *   3. Last changed                — recent audit events that may affect the plan
 */
export default async function ApplicationImpactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const analysis = await getApplicationImpactAnalysis(id)
  if (!analysis) notFound()

  const { application, capabilities, initiatives, replacements, coverageSharers, adrs, services, recentChanges, summary } = analysis
  const lifecycleLabel = application.lifecycleStatus.charAt(0).toUpperCase() + application.lifecycleStatus.slice(1)

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href={`/applications/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {application.name}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Impact Analysis</h1>
          <Pill className={LIFECYCLE_STYLES[application.lifecycleStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'}>
            {lifecycleLabel}
          </Pill>
        </div>
        <p className="text-sm text-muted-foreground">
          What depends on <strong>{application.name}</strong>, and what changes are in flight that affect it.
          Aggregated from your repository — no separate decision-support tool required.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryTile label="Orphan capabilities" value={summary.orphanCount}
          tone={summary.orphanCount > 0 ? 'amber' : 'neutral'}
          sub={summary.orphanCount === 0 ? 'every linked capability has another supporting app' : 'this app is the sole support'} />
        <SummaryTile label="Active initiatives" value={summary.activeInitiativeCount}
          tone="neutral"
          sub={summary.replacementInProgress ? 'replacement in flight' : 'no replacement in flight'} />
        <SummaryTile label="Coverage-sharers" value={summary.coverageSharerCount}
          tone="neutral"
          sub={summary.coverageSharerCount > 0 ? 'apps that could absorb load' : 'no overlap with other apps'} />
        <SummaryTile label="Downstream services" value={summary.serviceCount}
          tone={summary.serviceCount > 0 ? 'amber' : 'neutral'}
          sub={summary.serviceCount === 0 ? 'no services routed through' : 'services depend on this app'} />
        <SummaryTile label="Recent changes (30d)" value={summary.recentChangeCount} tone="neutral"
          sub="audit events on this app or its links" />
      </div>

      <hr />

      {/* Section 1 — If you decommission this... */}
      <section className="space-y-5">
        <SectionHeading
          title="If you decommission this…"
          description="The work that needs to be planned before this app goes away."
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Orphan candidates</p>
          {capabilities.filter(c => c.isOrphanCandidate).length === 0 ? (
            <EmptyRow message="No orphan candidates — every linked capability has at least one other supporting application." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {capabilities.filter(c => c.isOrphanCandidate).map(c => (
                <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/capabilities/${c.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                    {c.domain && <p className="text-xs text-muted-foreground">{c.domain}</p>}
                  </div>
                  <Pill className="bg-amber-50 text-amber-700 border-amber-200">No other supporting app</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Replacement work in flight</p>
          {replacements.length === 0 ? (
            <EmptyRow message="No initiative is currently building or migrating a replacement for the capabilities this app serves." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {replacements.map((r, i) => (
                <li key={r.initiativeId + i} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Link href={`/initiatives/${r.initiativeId}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {r.initiativeName}
                    </Link>
                    <Pill className={INITIATIVE_STYLES[r.initiativeStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'}>
                      {r.initiativeStatus}
                    </Pill>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.replacementAppId && r.replacementAppName ? (
                      <>
                        Replacement:{' '}
                        <Link href={`/applications/${r.replacementAppId}`} className="hover:text-foreground underline underline-offset-2">
                          {r.replacementAppName}
                        </Link>
                      </>
                    ) : 'Replacement app not specified'}
                    {' '}· capability: <span className="text-foreground">{r.capabilityName}</span>
                    {r.initiativeEndDate && <> · target: {r.initiativeEndDate}</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active initiatives touching this app</p>
          {initiatives.length === 0 ? (
            <EmptyRow message="No initiatives currently touch this app." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {initiatives.map(i => (
                <li key={i.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-0.5">
                    <Link href={`/initiatives/${i.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {i.name}
                    </Link>
                    {(i.startDate || i.endDate) && (
                      <p className="text-xs text-muted-foreground">{[i.startDate, i.endDate].filter(Boolean).join(' → ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {i.impact && (
                      <Pill className={IMPACT_LABEL_STYLES[i.impact] ?? 'bg-slate-100 text-slate-700 border-slate-200'}>
                        {i.impact}
                      </Pill>
                    )}
                    <Pill className={INITIATIVE_STYLES[i.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}>
                      {i.status}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Other apps sharing this app&rsquo;s capability coverage</p>
          {coverageSharers.length === 0 ? (
            <EmptyRow message="No other application currently serves any of this app's linked capabilities." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {coverageSharers.map(s => (
                <li key={s.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Link href={`/applications/${s.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {s.name}
                    </Link>
                    <Pill className={LIFECYCLE_STYLES[s.lifecycleStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'}>
                      {s.lifecycleStatus}
                    </Pill>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shares: {s.sharedCapabilities.map(c => c.name).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Public-facing services routing through this app</p>
          {services.length === 0 ? (
            <EmptyRow message="No services are currently delivered via the capabilities this app supports." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {services.map(s => (
                <li key={s.id} className="px-4 py-3 space-y-1">
                  <Link href={`/services/${s.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {s.name}
                  </Link>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    Via capability: {s.viaCapabilities.map(c => c.name).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <hr />

      {/* Section 2 — What this depends on */}
      <section className="space-y-5">
        <SectionHeading
          title="What this depends on"
          description="Capabilities this app delivers and architectural decisions that govern it. App-to-app technology dependencies aren't currently modeled in GovEA."
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Capabilities served</p>
          {capabilities.length === 0 ? (
            <EmptyRow message="This app has no linked capabilities." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {capabilities.map(c => (
                <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/capabilities/${c.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                    {c.domain && <p className="text-xs text-muted-foreground">{c.domain}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.otherSupportingAppCount === 0
                      ? <span className="text-amber-700 font-medium">sole supporting app</span>
                      : `${c.otherSupportingAppCount} other supporting ${c.otherSupportingAppCount === 1 ? 'app' : 'apps'}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Architecture Decision Records</p>
          {adrs.length === 0 ? (
            <EmptyRow message="No ADRs reference this app." />
          ) : (
            <ul className="rounded-md border bg-card divide-y divide-border">
              {adrs.map(a => (
                <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/adrs/${a.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{a.number}</p>
                  </div>
                  <Pill className="bg-slate-100 text-slate-700 border-slate-200">{a.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <hr />

      {/* Section 3 — Last changed */}
      <section className="space-y-3">
        <SectionHeading
          title="Recent changes (last 30 days)"
          description="Audit events on this app or any directly-linked capability, initiative, or ADR. If anything here surprises you, re-check your plan."
        />
        {recentChanges.length === 0 ? (
          <EmptyRow message="No relevant changes in the last 30 days." />
        ) : (
          <ul className="rounded-md border bg-card divide-y divide-border text-sm">
            {recentChanges.map((c, i) => (
              <li key={c.entityId + '-' + i} className="px-4 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <Pill className="bg-slate-100 text-slate-700 border-slate-200">{c.entityType}</Pill>
                  <span className="font-mono text-xs text-muted-foreground">{c.action}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Generated from your repository. Includes only records you can read.
        {' '}<Link href={`/applications/${id}`} className="underline underline-offset-2 hover:text-foreground">Back to application detail</Link>
      </p>
    </div>
  )
}

function SummaryTile({
  label, value, sub, tone,
}: {
  label: string
  value: number
  sub?: string
  tone: 'neutral' | 'amber'
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-1',
      tone === 'amber' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900' : 'bg-card',
    )}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', tone === 'amber' && value > 0 && 'text-amber-700 dark:text-amber-400')}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
