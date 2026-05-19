'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AdminOption = { id: string; email: string }

interface Props {
  admins: AdminOption[]
  actions: string[]
  current: {
    actor: string
    action: string[]
    since: string
  }
}

const SINCE_OPTIONS: { value: string; label: string }[] = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

export function AuditFilters({ admins, actions, current }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function update(patch: Partial<typeof current>) {
    const next = { ...current, ...patch }
    const sp = new URLSearchParams()
    if (next.actor) sp.set('actor', next.actor)
    if (next.action.length > 0) sp.set('action', next.action.join(','))
    if (next.since && next.since !== 'all') sp.set('since', next.since)
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function toggleAction(code: string) {
    update({
      action: current.action.includes(code)
        ? current.action.filter(a => a !== code)
        : [...current.action, code],
    })
  }

  const hasAny = current.actor || current.action.length > 0 || (current.since && current.since !== 'all')

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasAny && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => update({ actor: '', action: [], since: 'all' })}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="audit-since" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Time window
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SINCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ since: opt.value })}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  current.since === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="audit-actor" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Actor
          </label>
          <select
            id="audit-actor"
            value={current.actor}
            onChange={e => update({ actor: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Any instance admin</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Action {current.action.length > 0 && `(${current.action.length})`}
          </span>
          <details className="rounded-md border bg-background">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              {current.action.length === 0
                ? 'Any action'
                : current.action.length <= 2
                  ? current.action.join(', ')
                  : `${current.action.length} selected`}
            </summary>
            <div className="max-h-60 overflow-y-auto border-t p-2 space-y-1">
              {actions.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No actions logged yet.</p>
              )}
              {actions.map(code => (
                <label
                  key={code}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={current.action.includes(code)}
                    onChange={() => toggleAction(code)}
                  />
                  <code className="font-mono text-xs">{code}</code>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
