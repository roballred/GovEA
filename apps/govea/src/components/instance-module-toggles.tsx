'use client'

import { useState, useTransition } from 'react'
import { MODULE_DEFS, type ModuleGroup, type ModuleKey } from '@/lib/modules'
import { setInstanceModuleAvailability } from '@/actions/instance'
import { cn } from '@/lib/utils'

const GROUPS: ModuleGroup[] = ['Business Architecture', 'Portfolio', 'Strategy', 'Framework']

interface InstanceModuleTogglesProps {
  initialDisabledModules: Record<string, boolean>
}

export function InstanceModuleToggles({ initialDisabledModules }: InstanceModuleTogglesProps) {
  const [disabledModules, setDisabledModules] = useState(initialDisabledModules)
  const [isPending, startTransition] = useTransition()

  function toggleAvailability(key: ModuleKey) {
    const currentlyAvailable = disabledModules[key] !== true
    const nextAvailable = !currentlyAvailable
    setDisabledModules(prev => ({ ...prev, [key]: !nextAvailable }))
    startTransition(async () => {
      await setInstanceModuleAvailability(key, nextAvailable)
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
              const available = disabledModules[mod.key] !== true
              return (
                <div
                  key={mod.key}
                  className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {available
                        ? 'Available to organizations. Each org can still choose whether to use it.'
                        : 'Disabled across the entire instance. It is hidden and forced off for every organization.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={available}
                    aria-label={`${available ? 'Disable' : 'Enable'} ${mod.label} across the instance`}
                    disabled={isPending}
                    onClick={() => toggleAvailability(mod.key)}
                    className={cn(
                      'mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      available ? 'bg-primary' : 'bg-input',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150',
                        available ? 'translate-x-4' : 'translate-x-0',
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
