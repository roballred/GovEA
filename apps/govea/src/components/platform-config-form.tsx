'use client'

import { useTransition, useState } from 'react'
import { updatePlatformConfig } from '@/actions/instance'
import { themes } from '@/lib/themes'
import { SUPPORT_TIERS } from '@/lib/support-tiers'
import { cn } from '@/lib/utils'
import type { PlatformConfig } from '@/db/schema'

const TIER_LABELS: Record<string, string> = {
  community: 'Community',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

type Props = {
  initial: PlatformConfig | null
}

export function PlatformConfigForm({ initial }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [instanceName, setInstanceName] = useState(initial?.instanceName ?? 'GovEA')
  const [defaultTheme, setDefaultTheme] = useState(initial?.defaultTheme ?? 'govea')
  const [allowLocalAuth, setAllowLocalAuth] = useState(initial?.allowLocalAuth ?? true)
  const [defaultSupportTier, setDefaultSupportTier] = useState<string>(
    initial?.defaultSupportTier ?? '',
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updatePlatformConfig({
          instanceName,
          defaultTheme,
          allowLocalAuth,
          defaultSupportTier: defaultSupportTier || null,
        })
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-8 max-w-2xl', pending && 'opacity-60 pointer-events-none')}>

      {/* Platform Identity */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Platform Identity</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Name shown in the platform admin header across all instance admin views.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="instance-name" className="text-sm font-medium">
            Instance name
          </label>
          <input
            id="instance-name"
            type="text"
            value={instanceName}
            onChange={e => { setInstanceName(e.target.value); setSaved(false) }}
            maxLength={80}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </section>

      <hr />

      {/* New Organisation Defaults */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">New Organisation Defaults</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Settings stamped on new organisations at provisioning time. Existing orgs are not affected.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="default-theme" className="text-sm font-medium">
            Default theme
          </label>
          <select
            id="default-theme"
            value={defaultTheme}
            onChange={e => { setDefaultTheme(e.target.value); setSaved(false) }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="default-support-tier" className="text-sm font-medium">
            Default support tier
          </label>
          <select
            id="default-support-tier"
            value={defaultSupportTier}
            onChange={e => { setDefaultSupportTier(e.target.value); setSaved(false) }}
            className="flex h-9 w-52 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">None</option>
            {SUPPORT_TIERS.map(t => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Stamped on each new organisation when it is provisioned. Can be changed per-org later.
          </p>
        </div>
      </section>

      <hr />

      {/* Authentication Policy */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Authentication Policy</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controls available sign-in methods across the instance.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={allowLocalAuth}
            onChange={e => { setAllowLocalAuth(e.target.checked); setSaved(false) }}
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          />
          <div>
            <span className="text-sm font-medium group-hover:text-foreground">Allow local authentication</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permit email and password sign-in. Disable for SSO-only deployments. Local auth is always
              available to instance admins regardless of this setting.
            </p>
          </div>
        </label>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save configuration'}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}
