import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getStrategyTrace, getGoalTrace, getObjectiveTrace, getCapabilityTrace, getServiceTrace, getValueStreamTrace, getTraceParticipation } from '@/actions/traceability'
import type { StrategyTrace, GoalTrace, ObjectiveTrace, CapabilityTrace, ServiceTrace, ValueStreamTrace, TraceValueStream, TraceApp, TraceParticipation } from '@/actions/traceability'
import { isTraceParticipantKind, PARTICIPANT_ROUTES } from '@/lib/trace-participants'
import { getStrategies } from '@/actions/strategies'
import { getGoals } from '@/actions/goals'
import { getObjectives } from '@/actions/objectives'
import { getCapabilities } from '@/actions/capabilities'
import { getServices } from '@/actions/services'
import { dedupeById } from '@/lib/dedup'
import { PrintExportButton } from '@/components/print-export'
import { PrintCoverSheet } from '@/components/print-cover-sheet'

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

const STRATEGY_STYLES: Record<string, string> = {
  proposed:  'bg-slate-100 text-slate-700 border-slate-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  achieved:  'bg-blue-50 text-blue-700 border-blue-200',
  abandoned: 'bg-zinc-100 text-zinc-600 border-zinc-200',
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

// ── Strategy trace view ───────────────────────────────────────────────────────

function StrategyTraceView({ trace }: { trace: StrategyTrace }) {
  const allObjectives = dedupeById(
    trace.goals.flatMap(g => g.objectives.map(o => ({ id: o.id, name: o.name, timeHorizon: o.timeHorizon })))
  )
  // Capabilities/initiatives are the union of the strategy's *direct* links
  // (course-of-action impacts/delivery) and those reached through goals →
  // objectives. Apps roll up from the full capability set.
  const allCapabilities = dedupeById([
    ...trace.directCapabilities,
    ...trace.goals.flatMap(g => g.objectives.flatMap(o => o.capabilities)),
  ])
  const allApps = dedupeById(allCapabilities.flatMap(c => c.applications))
  const allInitiatives = dedupeById([
    ...trace.directInitiatives,
    ...trace.goals.flatMap(g => g.objectives.flatMap(o => o.initiatives)),
  ])

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Anchor: Strategy */}
      <LayerLabel>Strategy</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.summary && (
            <p className="text-sm text-muted-foreground mt-1">{trace.summary}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            {trace.planningHorizon && <span>Horizon: {trace.planningHorizon}</span>}
            <span>Status: {trace.status}</span>
          </div>
        </div>
      </TraceCard>

      {/* Goals */}
      <Connector label="frames" />
      <LayerLabel>Goals</LayerLabel>
      {trace.goals.length === 0 ? (
        <Gap message="No goals belong to this strategy yet — link goals to give this planning period strategic content." />
      ) : (
        <TraceCard>
          {trace.goals.map(g => (
            <TraceRow
              key={g.id}
              href={`/goals/${g.id}`}
              name={g.name}
              meta={g.planningHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Objectives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Objectives</LayerLabel>
      {allObjectives.length === 0 ? (
        <Gap message="No objectives linked through these goals — no measurable targets are defined yet." />
      ) : (
        <TraceCard>
          {allObjectives.map(o => (
            <TraceRow
              key={o.id}
              href={`/objectives/${o.id}`}
              name={o.name}
              meta={o.timeHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Initiatives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Initiatives</LayerLabel>
      {allInitiatives.length === 0 ? (
        <Gap message="No initiatives are currently advancing this strategy's objectives." />
      ) : (
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
      )}

      {/* Value streams (direct course-of-action impact) */}
      <Connector label="impacts" />
      <LayerLabel>Value Streams</LayerLabel>
      {trace.valueStreams.length === 0 ? (
        <Gap message="No value streams linked — the operating-model value streams this approach affects aren't mapped yet." />
      ) : (
        <TraceCard>
          {trace.valueStreams.map(v => (
            <TraceRow key={v.id} href={`/value-streams/${v.id}`} name={v.name} />
          ))}
        </TraceCard>
      )}

      {/* Capabilities */}
      <Connector label="requires" />
      <LayerLabel>Capabilities</LayerLabel>
      {allCapabilities.length === 0 ? (
        <Gap message="No capabilities linked — the organisational foundation for this strategy is not yet mapped." />
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

      {/* Applications */}
      <Connector label="supported by" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={allApps} />
    </div>
  )
}

// ── Goal trace view ───────────────────────────────────────────────────────────

function GoalTraceView({ trace }: { trace: GoalTrace }) {
  const allCapabilities = dedupeById(
    trace.objectives.flatMap(o => o.capabilities.map(c => ({ ...c, href: `/capabilities/${c.id}` })))
  )
  const allApps = dedupeById(allCapabilities.flatMap(c => c.applications))
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

      {/* Initiatives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Initiatives</LayerLabel>
      {allInitiatives.length === 0 ? (
        <Gap message="No initiatives are currently advancing these objectives." />
      ) : (
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

      {/* Applications */}
      <Connector label="supported by" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={allApps} />
    </div>
  )
}

// ── Objective trace view ──────────────────────────────────────────────────────

function ObjectiveTraceView({ trace }: { trace: ObjectiveTrace }) {
  const allApps = dedupeById(trace.capabilities.flatMap(c => c.applications))

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Upstream: Goals */}
      <LayerLabel>Goals</LayerLabel>
      {trace.goals.length === 0 ? (
        <Gap message="No goals linked — the strategic outcome for this objective is not yet documented." />
      ) : (
        <TraceCard>
          {trace.goals.map(g => (
            <TraceRow
              key={g.id}
              href={`/goals/${g.id}`}
              name={g.name}
              meta={g.planningHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Anchor */}
      <Connector label="sets direction for" />
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

      {/* Initiatives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Initiatives</LayerLabel>
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

      {/* Value Streams (between initiatives and capabilities) */}
      <ValueStreamLayer valueStreams={trace.valueStreams} />

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
    </div>
  )
}

// ── Capability trace view ─────────────────────────────────────────────────────

function CapabilityTraceView({ trace }: { trace: CapabilityTrace }) {
  const strategicInitiativeIds = new Set(trace.strategicInitiatives.map(i => i.id))
  const directInitiatives = trace.initiatives.filter(i => !strategicInitiativeIds.has(i.id))

  return (
    <div className="space-y-1 max-w-2xl">
      {/* Upstream: Strategies (direct course-of-action links, #842) */}
      <LayerLabel>Strategies</LayerLabel>
      {trace.strategies.length === 0 ? (
        <Gap message="No strategy links upstream — no course of action currently drives this capability." />
      ) : (
        <TraceCard>
          {trace.strategies.map(s => (
            <TraceRow
              key={s.id}
              href={`/traceability?from=strategy&id=${s.id}`}
              name={s.name}
              meta={s.planningHorizon ?? undefined}
              badge={s.status}
              badgeClass={STRATEGY_STYLES[s.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}
            />
          ))}
        </TraceCard>
      )}

      {/* Upstream: Goals */}
      <Connector label="pursued through" />
      <LayerLabel>Goals</LayerLabel>
      {trace.goals.length === 0 ? (
        <Gap message="No goals linked upstream — the strategic outcome for this capability is not yet documented." />
      ) : (
        <TraceCard>
          {trace.goals.map(g => (
            <TraceRow
              key={g.id}
              href={`/goals/${g.id}`}
              name={g.name}
              meta={g.planningHorizon ?? undefined}
            />
          ))}
        </TraceCard>
      )}

      {/* Upstream: Strategic Objectives */}
      <Connector label="sets direction for" />
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

      {/* Strategic Initiatives */}
      <Connector label="advanced by" />
      <LayerLabel>Strategic Initiatives</LayerLabel>
      {trace.strategicInitiatives.length === 0 ? (
        <Gap message="No initiatives linked through these objectives — delivery work is not yet tied to the strategic chain." />
      ) : (
        <TraceCard>
          {trace.strategicInitiatives.map(i => (
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

      {/* Value Streams (between initiatives and the capability) */}
      <ValueStreamLayer valueStreams={trace.valueStreams} />

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

      {/* Direct capability initiatives */}
      {directInitiatives.length > 0 && (
        <>
          <Connector label="changed by" />
          <LayerLabel>Capability Initiatives</LayerLabel>
          <TraceCard>
            {directInitiatives.map(i => (
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

      {/* Value Streams (delivery layer above capabilities) */}
      <ValueStreamLayer valueStreams={trace.valueStreams} />

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

// ── Value stream layer (#809 / #848) ───────────────────────────────────────────
//
// The delivery/value layer sits between Strategic Initiatives and Capabilities in
// the traceability metamodel: Initiatives → Value Streams → Capabilities. Always
// rendered as its own layer (with an empty-state gap when nothing is linked) so
// the chain order is consistent and the value-stream layer is never skipped. Each
// row deep-links to the value stream's own trace, where its stages and stage
// capabilities are shown.

function ValueStreamLayer({ valueStreams }: { valueStreams: TraceValueStream[] }) {
  return (
    <>
      <Connector label="delivered through" />
      <LayerLabel>Value Streams</LayerLabel>
      {valueStreams.length === 0 ? (
        <Gap message="No value streams linked — the delivery layer between strategic initiatives and capabilities isn't mapped yet." />
      ) : (
        <TraceCard>
          {valueStreams.map(v => (
            <TraceRow
              key={v.id}
              href={`/traceability?from=value-stream&id=${v.id}`}
              name={v.name}
              meta={v.valueItem ?? undefined}
            />
          ))}
        </TraceCard>
      )}
    </>
  )
}

// ── Value stream trace view (#809) ──────────────────────────────────────────────

function ValueStreamTraceView({ trace }: { trace: ValueStreamTrace }) {
  return (
    <div className="space-y-1 max-w-2xl">
      {/* Upstream context: objectives & services */}
      <LayerLabel>Strategic Objectives</LayerLabel>
      {trace.objectives.length === 0 ? (
        <Gap message="No strategic objectives linked — the mission intent this value stream serves isn't mapped yet." />
      ) : (
        <TraceCard>
          {trace.objectives.map(o => (
            <TraceRow key={o.id} href={`/objectives/${o.id}`} name={o.name} meta={o.timeHorizon ?? undefined} />
          ))}
        </TraceCard>
      )}

      <Connector label="delivered by" />
      <LayerLabel>Services</LayerLabel>
      {trace.services.length === 0 ? (
        <Gap message="No services linked — the stakeholder-facing services this value stream delivers aren't mapped yet." />
      ) : (
        <TraceCard>
          {trace.services.map(s => (
            <TraceRow key={s.id} href={`/services/${s.id}`} name={s.name} />
          ))}
        </TraceCard>
      )}

      {/* Anchor: Value Stream */}
      <Connector label="realised by" />
      <LayerLabel>Value Stream</LayerLabel>
      <TraceCard>
        <div className="px-4 py-4">
          <div className="font-semibold text-base">{trace.name}</div>
          {trace.description && (
            <p className="text-sm text-muted-foreground mt-1">{trace.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            {trace.valueItem && <span>Delivers: {trace.valueItem}</span>}
            <span>Status: {trace.status}</span>
          </div>
        </div>
      </TraceCard>

      {/* Stakeholders */}
      <Connector label="serves" />
      <LayerLabel>Stakeholders</LayerLabel>
      {trace.personas.length === 0 ? (
        <Gap message="No personas linked — the stakeholders this value stream serves aren't identified yet." />
      ) : (
        <TraceCard>
          {trace.personas.map(p => (
            <TraceRow key={p.id} href={`/personas/${p.id}`} name={p.name} meta={p.type ?? undefined} />
          ))}
        </TraceCard>
      )}

      {/* Ordered stages, each with its stage-level capabilities */}
      <Connector label="flows through" />
      <LayerLabel>Stages</LayerLabel>
      {trace.stages.length === 0 ? (
        <Gap message="No stages defined — add ordered stages to map how this value stream delivers value." />
      ) : (
        <div className="space-y-3">
          {trace.stages.map((stage, idx) => (
            <TraceCard key={stage.id}>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{idx + 1}</span>
                  <span className="font-medium text-sm">{stage.name}</span>
                </div>
                {stage.description && (
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                )}
                {stage.capabilities.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No capabilities assigned to this stage yet.</p>
                ) : (
                  <div className="space-y-1">
                    {stage.capabilities.map(c => (
                      <Link
                        key={c.id}
                        href={`/traceability?from=capability&id=${c.id}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.domain && <span className="text-xs text-muted-foreground">{c.domain}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </TraceCard>
          ))}
        </div>
      )}

      {/* Applications reached through stage capabilities */}
      <Connector label="supported by" />
      <LayerLabel>Applications</LayerLabel>
      <AppLayer apps={trace.applications} />
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

  // No params → render a hub view listing published starting points so
  // stakeholders can find a trace without drilling in from another page (#549).
  // The Elected Official, Department Director, and Business Stakeholder
  // personas all need to *find* traceability views; they don't always arrive
  // already on the right entity page.
  if (!from || !id) {
    return <TraceabilityHub organizationId={session.user.organizationId!} role={session.user.role} />
  }

  let trace = null
  let backHref = '/'
  let backLabel = 'Back'

  if (from === 'strategy') {
    trace = await getStrategyTrace(id)
    backHref = `/strategies/${id}`
    backLabel = '← Strategy'
  } else if (from === 'goal') {
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
  } else if (from === 'value-stream') {
    trace = await getValueStreamTrace(id)
    backHref = `/value-streams/${id}`
    backLabel = '← Value Stream'
  } else if (isTraceParticipantKind(from)) {
    // #695 — non-root participants get a participation panel rather than a
    // native trace: their one-hop connections into the root trace views.
    const participation = await getTraceParticipation(from, id)
    if (!participation) notFound()
    return <ParticipantView participation={participation} />
  } else {
    notFound()
  }

  if (!trace) notFound()

  const title =
    trace.kind === 'objective' ? trace.name :
    trace.kind === 'capability' ? trace.name :
    trace.name

  const subtitle =
    trace.kind === 'strategy'  ? 'Strategy → Goals → Objectives → Initiatives → Value Streams → Capabilities → Technology Trace' :
    trace.kind === 'goal'      ? 'Goal → Objectives → Initiatives → Capabilities → Technology Trace' :
    trace.kind === 'objective' ? 'Goal → Objective → Initiatives → Value Streams → Capabilities → Technology Trace' :
    trace.kind === 'capability' ? 'Strategy → Goal → Objective → Initiatives → Value Streams → Capability → Delivery Trace' :
    'Persona → Service → Value Streams → Capabilities → Technology Trace'

  return (
    <div className="space-y-8">
      {/* Print cover sheet (#559). */}
      <PrintCoverSheet orgName="" title={title} />

      <div className="space-y-1">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {backLabel}
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <PrintExportButton />
        </div>
      </div>

      <hr />

      {trace.kind === 'strategy'  && <StrategyTraceView trace={trace} />}
      {trace.kind === 'goal'      && <GoalTraceView trace={trace} />}
      {trace.kind === 'objective' && <ObjectiveTraceView trace={trace} />}
      {trace.kind === 'capability' && <CapabilityTraceView trace={trace} />}
      {trace.kind === 'service' && <ServiceTraceView trace={trace} />}
      {trace.kind === 'value-stream' && <ValueStreamTraceView trace={trace} />}

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Traceability view — relationships reflect published, visible records only.
        <Link href={backHref} className="ml-2 underline underline-offset-2 hover:text-foreground">
          Edit links on the detail page.
        </Link>
      </p>
    </div>
  )
}

// ── Participant view (#695) ───────────────────────────────────────────────────
//
// Rendered for entities that appear in trace chains without being trace
// roots. Shows the record's one-hop connections to the root entities, each
// linking into the existing root trace views — "how does this connect?" in
// one step, without inventing a new diagram for every entity type.

function ParticipantView({ participation }: { participation: TraceParticipation }) {
  const route = PARTICIPANT_ROUTES[participation.kind]
  const { capabilities, objectives, services } = participation.connections
  const total = capabilities.length + objectives.length + services.length

  const sections: { label: string; from: string; rows: { id: string; name: string }[] }[] = [
    { label: 'Capabilities', from: 'capability', rows: capabilities },
    { label: 'Strategic Objectives', from: 'objective', rows: objectives },
    { label: 'Services', from: 'service', rows: services },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link
          href={`${route.hrefBase}/${participation.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {route.label}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{participation.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Traceability participation — chains this {route.label.toLowerCase()} connects to
        </p>
      </div>

      <hr />

      {total === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No published traceability chains connect to this record yet. Link it to a
          capability, objective, or service on its detail page and the chains will
          appear here.
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <p className="text-sm text-muted-foreground">
            This record is not a trace root itself — start a trace from one of its
            connected records below.
          </p>
          {sections.filter(s => s.rows.length > 0).map(section => (
            <section key={section.from}>
              <LayerLabel>{section.label}</LayerLabel>
              <div className="rounded-lg border bg-card divide-y">
                {section.rows.map(row => (
                  <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium">{row.name}</span>
                    <Link
                      href={`/traceability?from=${section.from}&id=${row.id}`}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                    >
                      Trace →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Traceability view — relationships reflect published, visible records only.
        <Link href={`${route.hrefBase}/${participation.id}`} className="ml-2 underline underline-offset-2 hover:text-foreground">
          Edit links on the detail page.
        </Link>
      </p>
    </div>
  )
}

// ── Hub view (#549) ───────────────────────────────────────────────────────────
//
// Landing page when /traceability is hit with no params. Lists published
// Goals, Strategic Objectives, Capabilities (grouped by domain), and Services as
// starting points. Each row has a "Trace →" link that resolves to the
// existing detail view of the trace. Matches the audit's Option A (index
// view) rather than Option B (featured default) — A is more honest to the
// data model and discoverable for stakeholders who may not know which
// objective to start from.

async function TraceabilityHub({ organizationId, role }: { organizationId: string; role: string }) {
  const [strategies, goals, objectives, capabilities, services] = await Promise.all([
    getStrategies(organizationId, role),
    getGoals(organizationId, role),
    getObjectives(),
    getCapabilities(),
    getServices(),
  ])

  // Viewer-only filter: traceability already enforces visibility at the
  // entity-level actions. For the hub, we restrict to published items so
  // stakeholders aren't shown drafts they can't actually trace.
  // Strategy has no 'published' status — a proposed strategy is not a traceable
  // root (ADR-0005), so non-proposed strategies are the hub-eligible ones.
  const traceableStrategies = strategies.filter(s => s.status !== 'proposed')
  const publishedGoals = goals.filter(g => g.status === 'published')
  const publishedObjectives = objectives.filter(o => o.status === 'published')
  const publishedCapabilities = capabilities.filter(c => c.status === 'published')
  const publishedServices = services.filter(s => s.status === 'published')

  // Group capabilities by their business domain for scanability.
  const capsByDomain = new Map<string, typeof publishedCapabilities>()
  for (const cap of publishedCapabilities) {
    const domain = cap.domain ?? 'No domain'
    const list = capsByDomain.get(domain) ?? []
    list.push(cap)
    capsByDomain.set(domain, list)
  }
  const domainsSorted = Array.from(capsByDomain.keys()).sort((a, b) =>
    a === 'No domain' ? 1 : b === 'No domain' ? -1 : a.localeCompare(b)
  )

  const hasAny = traceableStrategies.length + publishedGoals.length + publishedObjectives.length + publishedCapabilities.length + publishedServices.length > 0

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traceability</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Trace from a strategy, goal, strategic objective, capability, or service down to the technology that supports it.
          Pick a starting point below.
        </p>
      </div>

      {!hasAny && (
        <p className="text-sm text-muted-foreground rounded-lg border bg-card p-8 text-center">
          No published content yet. Publish at least one goal, objective, capability, or service to begin tracing.
        </p>
      )}

      {traceableStrategies.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Strategies</h2>
          <div className="rounded-lg border bg-card divide-y divide-border">
            {traceableStrategies.map(s => (
              <Link
                key={s.id}
                href={`/traceability?from=strategy&id=${s.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.planningHorizon && (
                    <p className="text-xs text-muted-foreground">{s.planningHorizon}</p>
                  )}
                </div>
                <span className="text-xs text-primary shrink-0">Trace →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {publishedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Goals</h2>
          <div className="rounded-lg border bg-card divide-y divide-border">
            {publishedGoals.map(g => (
              <Link
                key={g.id}
                href={`/traceability?from=goal&id=${g.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{g.name}</p>
                  {g.planningHorizon && (
                    <p className="text-xs text-muted-foreground">{g.planningHorizon}</p>
                  )}
                </div>
                <span className="text-xs text-primary shrink-0">Trace →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {publishedObjectives.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Strategic Objectives</h2>
          <div className="rounded-lg border bg-card divide-y divide-border">
            {publishedObjectives.map(o => (
              <Link
                key={o.id}
                href={`/traceability?from=objective&id=${o.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{o.name}</p>
                  {o.timeHorizon && (
                    <p className="text-xs text-muted-foreground">{o.timeHorizon}</p>
                  )}
                </div>
                <span className="text-xs text-primary shrink-0">Trace →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {publishedCapabilities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Capabilities</h2>
          {domainsSorted.map(domain => {
            const caps = capsByDomain.get(domain)!
            return (
              <div key={domain} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{domain}</p>
                <div className="rounded-lg border bg-card divide-y divide-border">
                  {caps.map(c => (
                    <Link
                      key={c.id}
                      href={`/traceability?from=capability&id=${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium">{c.name}</p>
                      <span className="text-xs text-primary shrink-0">Trace →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {publishedServices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Services</h2>
          <div className="rounded-lg border bg-card divide-y divide-border">
            {publishedServices.map(s => (
              <Link
                key={s.id}
                href={`/traceability?from=service&id=${s.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <p className="text-sm font-medium">{s.name}</p>
                <span className="text-xs text-primary shrink-0">Trace →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
