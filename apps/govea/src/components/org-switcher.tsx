'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { switchActiveOrganization, type MyOrganization } from '@/actions/active-org'
import { cn } from '@/lib/utils'

/**
 * Active-organization switcher (#693 slice 3b). Renders only when the user has
 * more than one active membership. Selecting an org persists it server-side
 * (switchActiveOrganization), then fires the NextAuth session update() so the
 * JWT re-resolves the active org/role (see the `update` trigger in lib/auth.ts),
 * then refreshes the server components.
 */
export function OrgSwitcher({ orgs }: { orgs: MyOrganization[] }) {
  const { update } = useSession()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Single-membership users get no switcher — unchanged UX.
  if (orgs.length < 2) return null

  const current = orgs.find(o => o.isCurrent) ?? orgs[0]

  function choose(orgId: string) {
    if (orgId === current.organizationId) { setOpen(false); return }
    startTransition(async () => {
      await switchActiveOrganization(orgId)
      // Pass data so NextAuth POSTs to /api/auth/session and fires the jwt
      // `update` trigger (a bare update() only refetches via GET and won't
      // re-resolve the active org). The server re-reads last_active from the DB;
      // this payload is just the signal to run the trigger.
      await update({ activeOrganizationId: orgId })
      router.refresh()
      setOpen(false)
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-60"
        title="Switch active organization"
      >
        <span className="max-w-[10rem] truncate">{pending ? 'Switching…' : current.name}</span>
        <svg className="h-3 w-3 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-72 w-56 overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {orgs.map(o => (
            <li key={o.organizationId}>
              <button
                type="button"
                role="option"
                aria-selected={o.isCurrent}
                onClick={() => choose(o.organizationId)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700',
                  o.isCurrent && 'font-semibold',
                )}
              >
                <span className="truncate">{o.name}</span>
                <span className="ml-2 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {o.isCurrent ? '✓ ' : ''}{o.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
