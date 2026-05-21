'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'

export type OrgUserOption = {
  id: string
  name: string | null
  email: string
}

/**
 * Shared edit-form section for domain-owner attribution + the overwrite
 * acknowledgment gate (#581).
 *
 * Two things in one tile:
 *
 *  1. A picker for setting / clearing the domain owner. Any user in the org
 *     can be picked; "No owner" is the default.
 *
 *  2. When the object is already owned by someone OTHER than the current
 *     actor, a warning banner appears with a required acknowledgment
 *     checkbox. The server-side gate also enforces this — the checkbox is
 *     the UI half of the contract. Save is intentionally not blocked once
 *     the checkbox is on; the goal is to make overwrite visible and
 *     auditable, not to introduce an approval queue (issue scope).
 *
 * The owner picker is sorted alphabetically and shows the actor's own name
 * as "(you)" so users notice when they themselves are the owner.
 */
export function DomainOwnerFormSection({
  currentUserId,
  initialOwnerUserId,
  orgUsers,
}: {
  currentUserId: string
  initialOwnerUserId: string | null | undefined
  orgUsers: OrgUserOption[]
}) {
  const [acknowledged, setAcknowledged] = useState(false)

  const initialOwner = initialOwnerUserId
    ? orgUsers.find(u => u.id === initialOwnerUserId)
    : null
  const ownedByOther = !!initialOwner && initialOwner.id !== currentUserId
  const ownerLabel = initialOwner?.name ?? initialOwner?.email ?? 'another contributor'

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="domainOwnerUserId">Domain owner</Label>
        <select
          id="domainOwnerUserId"
          name="domainOwnerUserId"
          defaultValue={initialOwnerUserId ?? ''}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— No owner —</option>
          {orgUsers.map(u => (
            <option key={u.id} value={u.id}>
              {u.id === currentUserId
                ? `${u.name ?? u.email} (you)`
                : (u.name ?? u.email)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          The domain owner is notified of edits and overwrite warnings appear when others save changes.
        </p>
      </div>

      {ownedByOther && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-900">
            This is owned by {ownerLabel}.
          </p>
          <p className="text-xs text-amber-800">
            You can still save, but coordinate before overwriting someone else&apos;s record. Your edit will be logged with an overwrite-acknowledged audit row.
          </p>
          <label className="flex items-start gap-2 pt-1 text-sm text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              name="acknowledgeOverwrite"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              required
              className="mt-0.5"
            />
            <span>I acknowledge that I am overwriting an owned record.</span>
          </label>
        </div>
      )}
    </div>
  )
}
