'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  saveEmailSettings, sendTestEmail,
  type EmailSettingsForUi, type EmailDeliveryLogRow,
} from '@/actions/email-settings'

interface Props {
  initial: EmailSettingsForUi
  recentDeliveries: EmailDeliveryLogRow[]
  adminEmail: string | null
}

/**
 * Settings card for outbound email configuration (#528).
 *
 * Three subsections:
 *   - SMTP fields + From identity (saveEmailSettings server action)
 *   - "Send test email" button (sendTestEmail server action; always to
 *     the admin's own address per the capability rule)
 *   - Recent delivery attempts table
 */
export function EmailSettingsSection({ initial, recentDeliveries, adminEmail }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const passwordSet = initial?.passwordSet ?? false

  function handleSave(formData: FormData) {
    setSaveError(null)
    setSaveOk(false)
    startTransition(async () => {
      const result = await saveEmailSettings(formData)
      if (result.ok) {
        setSaveOk(true)
        router.refresh()
      } else {
        setSaveError(result.error)
      }
    })
  }

  function handleTestSend() {
    setTestResult(null)
    startTransition(async () => {
      const r = await sendTestEmail()
      setTestResult(r.ok
        ? { ok: true, message: `Test sent in ${r.durationMs}ms — check your inbox at ${adminEmail ?? 'your email'}.` }
        : { ok: false, message: r.error }
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <form action={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="SMTP host" name="host" required defaultValue={initial?.host ?? ''} placeholder="smtp.example.com" />
          <FormField label="Port" name="port" type="number" required defaultValue={initial?.port?.toString() ?? '587'} />
          <FormField label="Username (optional)" name="username" defaultValue={initial?.username ?? ''} />
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={passwordSet ? '•••••••• (saved — leave blank to keep)' : ''}
              autoComplete="new-password"
            />
            {passwordSet && (
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the saved password. Enter <code className="bg-muted px-1 rounded">__clear__</code> to remove it.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tlsMode">TLS</Label>
            <select
              id="tlsMode"
              name="tlsMode"
              defaultValue={initial?.tlsMode ?? 'starttls'}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="starttls">STARTTLS (recommended)</option>
              <option value="tls">Implicit TLS</option>
              <option value="none">None (plaintext)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enabled">Enabled</Label>
            <div className="flex items-center gap-2 h-9">
              <input
                id="enabled"
                name="enabled"
                type="checkbox"
                defaultChecked={initial?.enabled ?? true}
                className="h-4 w-4"
              />
              <span className="text-sm text-muted-foreground">When unchecked, no outbound email is attempted.</span>
            </div>
          </div>
          <FormField label="From name" name="fromName" required defaultValue={initial?.fromName ?? ''} placeholder="GovEA" />
          <FormField label="From address" name="fromAddress" required defaultValue={initial?.fromAddress ?? ''} placeholder="govea@example.com" type="email" />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save settings'}</Button>
          {saveOk && <p className="text-sm text-emerald-700">Saved.</p>}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        </div>
      </form>

      <div className="rounded-md border bg-card p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Send a test email</p>
          <p className="text-xs text-muted-foreground">
            Test emails are always sent to your own address ({adminEmail ?? 'unknown'}) — per the capability rule.
            The attempt is recorded in the log below regardless of outcome.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={handleTestSend} disabled={isPending || !initial}>
            {isPending ? 'Sending…' : 'Send test email'}
          </Button>
          {testResult && (
            <p className={`text-sm ${testResult.ok ? 'text-emerald-700' : 'text-destructive'}`}>{testResult.message}</p>
          )}
        </div>
        {!initial && <p className="text-xs text-muted-foreground">Save SMTP settings before sending a test.</p>}
      </div>

      <div className="rounded-md border bg-card">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium">Recent delivery attempts</p>
          <p className="text-xs text-muted-foreground">Last {recentDeliveries.length || 'few'} outbound attempts for this organization.</p>
        </div>
        {recentDeliveries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No delivery attempts yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recentDeliveries.map(r => (
              <li key={r.id} className="px-4 py-2 flex items-start gap-3">
                <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-medium ${r.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {r.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {r.subject}{' '}
                    <span className="text-muted-foreground">→ {r.toAddress}</span>
                    {r.isTest && <span className="ml-2 inline-flex items-center rounded bg-muted px-1 text-xs">test</span>}
                  </p>
                  {r.errorMessage && (
                    <p className="text-xs text-destructive mt-0.5 truncate" title={r.errorMessage}>
                      {r.errorMessage}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.durationMs != null && <> · {r.durationMs}ms</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}
