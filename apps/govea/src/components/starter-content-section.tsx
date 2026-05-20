'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { applyStarterPack, type StarterApplyResult } from '@/actions/starter-content'
import { AVAILABLE_STARTER_PACKS } from '@/lib/starter-content/easyea-starter'

/**
 * Settings card for applying a starter content pack (#587).
 *
 * Shows each available pack with its counts, an "Apply" button, and the
 * result of the most recent apply. Idempotent on the server: re-applying
 * the same pack skips existing items rather than duplicating them.
 */
export function StarterContentSection() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<StarterApplyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePack, setActivePack] = useState<string | null>(null)

  function handleApply(packName: string) {
    if (isPending) return
    setError(null)
    setResult(null)
    setActivePack(packName)
    startTransition(async () => {
      try {
        const r = await applyStarterPack(packName)
        setResult(r)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setActivePack(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {AVAILABLE_STARTER_PACKS.map(pack => (
        <div key={pack.name} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium">{pack.label}</p>
              <p className="text-xs text-muted-foreground">{pack.summary}</p>
              <p className="text-xs text-muted-foreground">
                Includes: {pack.counts.personas} personas · {pack.counts.capabilities} capabilities · {pack.counts.applications} applications · {pack.counts.objectives} objective · {pack.counts.adrs} ADRs
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleApply(pack.name)}
              disabled={isPending}
            >
              {isPending && activePack === pack.name ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </div>
      ))}

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 text-sm space-y-1 text-emerald-800 dark:text-emerald-300">
          <p className="font-medium">Starter pack applied: {result.packName}</p>
          <ul className="text-xs space-y-0.5">
            <li>{result.personasCreated} personas added · {result.personasSkipped} already present</li>
            <li>{result.capabilitiesCreated} capabilities added · {result.capabilitiesSkipped} already present</li>
            <li>{result.applicationsCreated} applications added · {result.applicationsSkipped} already present</li>
            <li>{result.objectivesCreated} objectives added · {result.objectivesSkipped} already present</li>
            <li>{result.adrsCreated} ADRs added · {result.adrsSkipped} already present</li>
          </ul>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Items end with the marker &ldquo;Example starter content — replace or delete.&rdquo; in their description so you can find them later.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
