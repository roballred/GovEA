'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveSecuritySettings } from '@/actions/security-settings'
import type { SecuritySettings } from '@/db/schema'

/**
 * Settings form for #527 — per-org security policy.
 *
 * Layout follows the pattern of CompletenessSettingsForm and
 * ConfidenceSettingsForm: grouped sections, save button at bottom,
 * inline status copy that tells the admin what each value enforces.
 */
export function SecuritySettingsForm({ initial }: { initial: SecuritySettings }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await saveSecuritySettings(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">Settings saved. Changes apply to future logins.</p>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Password policy</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="passwordMinLength">Minimum length</Label>
            <Input
              id="passwordMinLength"
              name="passwordMinLength"
              type="number"
              min={6}
              max={128}
              defaultValue={initial.passwordMinLength}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="passwordExpiryDays">Password expiry (days)</Label>
            <Input
              id="passwordExpiryDays"
              name="passwordExpiryDays"
              type="number"
              min={0}
              max={730}
              defaultValue={initial.passwordExpiryDays}
            />
            <p className="text-xs text-muted-foreground">0 disables forced rotation</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="requireUppercase" defaultChecked={initial.requireUppercase} />
            Uppercase
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="requireLowercase" defaultChecked={initial.requireLowercase} />
            Lowercase
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="requireDigit" defaultChecked={initial.requireDigit} />
            Digit
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="requireSpecial" defaultChecked={initial.requireSpecial} />
            Special
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Session</legend>
        <div className="space-y-1">
          <Label htmlFor="sessionTimeoutMinutes">Session timeout (minutes)</Label>
          <Input
            id="sessionTimeoutMinutes"
            name="sessionTimeoutMinutes"
            type="number"
            min={5}
            max={43200}
            defaultValue={initial.sessionTimeoutMinutes}
            required
          />
          <p className="text-xs text-muted-foreground">
            Users are re-prompted to sign in after this many minutes of session age. Default: 1440 (24h).
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Account lockout</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="lockoutThreshold">Failed-attempt threshold</Label>
            <Input
              id="lockoutThreshold"
              name="lockoutThreshold"
              type="number"
              min={0}
              max={20}
              defaultValue={initial.lockoutThreshold}
            />
            <p className="text-xs text-muted-foreground">0 disables lockout</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lockoutDurationMinutes">Lockout duration (minutes)</Label>
            <Input
              id="lockoutDurationMinutes"
              name="lockoutDurationMinutes"
              type="number"
              min={1}
              max={1440}
              defaultValue={initial.lockoutDurationMinutes}
              required
            />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save security settings'}
        </Button>
      </div>
    </form>
  )
}
