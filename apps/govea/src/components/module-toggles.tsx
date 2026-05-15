'use client'

import { useState, useTransition } from 'react'
import { MODULE_DEFS, isModuleEnabled, type ModuleGroup, type ModuleKey } from '@/lib/modules'
import { setModuleEnabled, setGroupModulesEnabled } from '@/actions/settings'
import { cn } from '@/lib/utils'

interface ModuleTogglesProps {
  initialModules: Record<string, boolean>
  lockedModules?: Record<string, boolean>
}

const GROUPS: ModuleGroup[] = ['Business Architecture', 'Data Architecture', 'Portfolio', 'Strategy']

function Toggle({
  enabled, disabled, label, onChange,
}: {
  enabled: boolean
  disabled?: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
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
  )
}

export function ModuleToggles({ initialModules, lockedModules = {} }: ModuleTogglesProps) {
  const [modules, setModules] = useState(initialModules)
  const [isPending, startTransition] = useTransition()

  function toggle(key: ModuleKey) {
    const next = !isModuleEnabled(modules, key)
    setModules(prev => ({ ...prev, [key]: next }))
    startTransition(async () => { await setModuleEnabled(key, next) })
  }

  function toggleGroup(group: ModuleGroup) {
    const groupKeys = MODULE_DEFS.filter(m => m.group === group && m.href !== null).map(m => m.key)
    const allEnabled = groupKeys.every(k => lockedModules[k] !== true && isModuleEnabled(modules, k))
    const next = !allEnabled
    setModules(prev => {
      const updated = { ...prev }
      for (const k of groupKeys) updated[k] = next
      return updated
    })
    startTransition(async () => { await setGroupModulesEnabled(group, next) })
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(group => {
        const groupKeys = MODULE_DEFS.filter(m => m.group === group && m.href !== null).map(m => m.key)
        const allEnabled = groupKeys.every(k => lockedModules[k] !== true && isModuleEnabled(modules, k))
        const allLocked = groupKeys.every(k => lockedModules[k] === true)
        const enabledCount = groupKeys.filter(k => lockedModules[k] !== true && isModuleEnabled(modules, k)).length
        return (
          <section key={group} className="space-y-2" aria-labelledby={`module-group-${group.replace(/\s+/g, '-').toLowerCase()}`}>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border/80 bg-muted/60 px-4 py-3 shadow-sm">
              <div className="space-y-0.5">
                <p
                  id={`module-group-${group.replace(/\s+/g, '-').toLowerCase()}`}
                  className="text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  {group}
                </p>
                <p className="text-xs text-muted-foreground">
                  {enabledCount}/{groupKeys.length} enabled
                </p>
              </div>
              <Toggle
                enabled={allEnabled}
                disabled={isPending || allLocked}
                label={`${allEnabled ? 'Disable' : 'Enable'} ${group} modules`}
                onChange={() => toggleGroup(group)}
              />
            </div>
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
                          Unavailable across the entire GovEA instance by an instance admin.
                        </p>
                      )}
                    </div>
                    <Toggle
                      enabled={enabled}
                      disabled={isPending || locked}
                      label={`${enabled ? 'Disable' : 'Enable'} ${mod.label}`}
                      onChange={() => toggle(mod.key)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      {isPending && (
        <p className="text-xs text-muted-foreground">Saving…</p>
      )}
    </div>
  )
}
