'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/**
 * URL-backed audit-log filter controls (#531).
 *
 * Three filters:
 *   - Actor (single-select dropdown of users with audit entries in scope)
 *   - Action namespace (multi-select chips over distinct namespaces)
 *   - Time window (24h / 7d / 30d / 90d / all)
 *
 * State lives in the URL (`?actor=`, `?action=`, `?since=`) so a filtered
 * view is shareable + bookmarkable, and reloading the page keeps the
 * current cut. URL is the source of truth; this component is a thin
 * driver around `router.replace`.
 *
 * Designed to be drop-in shareable between the org-scoped /audit and the
 * instance-scoped /instance/audit (per #523 — same pattern, different
 * scope) — the parent passes in the actor + action options and the
 * component just renders + writes the URL.
 */
export function AuditLogFilters({
  actors,
  actionNamespaces,
}: {
  actors: { id: string; name: string | null; email: string | null }[]
  actionNamespaces: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const currentActor = sp.get('actor') ?? ''
  const currentActionsRaw = sp.get('action') ?? ''
  const currentActions = currentActionsRaw ? currentActionsRaw.split(',').filter(Boolean) : []
  const currentSince = sp.get('since') ?? '30d'

  function navigate(updates: { actor?: string | null; action?: string[]; since?: string }) {
    const next = new URLSearchParams(sp.toString())
    if (updates.actor !== undefined) {
      if (!updates.actor) next.delete('actor')
      else next.set('actor', updates.actor)
    }
    if (updates.action !== undefined) {
      if (updates.action.length === 0) next.delete('action')
      else next.set('action', updates.action.join(','))
    }
    if (updates.since !== undefined) {
      if (updates.since === '30d') next.delete('since') // default = no param
      else next.set('since', updates.since)
    }
    router.replace(`${pathname}${next.size > 0 ? `?${next.toString()}` : ''}`)
  }

  function toggleAction(ns: string) {
    const set = new Set(currentActions)
    if (set.has(ns)) set.delete(ns)
    else set.add(ns)
    navigate({ action: Array.from(set) })
  }

  const anyFilter = currentActor || currentActions.length > 0 || (currentSince && currentSince !== '30d')

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {anyFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.replace(pathname)}
            className="text-xs h-7"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="audit-actor">Actor</Label>
          <select
            id="audit-actor"
            value={currentActor}
            onChange={(e) => navigate({ actor: e.target.value || null })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All actors</option>
            {actors.map(a => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.email ?? a.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-since">Time window</Label>
          <select
            id="audit-since"
            value={currentSince}
            onChange={(e) => navigate({ since: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days (default)</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Action types</Label>
        <div className="flex flex-wrap gap-1.5">
          {actionNamespaces.length === 0 && (
            <p className="text-xs text-muted-foreground">No actions recorded yet.</p>
          )}
          {actionNamespaces.map(ns => {
            const active = currentActions.includes(ns)
            return (
              <button
                type="button"
                key={ns}
                onClick={() => toggleAction(ns)}
                className={
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono transition-colors ' +
                  (active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted')
                }
              >
                {ns}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
