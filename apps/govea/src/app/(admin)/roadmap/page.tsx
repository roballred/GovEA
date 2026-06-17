import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInitiatives } from '@/actions/initiatives'
import { getActiveStrategies } from '@/actions/strategies'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { ConfidenceSummary } from '@/components/confidence-summary'
import { PrintExportButton } from '@/components/print-export'
import { PrintCoverSheet } from '@/components/print-cover-sheet'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_ORDER = ['active', 'proposed', 'on-hold', 'complete', 'cancelled'] as const

const STATUS_CONFIG: Record<string, {
  label: string          // executive-facing label
  badge: string          // badge colours
  leftBorder: string     // card left-border colour
  dot: string            // timeline dot colour
  gridBadge: string      // grid view badge (existing palette)
}> = {
  active: {
    label: 'Underway',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    leftBorder: 'border-l-emerald-500',
    dot: 'bg-emerald-500 border-emerald-300',
    gridBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  proposed: {
    label: 'Planned',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    leftBorder: 'border-l-slate-400',
    dot: 'bg-slate-400 border-slate-200',
    gridBadge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  'on-hold': {
    label: 'On Hold',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    leftBorder: 'border-l-amber-500',
    dot: 'bg-amber-400 border-amber-200',
    gridBadge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  complete: {
    label: 'Complete',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    leftBorder: 'border-l-blue-400',
    dot: 'bg-blue-400 border-blue-200',
    gridBadge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-red-100 text-red-700 border-red-200',
    leftBorder: 'border-l-red-300',
    dot: 'bg-red-300 border-red-200',
    gridBadge: 'bg-red-100 text-red-700 border-red-200',
  },
}

const IMPACT_BADGE: Record<string, string> = {
  build: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  improve: 'bg-blue-50 text-blue-700 border-blue-200',
  retire: 'bg-red-50 text-red-700 border-red-200',
  migrate: 'bg-violet-50 text-violet-700 border-violet-200',
  default: 'bg-slate-50 text-slate-600 border-slate-200',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type InitiativeItem = Awaited<ReturnType<typeof getInitiatives>>[number]

function buildImpactSummary(caps: InitiativeItem['initiativeCapabilities']): string | null {
  if (caps.length === 0) return null
  const byImpact: Record<string, string[]> = {}
  for (const { capability, impact } of caps) {
    const key = impact ?? 'affect'
    byImpact[key] = [...(byImpact[key] ?? []), capability.name]
  }
  const parts = Object.entries(byImpact).map(([impact, names]) => {
    const list = names.join(', ')
    if (impact === 'build') return `Builds ${list}`
    if (impact === 'improve') return `Improves ${list}`
    if (impact === 'retire') return `Retires ${list}`
    if (impact === 'migrate') return `Migrates ${list}`
    return `Affects ${list}`
  })
  return parts.join('. ') + '.'
}

function sortedByDateThenStatus(items: InitiativeItem[]): InitiativeItem[] {
  return [...items].sort((a, b) => {
    const statusA = STATUS_ORDER.indexOf(a.status as typeof STATUS_ORDER[number])
    const statusB = STATUS_ORDER.indexOf(b.status as typeof STATUS_ORDER[number])
    if (statusA !== statusB) return statusA - statusB
    // Within same status: items with start dates first, sorted alphabetically
    if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate)
    if (a.startDate) return -1
    if (b.startDate) return 1
    return a.name.localeCompare(b.name)
  })
}

// ── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({ initiative }: { initiative: InitiativeItem }) {
  const cfg = STATUS_CONFIG[initiative.status] ?? STATUS_CONFIG.proposed
  const impactSummary = initiative.description ?? buildImpactSummary(initiative.initiativeCapabilities)

  return (
    <div className="relative pl-8">
      {/* Dot */}
      <span
        className={cn(
          'absolute left-0 top-3.5 -translate-x-px w-3.5 h-3.5 rounded-full border-2',
          cfg.dot,
        )}
      />

      <div className={cn('rounded-lg border border-l-4 bg-card p-4 space-y-3', cfg.leftBorder)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/initiatives/${initiative.id}`}
            className="font-semibold text-sm leading-snug hover:underline"
          >
            {initiative.name}
          </Link>
          <span
            className={cn(
              'shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
              cfg.badge,
            )}
          >
            {cfg.label}
          </span>
        </div>

        {/* Date range */}
        {initiative.startDate || initiative.endDate ? (
          <p className="text-xs text-muted-foreground font-medium">
            {[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No timeline dates set</p>
        )}

        {/* Plain-language impact summary */}
        {impactSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed">{impactSummary}</p>
        )}

        {/* Capabilities with impact labels */}
        {initiative.initiativeCapabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {initiative.initiativeCapabilities.map(({ capability, impact }) => (
              <span
                key={capability.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs',
                  IMPACT_BADGE[impact ?? ''] ?? IMPACT_BADGE.default,
                )}
              >
                {capability.name}
                {impact && <span className="font-semibold opacity-70">{impact}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Linked objectives */}
        {initiative.initiativeObjectives.length > 0 && (
          <div className="space-y-0.5 pt-0.5 border-t">
            {initiative.initiativeObjectives.map(({ objective }) => (
              <p key={objective.id} className="text-xs text-muted-foreground truncate">
                ↗ {objective.name}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Grid card (existing view, preserved) ─────────────────────────────────────

function GridCard({ initiative }: { initiative: InitiativeItem }) {
  const cfg = STATUS_CONFIG[initiative.status] ?? STATUS_CONFIG.proposed

  return (
    <Link
      href={`/initiatives/${initiative.id}`}
      className="group rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm leading-snug group-hover:underline">
          {initiative.name}
        </span>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
            cfg.gridBadge,
          )}
        >
          {cfg.label}
        </span>
      </div>

      {(initiative.startDate || initiative.endDate) && (
        <p className="text-xs text-muted-foreground">
          {[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}
        </p>
      )}

      {initiative.initiativeCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {initiative.initiativeCapabilities.map(({ capability, impact }) => (
            <span
              key={capability.id}
              className={cn(
                'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium',
                IMPACT_BADGE[impact ?? ''] ?? IMPACT_BADGE.default,
              )}
            >
              {capability.name}
              {impact && <span className="font-medium opacity-70">{impact}</span>}
            </span>
          ))}
        </div>
      )}

      {initiative.initiativeObjectives.length > 0 && (
        <div className="space-y-0.5">
          {initiative.initiativeObjectives.map(({ objective }) => (
            <p key={objective.id} className="text-xs text-muted-foreground truncate">
              ↗ {objective.name}
            </p>
          ))}
        </div>
      )}
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface RoadmapPageProps {
  searchParams: Promise<{ view?: string }>
}

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { view } = await searchParams
  const isTimeline = view !== 'grid'

  const orgId = session.user.organizationId!
  const role = session.user.role
  const enabledModules = await getEnabledModules()
  const [allInitiatives, org, activeStrategies] = await Promise.all([
    // Roadmap is a cross-org planning surface, not a per-org list view (#811) —
    // keep its existing federated scope rather than defaulting to org-only.
    getInitiatives('federated'),
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId), columns: { name: true } }),
    isModuleEnabled(enabledModules, 'strategies') ? getActiveStrategies(orgId) : Promise.resolve([]),
  ])
  const hasInitiatives = allInitiatives.length > 0

  // Grid view: group by status in display order
  const grouped = STATUS_ORDER.reduce<Record<string, InitiativeItem[]>>((acc, status) => {
    const group = allInitiatives.filter(i => i.status === status)
    if (group.length > 0) acc[status] = group
    return acc
  }, {})

  // Timeline view: flat sorted list
  const sorted = sortedByDateThenStatus(allInitiatives)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Print-only cover sheet (#559). */}
      <PrintCoverSheet orgName={org?.name ?? 'Your organisation'} title="Roadmap" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isTimeline
              ? 'What is changing, when it is changing, and what business impact is expected.'
              : 'Initiatives grouped by status — showing which capabilities are being built, improved, or retired.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PrintExportButton />
        {/* View toggle */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-1 gap-0.5">
          <Link
            href="/roadmap"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isTimeline
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Timeline
          </Link>
          <Link
            href="/roadmap?view=grid"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              !isTimeline
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Grid
          </Link>
        </div>
        </div>
      </div>

      {/* Repository confidence — shown when org has authenticated visibility on (#380 PR-4) */}
      <ConfidenceSummary orgId={orgId} />

      {/* Active strategies — the course-of-action context this roadmap delivers (ADR-0005 R5) */}
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

      {/* Empty state */}
      {!hasInitiatives && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No initiatives yet.</p>
          <Link href="/initiatives" className="mt-2 inline-block text-sm text-primary hover:underline">
            Create an initiative →
          </Link>
        </div>
      )}

      {/* ── Timeline view ── */}
      {hasInitiatives && isTimeline && (
        <div className="relative">
          {/* Connecting vertical line */}
          <div className="absolute left-[6px] top-5 bottom-5 w-px bg-border" />

          <div className="space-y-4">
            {sorted.map(initiative => (
              <TimelineEntry key={initiative.id} initiative={initiative} />
            ))}
          </div>
        </div>
      )}

      {/* ── Grid view ── */}
      {hasInitiatives && !isTimeline && (
        <div className="space-y-10">
          {Object.entries(grouped).map(([status, items]) => (
            <section key={status}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-semibold">
                  {STATUS_CONFIG[status]?.label ?? status}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                    STATUS_CONFIG[status]?.gridBadge,
                  )}
                >
                  {items.length} {items.length === 1 ? 'initiative' : 'initiatives'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(initiative => (
                  <GridCard key={initiative.id} initiative={initiative} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
