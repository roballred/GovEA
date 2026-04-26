'use client'

import { useState, useTransition } from 'react'
import { MODULE_DEFS, isModuleEnabled, type ModuleKey } from '@/lib/modules'
import { setModuleEnabled } from '@/actions/settings'
import { cn } from '@/lib/utils'

interface FrameworkTogglesProps {
  initialModules: Record<string, boolean>
}

const FRAMEWORK_MODULES = MODULE_DEFS.filter(m => m.group === 'Framework')

export function FrameworkToggles({ initialModules }: FrameworkTogglesProps) {
  const [modules, setModules] = useState(initialModules)
  const [isPending, startTransition] = useTransition()

  function toggle(key: ModuleKey) {
    const next = !isModuleEnabled(modules, key)
    setModules(prev => ({ ...prev, [key]: next }))
    startTransition(async () => {
      await setModuleEnabled(key, next)
    })
  }

  return (
    <div className="space-y-1.5">
      {FRAMEWORK_MODULES.map(mod => {
        const enabled = isModuleEnabled(modules, mod.key)
        return (
          <div
            key={mod.key}
            className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{mod.label}</p>
              {mod.key === 'framework-overlay' && (
                <p className="text-xs text-muted-foreground">
                  Adds TOGAF Architecture Domain mapping to capabilities and unlocks the Application Landscape report.
                  Only visible to editors and admins. Disable to hide all framework UI without deleting mapping data.
                </p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${mod.label}`}
              disabled={isPending}
              onClick={() => toggle(mod.key)}
              className={cn(
                'mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
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
      {isPending && (
        <p className="text-xs text-muted-foreground">Saving…</p>
      )}
    </div>
  )
}
