'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  applyStarterPack, removeStarterContent,
  type StarterApplyResult, type StarterRemoveResult,
} from '@/actions/starter-content'
import { AVAILABLE_STARTER_PACKS } from '@/lib/starter-content/togaf-starter'

/**
 * Settings card for applying and removing a starter content pack (#587, #749, #754).
 *
 * Apply lays down a coherent sample repository (and installs the TOGAF
 * taxonomy/glossary/principles recipe first); it is idempotent — re-applying
 * skips items that already exist. Remove deletes exactly the records this org's
 * applies created, tracked by provenance (#754), and never the org's own
 * authored records. Remove is shown only when there is recorded content to
 * remove, and is gated behind an explicit confirm.
 */
export function StarterContentSection({
  removableByPack,
}: {
  /** packName → count of removable records this org's applies created (#754). */
  removableByPack: Record<string, number>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<StarterApplyResult | null>(null)
  const [removed, setRemoved] = useState<StarterRemoveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePack, setActivePack] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  function handleApply(packName: string) {
    if (isPending) return
    setError(null)
    setResult(null)
    setRemoved(null)
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

  function handleRemove(packName: string) {
    if (isPending) return
    setError(null)
    setResult(null)
    setRemoved(null)
    setConfirming(null)
    setActivePack(packName)
    startTransition(async () => {
      try {
        const r = await removeStarterContent(packName)
        setRemoved(r)
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
      {AVAILABLE_STARTER_PACKS.map(pack => {
        const removable = removableByPack[pack.name] ?? 0
        return (
          <div key={pack.name} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">{pack.label}</p>
                <p className="text-xs text-muted-foreground">{pack.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Includes: {pack.counts.personas} personas · {pack.counts.capabilities} capabilities · {pack.counts.applications} applications · {pack.counts.objectives} objectives · {pack.counts.adrs} ADRs · {pack.counts.initiatives} initiatives
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApply(pack.name)}
                  disabled={isPending}
                >
                  {isPending && activePack === pack.name && confirming !== pack.name ? 'Applying…' : 'Apply'}
                </Button>
                {removable > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirming(pack.name)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {confirming === pack.name && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2">
                <p className="text-foreground">
                  Remove <span className="font-medium">{removable}</span> starter record{removable === 1 ? '' : 's'} this pack created in your organization? Records you authored yourself — including your own taxonomy tags — are not touched. This cannot be undone (re-apply the pack to restore the samples).
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(pack.name)}
                    disabled={isPending}
                  >
                    {isPending && activePack === pack.name ? 'Removing…' : 'Remove starter content'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 text-sm space-y-1 text-emerald-800 dark:text-emerald-300">
          <p className="font-medium">Starter pack applied: {result.packName}</p>
          <ul className="text-xs space-y-0.5">
            <li>{result.personasCreated} personas added · {result.personasSkipped} already present</li>
            <li>{result.capabilitiesCreated} capabilities added · {result.capabilitiesSkipped} already present</li>
            <li>{result.applicationsCreated} applications added · {result.applicationsSkipped} already present</li>
            <li>{result.objectivesCreated} objectives added · {result.objectivesSkipped} already present</li>
            <li>{result.adrsCreated} ADRs added · {result.adrsSkipped} already present</li>
            <li>{result.initiativesCreated} initiatives added · {result.initiativesSkipped} already present</li>
          </ul>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            TOGAF taxonomy installed: {result.recipe.taxonomyTypes} types · {result.recipe.taxonomyTerms} terms · {result.recipe.glossaryTerms} glossary terms · {result.recipe.principles} principles
            {result.recipe.taxonomyTypes === 0 && result.recipe.taxonomyTerms === 0 ? ' (already present)' : ''}.
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Items end with the marker &ldquo;Example starter content — replace or delete.&rdquo; in their description so you can find them later, or use Remove above to clear them in one step.
          </p>
        </div>
      )}

      {removed && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm space-y-1 text-amber-800 dark:text-amber-300">
          <p className="font-medium">
            {removed.removed > 0
              ? `Removed ${removed.removed} starter record${removed.removed === 1 ? '' : 's'} from ${removed.packName}.`
              : `No starter records to remove for ${removed.packName}.`}
          </p>
          {removed.removed > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The TOGAF taxonomy, glossary, and principles were left in place — your own records may use them.
            </p>
          )}
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
