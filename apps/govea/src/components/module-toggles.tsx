'use client'

import { useState, useTransition } from 'react'
import { MODULE_DEFS, isModuleEnabled, type ModuleGroup, type ModuleKey } from '@/lib/modules'
import { setModuleEnabled } from '@/actions/settings'
import { cn } from '@/lib/utils'

interface ModuleTogglesProps {
  initialModules: Record<string, boolean>
  lockedModules?: Record<string, boolean>
}

const GROUPS: ModuleGroup[] = ['Business Architecture', 'Portfolio', 'Strategy']

export function ModuleToggles({ initialModules, lockedModules = {} }: ModuleTogglesProps) {
  const [modules, setModules] = useState(initialModules)
  const [isPending, startTransition] = useTransition()

  function toggle(key: ModuleKey) {
    const next = !isModuleEnabled(modules, key)
    // Optimistic update
    setModules(prev => ({ ...prev, [key]: next }))
    startTransition(async () => {
      await setModuleEnabled(key, next)
    })
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(group => (
        <div key={group} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </p>
          <div className="space-y-1.5">
            {MODULE_DEFS.filter(m => m.group === group).map(mod => {
              const locked = lockedModules[mod.key] === true
              const enabled = locked ? false : isModuleEnabled(modules, mod.key)
              return (
                <div
                  key={mod.key}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">{mod.label}</span>
                    {locked && (
                      <p className="text-xs text-muted-foreground">
                        Disabled for the entire GovEA instance by a platform admin.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${mod.label}`}
                    disabled={isPending || locked}
                    onClick={() => toggle(mod.key)}
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
              )
            })}
          </div>
        </div>
      ))}
      {isPending && (
        <p className="text-xs text-muted-foreground">Saving…</p>
      )}
    </div>
  )
}
