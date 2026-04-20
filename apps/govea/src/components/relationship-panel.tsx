'use client'

import { useOptimistic, useTransition, useState, useId } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface RelationshipItem {
  id: string
  name: string
  href: string
  meta?: string | null
  badge?: React.ReactNode
}

export interface RelationshipOption {
  id: string
  name: string
}

interface RelationshipPanelProps {
  title: string
  items: RelationshipItem[]
  emptyMessage?: string
  /**
   * Shown as an amber gap card when items is empty and canEdit is false.
   * Use for architecturally-significant panels where an empty state has
   * meaning (e.g. "No capabilities linked — delivery scope is unclear.").
   * Falls back to the plain emptyMessage text when not provided.
   */
  gapMessage?: string
  /** Contributor+ only — when false, add/remove controls are hidden */
  canEdit: boolean
  /** Items available to add (caller should already exclude already-linked ones) */
  available?: RelationshipOption[]
  /**
   * Bound server action: (targetId: string) => Promise<void>
   * Pass as `myAction.bind(null, entityId)` from the server component.
   */
  addAction?: (targetId: string) => Promise<void>
  removeAction?: (targetId: string) => Promise<void>
}

export function RelationshipPanel({
  title,
  items: initialItems,
  emptyMessage,
  gapMessage,
  canEdit,
  available = [],
  addAction,
  removeAction,
}: RelationshipPanelProps) {
  const selectId = useId()
  const empty = emptyMessage ?? `No ${title.toLowerCase()} linked.`

  const [items, applyOptimistic] = useOptimistic(
    initialItems,
    (state: RelationshipItem[], action: { type: 'add'; item: RelationshipItem } | { type: 'remove'; id: string }) => {
      if (action.type === 'remove') return state.filter(i => i.id !== action.id)
      if (action.type === 'add') return [...state, action.item]
      return state
    }
  )

  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const linkedIds = new Set(items.map(i => i.id))
  const unlinked = available.filter(o => !linkedIds.has(o.id))

  function handleRemove(id: string, _name: string) {
    if (!removeAction) return
    startTransition(async () => {
      applyOptimistic({ type: 'remove', id })
      await removeAction(id)
    })
  }

  function handleAdd() {
    if (!addAction || !selectedId) return
    const option = available.find(o => o.id === selectedId)
    if (!option) return
    const newItem: RelationshipItem = { id: option.id, name: option.name, href: '#' }
    startTransition(async () => {
      applyOptimistic({ type: 'add', item: newItem })
      setSelectedId('')
      setShowAdd(false)
      await addAction(selectedId)
    })
  }

  const showAddButton = canEdit && addAction && unlinked.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between min-h-[1.75rem]">
        <h2 className="text-lg font-semibold">{title}</h2>
        {showAddButton && (
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {showAdd && unlinked.length > 0 && (
        <div className="flex gap-2 items-center">
          <label htmlFor={selectId} className="sr-only">
            Select {title.toLowerCase()} to link
          </label>
          <select
            id={selectId}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select {title.toLowerCase()}…</option>
            {unlinked.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Link
          </button>
        </div>
      )}

      {items.length === 0 ? (
        !canEdit && gapMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{gapMessage}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )
      ) : (
        <div className={cn('space-y-2', isPending && 'opacity-60')}>
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 group">
              <Link
                href={item.href}
                className="flex-1 flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-sm">{item.name}</span>
                {(item.meta || item.badge) && (
                  <div className="flex items-center gap-2">
                    {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
                    {item.badge}
                  </div>
                )}
              </Link>
              {canEdit && removeAction && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.name)}
                  disabled={isPending}
                  aria-label={`Unlink ${item.name}`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
