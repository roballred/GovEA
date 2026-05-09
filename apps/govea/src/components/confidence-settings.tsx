'use client'

import { useState, useTransition } from 'react'
import { updateConfidenceSettings } from '@/actions/settings'
import { cn } from '@/lib/utils'
import type { ConfidenceSettings } from '@/db/schema'

interface ConfidenceSettingsFormProps {
  initial: ConfidenceSettings
}

export function ConfidenceSettingsForm({ initial }: ConfidenceSettingsFormProps) {
  // Default the visibility split from the legacy `enabled` flag for orgs
  // that pre-date the split. New rows always store both fields explicitly.
  const [authenticatedVisibility, setAuthVis] = useState(
    initial.authenticatedVisibility ?? initial.enabled,
  )
  const [publicVisibility, setPubVis] = useState(initial.publicVisibility ?? false)
  const [narrative, setNarrative] = useState(initial.narrative ?? '')
  const [suppressBelowPercent, setSuppressBelowPercent] = useState(initial.suppressBelowPercent)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()

  // Defensive UX: public visibility should not be on while authenticated is off.
  // Disabling authenticated visibility also clears public visibility client-side;
  // the server enforces the same invariant on save.
  const effectivePub = authenticatedVisibility ? publicVisibility : false

  function save() {
    setStatus('saving')
    startTransition(async () => {
      await updateConfidenceSettings({
        enabled: authenticatedVisibility,
        authenticatedVisibility,
        publicVisibility: effectivePub,
        narrative: narrative || null,
        suppressBelowPercent,
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  const isBusy = isPending || status === 'saving'

  return (
    <div className="space-y-5">
      {/* Authenticated visibility toggle */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Show to authenticated viewers</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Display the confidence summary on stakeholder-facing pages for signed-in users (Admins, Contributors, Viewers).
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={authenticatedVisibility}
          aria-label={authenticatedVisibility ? 'Disable for authenticated viewers' : 'Enable for authenticated viewers'}
          disabled={isBusy}
          onClick={() => setAuthVis(v => !v)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            authenticatedVisibility ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150',
              authenticatedVisibility ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Public visibility toggle — gated on authenticated being on */}
      <div className={cn(
        'flex items-center justify-between rounded-lg border bg-card px-4 py-3',
        !authenticatedVisibility && 'opacity-60',
      )}>
        <div>
          <p className="text-sm font-medium">Also show to unauthenticated viewers</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Make the confidence summary visible to the public without signing in. This is an explicit second step
            — turn this on only after confirming the summary is appropriate for an external audience.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={effectivePub}
          aria-label={effectivePub ? 'Disable for public viewers' : 'Enable for public viewers'}
          disabled={isBusy || !authenticatedVisibility}
          onClick={() => setPubVis(v => !v)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            effectivePub ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150',
              effectivePub ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {authenticatedVisibility && (
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
