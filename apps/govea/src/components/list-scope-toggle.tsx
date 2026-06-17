'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ListScope } from '@/lib/federation'

/**
 * Scope switcher for org-scoped list views (#811).
 *
 * "My organization" (the default) shows only records owned by the active org;
 * "All shared" broadens the list to connected-org and instance-wide records.
 * The choice is carried in the `?scope=` query param so the server component
 * re-fetches at the requested scope — no client-side filtering of hidden rows.
 */
export function ListScopeToggle({ scope }: { scope: ListScope }) {
  const router = useRouter()
  const pathname = usePathname()

  function setScope(next: ListScope) {
    router.replace(next === 'org' ? pathname : `${pathname}?scope=federated`, { scroll: false })
  }

  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-xs" role="group" aria-label="List scope">
      <button
        type="button"
        onClick={() => setScope('org')}
        aria-pressed={scope === 'org'}
        className={cn(
          'rounded px-2.5 py-1 font-medium transition-colors',
          scope === 'org' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        My organization
      </button>
      <button
        type="button"
        onClick={() => setScope('federated')}
        aria-pressed={scope === 'federated'}
        className={cn(
          'rounded px-2.5 py-1 font-medium transition-colors',
          scope === 'federated' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        All shared
      </button>
    </div>
  )
}
