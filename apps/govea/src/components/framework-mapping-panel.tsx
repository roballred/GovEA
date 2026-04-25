'use client'

import { useActionState, useTransition } from 'react'
import { TOGAF_DOMAINS } from '@/db/schema'
import type { FrameworkMapping } from '@/db/schema'
import { addFrameworkMapping, removeFrameworkMapping } from '@/actions/framework-mappings'
import { useRouter } from 'next/navigation'

interface Props {
  entityType: string
  entityId: string
  mappings: FrameworkMapping[]
  canMutate: boolean
}

const DOMAIN_COLORS: Record<string, string> = {
  'Business Architecture':     'bg-violet-50 text-violet-700 border-violet-200',
  'Application Architecture':  'bg-blue-50   text-blue-700   border-blue-200',
  'Technology Architecture':   'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Data Architecture':         'bg-amber-50  text-amber-700  border-amber-200',
}

function RemoveButton({ mappingId }: { mappingId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      await removeFrameworkMapping(mappingId)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
      aria-label="Remove mapping"
    >
      {isPending ? '…' : '×'}
    </button>
  )
}

function AddMappingForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const router = useRouter()
  const boundAction = addFrameworkMapping.bind(null, entityType, entityId)

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await boundAction(_prev, formData)
      router.refresh()
      return result
    },
    null,
  )

  return (
    <form action={formAction} className="space-y-2 pt-3 border-t border-border">
      <div className="flex gap-2">
        <select
          name="conceptLabel"
          required
          defaultValue=""
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Select TOGAF domain…</option>
          {TOGAF_DOMAINS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <textarea
        name="rationale"
        placeholder="Rationale (optional)"
        rows={2}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </form>
  )
}

export function FrameworkMappingPanel({ entityType, entityId, mappings, canMutate }: Props) {
  if (mappings.length === 0 && !canMutate) return null

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold select-none list-none">
        <span className="flex items-center gap-2">
          TOGAF Alignment
          {mappings.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {mappings.length}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="px-4 pb-4 space-y-2">
        {mappings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No TOGAF domain mappings yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {mappings.map(m => (
              <li key={m.id} className="flex items-start gap-2">
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium shrink-0 ${DOMAIN_COLORS[m.conceptLabel] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {m.conceptLabel}
                </span>
                {m.rationale && (
                  <span className="text-xs text-muted-foreground flex-1 pt-0.5">{m.rationale}</span>
                )}
                {canMutate && <RemoveButton mappingId={m.id} />}
              </li>
            ))}
          </ul>
        )}

        {canMutate && (
          <AddMappingForm entityType={entityType} entityId={entityId} />
        )}
      </div>
    </details>
  )
}
