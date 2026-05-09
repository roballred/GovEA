'use client'

import { useState, useTransition } from 'react'
import { updateCompletenessSettings } from '@/actions/settings'
import { cn } from '@/lib/utils'
import type { CompletenessSettings } from '@/db/schema'

interface CompletenessSettingsFormProps {
  initial: CompletenessSettings
}

const STALENESS_OPTIONS = [
  { days: 90,  label: '3 months'  },
  { days: 180, label: '6 months'  },
  { days: 365, label: '12 months' },
  { days: 730, label: '24 months' },
]

export function CompletenessSettingsForm({ initial }: CompletenessSettingsFormProps) {
  const [stalenessDays, setStalenessDays] = useState(initial.stalenessDays)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()

  function save() {
    setStatus('saving')
    startTransition(async () => {
      await updateCompletenessSettings({ stalenessDays })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    })
  }

  const isBusy = isPending || status === 'saving'

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="staleness-days" className="text-sm font-medium">
          Staleness window
        </label>
        <select
          id="staleness-days"
          value={stalenessDays}
          onChange={e => setStalenessDays(Number(e.target.value))}
          disabled={isBusy}
          className={cn(
            'w-48 rounded-md border bg-background px-3 py-2 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {STALENESS_OPTIONS.map(opt => (
            <option key={opt.days} value={opt.days}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Items not updated or reviewed within this window are flagged as stale on the dashboard&apos;s Review Health section.
        </p>
      </div>

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
