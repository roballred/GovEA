'use client'

import { useState, useTransition } from 'react'
import { resetToDataset } from '@/actions/dev'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const DATASETS = [
  { key: 'blank',     label: 'Blank',     description: 'Empty content, default types & tags' },
  { key: 'starter',   label: 'Starter',   description: '3 personas · 3 capabilities · 3 apps' },
  { key: 'city-demo', label: 'City Demo', description: '6 personas · 8 capabilities · 5 apps' },
]

export function DevToolbar() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastLoaded, setLastLoaded] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  function requestReset(key: string) {
    setConfirmKey(key)
  }

  function cancelReset() {
    setConfirmKey(null)
  }

  function confirmReset() {
    if (!confirmKey) return
    const key = confirmKey
    setConfirmKey(null)
    startTransition(async () => {
      await resetToDataset(key)
      setLastLoaded(key)
      router.refresh()
    })
  }

  const confirmDataset = DATASETS.find(d => d.key === confirmKey)

  return (
    <>
      {/* Confirm overlay */}
      {confirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Load dataset: {confirmDataset?.label}?</p>
              <p className="text-xs text-muted-foreground">
                This will <strong>delete all content</strong> for your org (personas, capabilities, applications, tags, types) and replace it with the preset.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelReset}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="rounded-md bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium hover:bg-destructive/90 transition-colors"
              >
                Yes, reset data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Dev badge */}
          <span className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            DEV
          </span>

          <span className="text-xs text-yellow-700 font-medium shrink-0">Test data:</span>

          <div className="flex items-center gap-2">
            {DATASETS.map(d => (
              <button
                key={d.key}
                onClick={() => requestReset(d.key)}
                disabled={isPending}
                title={d.description}
                className={cn(
                  'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                  lastLoaded === d.key
                    ? 'border-yellow-500 bg-yellow-200 text-yellow-900'
                    : 'border-yellow-300 bg-white text-yellow-800 hover:bg-yellow-100',
                  isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {isPending && (
            <span className="text-xs text-yellow-600 animate-pulse">Resetting…</span>
          )}

          {lastLoaded && !isPending && (
            <span className="text-xs text-yellow-600">
              Loaded: <strong>{DATASETS.find(d => d.key === lastLoaded)?.label}</strong>
            </span>
          )}
        </div>
      </div>
    </>
  )
}
