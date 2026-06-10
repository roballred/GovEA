'use client'

import { useState, useTransition } from 'react'
import { MODULE_DEFS, type ModuleGroup, type ModuleKey } from '@/lib/modules'
import { setInstanceModuleAvailability, setInstanceGroupAvailability } from '@/actions/instance'
import { cn } from '@/lib/utils'

const GROUPS: ModuleGroup[] = ['Business Architecture', 'Data Architecture', 'Portfolio', 'Strategy']

interface InstanceModuleTogglesProps {
  initialDisabledModules: Record<string, boolean>
}

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
  )
}

export function InstanceModuleToggles({ initialDisabledModules }: InstanceModuleTogglesProps) {
  const [disabledModules, setDisabledModules] = useState(initialDisabledModules)
  const [isPending, startTransition] = useTransition()

  function toggleAvailability(key: ModuleKey) {
    const nextAvailable = disabledModules[key] === true
    setDisabledModules(prev => ({ ...prev, [key]: !nextAvailable }))
    startTransition(async () => { await setInstanceModuleAvailability(key, nextAvailable) })
  }

  function toggleGroupAvailability(group: ModuleGroup) {
    const groupKeys = MODULE_DEFS.filter(m => m.group === group).map(m => m.key)
    const allAvailable = groupKeys.every(k => disabledModules[k] !== true)
    const nextAvailable = !allAvailable
    setDisabledModules(prev => {
      const updated = { ...prev }
      for (const k of groupKeys) updated[k] = !nextAvailable
      return updated
    })
    startTransition(async () => { await setInstanceGroupAvailability(group, nextAvailable) })
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(group => {
        const groupKeys = MODULE_DEFS.filter(m => m.group === group).map(m => m.key)
        const allAvailable = groupKeys.every(k => disabledModules[k] !== true)
        const availableCount = groupKeys.filter(k => disabledModules[k] !== true).length
        return (
          <section key={group} className="space-y-2" aria-labelledby={`instance-module-group-${group.replace(/\s+/g, '-').toLowerCase()}`}>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border/80 bg-muted/60 px-4 py-3 shadow-sm">
              <div className="space-y-0.5">
                <p
                  id={`instance-module-group-${group.replace(/\s+/g, '-').toLowerCase()}`}
                  className="text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  {group}
                </p>
                <p className="text-xs text-muted-foreground">
                  {availableCount}/{groupKeys.length} available
                </p>
              </div>
              <Toggle
                enabled={allAvailable}
                disabled={isPending}
                label={`${allAvailable ? 'Disable' : 'Enable'} ${group} modules across the instance`}
                onChange={() => toggleGroupAvailability(group)}
              />
            </div>
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
                          : 'Unavailable across the entire instance. It is hidden and forced off for every organization.'}
                      </p>
                    </div>
                    <Toggle
                      enabled={available}
                      disabled={isPending}
                      label={`${available ? 'Disable' : 'Enable'} ${mod.label} across the instance`}
                      onChange={() => toggleAvailability(mod.key)}
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
