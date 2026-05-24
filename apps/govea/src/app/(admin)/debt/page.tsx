import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDebtItems } from '@/actions/architecture-debt'
import { canEdit } from '@/lib/rbac'
import type { DebtSeverity, DebtStatus, DebtType } from '@/db/schema'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SearchParams {
  status?: string
  severity?: string
  type?: string
}

const SEVERITY_BADGE: Record<DebtSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800',
  high:     'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  medium:   'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200',
  low:      'bg-muted text-muted-foreground border-border',
}

const STATUS_LABEL: Record<DebtStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  accepted: 'Accepted',
  archived: 'Archived',
}

// Plain-language labels per #133 — see debt-form.tsx for the long form.
// Slugs stay as the DB enum; only user-visible labels change.
const TYPE_LABEL: Record<DebtType, string> = {
  'lifecycle-risk': 'Lifecycle risk',
  'capability-gap': 'Unsupported capability',
  'decision-drift': 'Drift from decision',
  'known-shortcut': 'Deliberate trade-off',
  unreviewed: 'Stale / unreviewed',
}

export default async function DebtIndexPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const items = await getDebtItems({
    status: params.status as DebtStatus | undefined,
    severity: params.severity as DebtSeverity | undefined,
    type: params.type as DebtType | undefined,
  })
  const showWriteActions = canEdit(session.user)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Architecture debt</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tracked architectural constraints — applications past supported lifecycle, capability gaps, decision drift,
            and deliberate shortcuts. Naming debt is the first step to managing it.
          </p>
        </div>
        {showWriteActions && (
          <Link
            href="/debt/new"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New debt item
          </Link>
        )}
      </div>

      {/* Filters */}
      <FilterBar params={params} />

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No debt items match these filters.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
              <Link href={`/debt/${item.id}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                        SEVERITY_BADGE[item.severity],
                      )}>
                        {item.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">{TYPE_LABEL[item.debtType]}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</span>
                      {item.source === 'system-detected' && (
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                          auto-detected
                        </span>
                      )}
                      {item.securitySensitive && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">🔒 security-sensitive</span>
                      )}
                    </div>
                    <p className="font-medium mt-1 truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  {item.targetResolutionDate && (
                    <p className="text-xs text-muted-foreground shrink-0">
                      Target: {item.targetResolutionDate}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterBar({ params }: { params: SearchParams }) {
  const filters: { name: 'severity' | 'status' | 'type'; values: string[]; current: string | undefined }[] = [
    { name: 'severity', values: ['critical', 'high', 'medium', 'low'], current: params.severity },
    { name: 'status', values: ['draft', 'published', 'in-progress', 'resolved', 'accepted', 'archived'], current: params.status },
    { name: 'type', values: ['lifecycle-risk', 'capability-gap', 'decision-drift', 'known-shortcut', 'unreviewed'], current: params.type },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {filters.map(f => (
        <div key={f.name} className="flex items-center gap-1.5">
          <span className="text-muted-foreground capitalize">{f.name}:</span>
          <div className="flex flex-wrap gap-1">
            <FilterPill name={f.name} value={undefined} current={f.current} label="All" />
            {f.values.map(v => (
              <FilterPill key={v} name={f.name} value={v} current={f.current} label={v} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterPill({ name, value, current, label }: { name: string; value: string | undefined; current: string | undefined; label: string }) {
  const isActive = (current ?? '') === (value ?? '')
  const params = new URLSearchParams()
  if (value) params.set(name, value)
  return (
    <Link
      href={`/debt${params.toString() ? `?${params.toString()}` : ''}`}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card hover:bg-muted/50 text-muted-foreground',
      )}
    >
      {label}
    </Link>
  )
}
