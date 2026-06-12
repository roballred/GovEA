'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { switchActiveOrganization, type MyOrganization } from '@/actions/active-org'
import { defaultLandingPath } from '@/lib/auth-redirect'
import { cn } from '@/lib/utils'

/**
 * Organization choice list for the post-login /select-org page (#800).
 *
 * Mirrors the org switcher's mechanics exactly: persist the choice
 * server-side (switchActiveOrganization validates the membership — the
 * client's claim is never trusted), fire the NextAuth session update() so
 * the JWT re-resolves the active org/role, then land role-appropriately
 * for the chosen org.
 */
export function OrgSelectList({ organizations }: { organizations: MyOrganization[] }) {
  const { update } = useSession()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function choose(org: MyOrganization) {
    setPendingId(org.organizationId)
    setError(null)
    startTransition(async () => {
      try {
        await switchActiveOrganization(org.organizationId)
        // Pass data so NextAuth POSTs to /api/auth/session and fires the jwt
        // `update` trigger — a bare update() only refetches and won't
        // re-resolve the active org (see org-switcher.tsx).
        await update({ activeOrganizationId: org.organizationId })
        // The role differs per org: land where the *chosen* membership says.
        router.replace(defaultLandingPath({ role: org.role, isInstanceAdmin: false }))
      } catch {
        setError('Could not open that organization. Try another, or contact your administrator.')
        setPendingId(null)
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {organizations.map(org => (
          <li key={org.organizationId}>
            <button
              type="button"
              onClick={() => choose(org)}
              disabled={pending}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                'hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60',
                org.isCurrent && 'border-primary/40 bg-muted/30',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {pendingId === org.organizationId ? 'Opening…' : org.name}
                </span>
                <span className="block text-xs text-muted-foreground capitalize">{org.role}</span>
              </span>
              {org.isCurrent && (
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  Last used
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
