import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getGoalTrace, getObjectiveTrace, getCapabilityTrace, getServiceTrace } from '@/actions/traceability'
import type { GoalTrace, ObjectiveTrace, CapabilityTrace, ServiceTrace, TraceApp } from '@/actions/traceability'
import { dedupeById } from '@/lib/dedup'

// ── Status colours ────────────────────────────────────────────────────────────

const LIFECYCLE_STYLES: Record<string, string> = {
  active:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  planned:       'bg-blue-50 text-blue-700 border-blue-200',
  sunset:        'bg-amber-50 text-amber-700 border-amber-200',
  decommissioned:'bg-red-50 text-red-700 border-red-200',
}

const INITIATIVE_STYLES: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  'on-hold':'bg-amber-50 text-amber-700 border-amber-200',
  complete: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled:'bg-red-50 text-red-700 border-red-200',
}

const ADR_STYLES: Record<string, string> = {
  accepted:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  proposed:   'bg-slate-100 text-slate-700 border-slate-200',
  deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  superseded: 'bg-red-50 text-red-700 border-red-200',
}

const CHANNEL_LABELS: Record<string, string> = {
  online: 'Online', 'in-person': 'In-person', phone: 'Phone', mobile: 'Mobile',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LayerLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </p>
  )
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-muted-foreground select-none">
      <div className="w-px h-4 bg-border" />
      <span className="text-xs font-medium px-2 py-0.5 rounded border border-border bg-muted/40 my-1">
        {label}
      </span>
      <div className="w-px h-2 bg-border" />
      <span className="text-muted-foreground/60">▾</span>
    </div>
  )
}

function Gap({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
      <span className="shrink-0 mt-0.5">⚠</span>
      <span>{message}</span>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  )
}

function TraceCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card divide-y', className)}>
      {children}
    </div>
  )
}

function TraceRow({
  href, name, meta, badge, badgeClass,
}: {
  href: string
  name: string
  meta?: string | null
  badge?: string | null
  badgeClass?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
    >
      <span className="font-medium text-sm group-hover:text-primary transition-colors">{name}</span>
      <div className="flex items-center gap-2 shrink-0">
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        {badge && <Badge className={badgeClass}>{badge}</Badge>}
      </div>
    </Link>
  )
}

// ── Application list (deduplicated — see src/lib/dedup.ts for product rule) ───

