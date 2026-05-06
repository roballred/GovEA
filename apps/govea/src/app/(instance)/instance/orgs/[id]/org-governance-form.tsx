'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateOrgGovernance } from '@/actions/instance'
import { SUPPORT_TIERS } from '@/lib/support-tiers'

const TIER_LABELS: Record<string, string> = {
  community: 'Community',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

interface Props {
  orgId: string
  initialTier: string | null
  initialNotes: string | null
}

export function OrgGovernanceForm({ orgId, initialTier, initialNotes }: Props) {
  const [tier, setTier] = useState<string>(initialTier ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateOrgGovernance(orgId, {
          supportTier: tier || null,
          internalNotes: notes || null,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="support-tier">Support tier</Label>
        <select
          id="support-tier"
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="flex h-9 w-52 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">None</option>
          {SUPPORT_TIERS.map(t => (
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="internal-notes">Internal notes</Label>
        <Textarea
          id="internal-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Contract details, escalation contacts, known issues…"
          rows={4}
          className="resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Visible to instance admins only. Not shared with the tenant.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>
    </div>
  )
}
