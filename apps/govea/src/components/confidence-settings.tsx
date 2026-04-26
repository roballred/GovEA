'use client'

import { useState, useTransition } from 'react'
import { updateConfidenceSettings } from '@/actions/settings'
import { cn } from '@/lib/utils'
import type { ConfidenceSettings } from '@/db/schema'

interface ConfidenceSettingsFormProps {
  initial: ConfidenceSettings
}

export function ConfidenceSettingsForm({ initial }: ConfidenceSettingsFormProps) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [narrative, setNarrative] = useState(initial.narrative ?? '')
  const [suppressBelowPercent, setSuppressBelowPercent] = useState(initial.suppressBelowPercent)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()

  function save() {
    setStatus('saving')
    startTransition(async () => {
      await updateConfidenceSettings({ enabled, narrative: narrative || null, suppressBelowPercent })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  const isBusy = isPending || status === 'saving'

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Show confidence summary</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Display a plain-language status label on stakeholder-facing pages.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Disable confidence summary' : 'Enable confidence summary'}
          disabled={isBusy}
          onClick={() => setEnabled(v => !v)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            enabled ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150',
              enabled ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Narrative */}
          <div className="space-y-1.5">
            <label htmlFor="confidence-narrative" className="text-sm font-medium">
              Admin narrative <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="confidence-narrative"
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              disabled={isBusy}
              placeholder="Briefly describe the current state of the repository in plain language…"
              rows={3}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'resize-none',
              )}
            />
            <p className="text-xs text-muted-foreground">
              This message is shown to stakeholders alongside the status label. Keep it brief and jargon-free.
            </p>
          </div>

          {/* Suppress threshold */}
          <div className="space-y-1.5">
            <label htmlFor="confidence-threshold" className="text-sm font-medium">
              Suppress when published content falls below
            </label>
            <div className="flex items-center gap-3">
              <input
                id="confidence-threshold"
                type="number"
                min={0}
                max={100}
                value={suppressBelowPercent}
                onChange={e => setSuppressBelowPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                disabled={isBusy}
                className={cn(
                  'w-20 rounded-md border bg-background px-3 py-2 text-sm text-right',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The confidence summary is hidden automatically when the percentage of published content drops below this value.
            </p>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isBusy}
          className={cn(
            'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && (
          <p className="text-xs text-muted-foreground">Saved.</p>
        )}
      </div>
    </div>
  )
}