function AppLayer({ apps }: { apps: TraceApp[] }) {
  const deduped = dedupeById(apps)
  if (deduped.length === 0) {
    return <Gap message="No applications linked — the technology platform for this area is not yet mapped." />
  }
  return (
    <TraceCard>
      {deduped.map(a => (
        <TraceRow
          key={a.id}
          href={`/applications/${a.id}`}
          name={a.name}
          meta={a.vendor ?? undefined}
          badge={a.lifecycleStatus ?? undefined}
          badgeClass={LIFECYCLE_STYLES[a.lifecycleStatus ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
        />
      ))}
    </TraceCard>
  )
}

// ── Goal trace view ───────────────────────────────────────────────────────────

function GoalTraceView({ trace }: { trace: GoalTrace }) {
  const allCapabilities = dedupeById(
    trace.objectives.flatMap(o => o.capabilities.map(c => ({ ...c, href: `/capabilities/${c.id}` })))
  )
  const allInitiatives = dedupeById(
    trace.objectives.flatMap(o => o.initiatives.map(i => ({ ...i, href: `/initiatives/${i.id}` })))
  )

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Anchor: Goal */}
      <LayerLabel>Goal</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.description && (
            <p className="text-sm text-muted-foreground mt-1">{trace.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            {trace.planningHorizon && <span>Horizon: {trace.planningHorizon}</span>}
            {trace.owner && <span>Owner: {trace.owner}</span>}
          </div>
        </div>
      </TraceCard>

      {/* Objectives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Objectives</LayerLabel>
      {trace.objectives.length === 0 ? (
        <Gap message="No objectives linked — this goal has no measurable targets defined yet." />
      ) : (
        <TraceCard>
          {trace.objectives.map(o => (
            <TraceRow
              key={o.id}
              href={`/objectives/${o.id}`}
              name={o.name}
              meta={o.timeHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Capabilities */}
      <Connector label="requires" />
      <LayerLabel>Capabilities</LayerLabel>
      {allCapabilities.length === 0 ? (
        <Gap message="No capabilities linked — the organisational foundation for this goal is not yet mapped." />
      ) : (
        <TraceCard>
          {allCapabilities.map(c => (
            <TraceRow
              key={c.id}
              href={`/capabilities/${c.id}`}
              name={c.name}
              meta={c.domain}
            />
          ))}
        </TraceCard>
      )}

      {/* Initiatives */}
      {allInitiatives.length > 0 && (
        <>
          <Connector label="advanced by" />
          <LayerLabel>Active Initiatives</LayerLabel>
          <TraceCard>
            {allInitiatives.map(i => (
              <TraceRow
                key={i.id}
                href={`/initiatives/${i.id}`}
                name={i.name}
                badge={i.status}
                badgeClass={INITIATIVE_STYLES[i.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
              />
            ))}
          </TraceCard>
        </>
      )}
    </div>
  )
}

// ── Objective trace view ──────────────────────────────────────────────────────

function ObjectiveTraceView({ trace }: { trace: ObjectiveTrace }) {
  const allApps = dedupeById(trace.capabilities.flatMap(c => c.applications))

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Anchor */}
      <LayerLabel>Strategic Objective</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.description && (
            <p className="text-sm text-muted-foreground mt-1">{trace.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            {trace.successMetric && <span>Success: {trace.successMetric}</span>}
            {trace.timeHorizon && <span>Horizon: {trace.timeHorizon}</span>}
          </div>
        </div>
      </TraceCard>

      {/* Capabilities */}
      <Connector label="requires" />
      <LayerLabel>Capabilities</LayerLabel>
      {trace.capabilities.length === 0 ? (
        <Gap message="No capabilities linked — this objective has no technology foundation mapped yet. Link capabilities to show how the org delivers against this goal." />
      ) : (
        <TraceCard>
          {trace.capabilities.map(c => (
            <TraceRow
              key={c.id}
              href={`/capabilities/${c.id}`}
              name={c.name}
              meta={c.domain}
            />
          ))}
        </TraceCard>
      )}

      {/* Applications */}
      <Connector label="supported by" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={allApps} />

      {/* Initiatives */}
      <Connector label="advanced by" />
      <LayerLabel>Active Initiatives</LayerLabel>
      {trace.initiatives.length === 0 ? (
        <Gap message="No initiatives are currently advancing this objective. Consider creating an initiative to track delivery work against this goal." />
      ) : (
        <TraceCard>
          {trace.initiatives.map(i => (
            <TraceRow
              key={i.id}
              href={`/initiatives/${i.id}`}
              name={i.name}
              badge={i.status}
              badgeClass={INITIATIVE_STYLES[i.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
            />
          ))}
        </TraceCard>
      )}
    </div>
  )
}

// ── Capability trace view ─────────────────────────────────────────────────────

function CapabilityTraceView({ trace }: { trace: CapabilityTrace }) {
  return (
    <div className="space-y-1 max-w-2xl">
      {/* Upstream: Strategic Objectives */}
      <LayerLabel>Strategic Objectives</LayerLabel>
      {trace.objectives.length === 0 ? (
        <Gap message="Not linked to any strategic objective — the mission justification for this capability is not yet documented." />
      ) : (
        <TraceCard>
          {trace.objectives.map(o => (
            <TraceRow
              key={o.id}
              href={`/objectives/${o.id}`}
              name={o.name}
              meta={o.timeHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Anchor: Capability */}
      <Connector label="requires" />
      <LayerLabel>Capability</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.domain && <p className="text-xs text-muted-foreground mt-0.5">{trace.domain}</p>}
          {trace.description && (
            <p className="text-sm text-muted-foreground mt-1">{trace.description}</p>
          )}
        </div>
      </TraceCard>

      {/* Downstream: Applications */}
      <Connector label="supported by" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={trace.applications} />

      {/* Initiatives */}
      {trace.initiatives.length > 0 && (
        <>
          <Connector label="changed by" />
          <LayerLabel>Initiatives</LayerLabel>
          <TraceCard>
            {trace.initiatives.map(i => (
              <TraceRow
                key={i.id}
                href={`/initiatives/${i.id}`}
                name={i.name}
                badge={i.status}
                badgeClass={INITIATIVE_STYLES[i.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
              />
            ))}
          </TraceCard>
        </>
      )}

      {/* Personas */}
      {trace.personas.length > 0 && (
        <>
          <Connector label="used by" />
          <LayerLabel>Personas</LayerLabel>
          <TraceCard>
            {trace.personas.map(p => (
              <TraceRow
                key={p.id}
                href={`/personas/${p.id}`}
                name={p.name}
                meta={p.type ?? undefined}
              />
            ))}
          </TraceCard>
        </>
      )}

      {/* ADRs */}
      {trace.adrs.length > 0 && (
        <>
          <Connector label="governed by" />
          <LayerLabel>Architecture Decisions</LayerLabel>
          <TraceCard>
            {trace.adrs.map(a => (
              <TraceRow
                key={a.id}
                href={`/adrs/${a.id}`}
                name={`${a.number} — ${a.title}`}
                badge={a.status}
                badgeClass={ADR_STYLES[a.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
              />
            ))}
          </TraceCard>
        </>
      )}

      {/* Principles */}
      {trace.principles.length > 0 && (
        <>
          <Connector label="guided by" />
          <LayerLabel>Principles</LayerLabel>
          <TraceCard>
            {trace.principles.map(p => (
              <TraceRow
                key={p.id}
                href={`/principles/${p.id}`}
                name={p.name}
              />
            ))}
          </TraceCard>
        </>
      )}
    </div>
  )
}

// ── Service trace view ────────────────────────────────────────────────────────

function ServiceTraceView({ trace }: { trace: ServiceTrace }) {
  const allApps = dedupeById(trace.capabilities.flatMap(c => c.applications))

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Personas */}
      <LayerLabel>Served Personas</LayerLabel>
      {trace.personas.length === 0 ? (
        <Gap message="No personas linked — who this service is for has not been documented." />
      ) : (
        <TraceCard>
          {trace.personas.map(p => (
            <TraceRow
              key={p.id}
              href={`/personas/${p.id}`}
              name={p.name}
              meta={p.type ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Anchor: Service */}
      <Connector label="receives" />
      <LayerLabel>Service</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.channels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {trace.channels.map(ch => (
                <span key={ch} className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  {CHANNEL_LABELS[ch] ?? ch}
                </span>
              ))}
            </div>
          )}
          {trace.description && (
            <p className="text-sm text-muted-foreground mt-2">{trace.description}</p>
          )}
        </div>
      </TraceCard>

      {/* Capabilities */}
      <Connector label="requires" />
      <LayerLabel>Capabilities</LayerLabel>
      {trace.capabilities.length === 0 ? (
        <Gap message="No capabilities linked — the organisational abilities that make this service possible are not yet mapped." />
      ) : (
        <TraceCard>
          {trace.capabilities.map(c => (
            <TraceRow
              key={c.id}
              href={`/capabilities/${c.id}`}
              name={c.name}
              meta={c.domain}
            />
          ))}
        </TraceCard>
      )}

      {/* Applications */}
      <Connector label="runs on" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={allApps} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; id?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { from, id } = await searchParams
  if (!from || !id) notFound()

  let trace = null
  let backHref = '/'
  let backLabel = 'Back'

  if (from === 'goal') {
    trace = await getGoalTrace(id)
    backHref = `/goals/${id}`
    backLabel = '← Goal'
  } else if (from === 'objective') {
    trace = await getObjectiveTrace(id)
    backHref = `/objectives/${id}`
    backLabel = '← Strategic Objective'
  } else if (from === 'capability') {
    trace = await getCapabilityTrace(id)
    backHref = `/capabilities/${id}`
    backLabel = '← Capability'
  } else if (from === 'service') {
    trace = await getServiceTrace(id)
    backHref = `/services/${id}`
    backLabel = '← Service'
  } else {
    notFound()
  }

  if (!trace) notFound()

  const title =
    trace.kind === 'objective' ? trace.name :
    trace.kind === 'capability' ? trace.name :
    trace.name

  const subtitle =
    trace.kind === 'goal'      ? 'Goal → Objectives → Capabilities → Technology Trace' :
    trace.kind === 'objective' ? 'Mission → Technology Trace' :
    trace.kind === 'capability' ? 'Objective → Capability → Delivery Trace' :
    'Persona → Service → Technology Trace'

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {backLabel}
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      <hr />

      {trace.kind === 'goal'      && <GoalTraceView trace={trace} />}
      {trace.kind === 'objective' && <ObjectiveTraceView trace={trace} />}
      {trace.kind === 'capability' && <CapabilityTraceView trace={trace} />}
      {trace.kind === 'service' && <ServiceTraceView trace={trace} />}

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Traceability view — relationships reflect published, visible records only.
        <Link href={backHref} className="ml-2 underline underline-offset-2 hover:text-foreground">
          Edit links on the detail page.
        </Link>
      </p>
    </div>
  )
}
