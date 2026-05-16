'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Hides its children if the current sessionStorage already records
 * `dismissKey` as dismissed. The dismiss button writes the key on click.
 *
 * Dismissal scope:
 *   - Per-tab session (sessionStorage, not localStorage) — users see the
 *     notice again next time they open the app.
 *   - Per-key — admins editing the notice yield a new key (id + updatedAt
 *     in the parent), so updated notices re-appear for users who dismissed
 *     the previous version.
 *
 * SSR renders the notice; on hydration the effect checks sessionStorage
 * and hides if the key is already dismissed. A user who has dismissed
 * sees a brief flash of the notice before the effect runs — this is the
 * trade-off for hydration-mismatch-free SSR. (sessionStorage isn't
 * available server-side.)
 */
export function DismissibleNotice({
  dismissKey,
  children,
}: {
  dismissKey: string
  children: ReactNode
}) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(`dismissed-notice-${dismissKey}`) === '1') {
      setDismissed(true)
    }
  }, [dismissKey])

  if (dismissed) return null

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => {
          sessionStorage.setItem(`dismissed-notice-${dismissKey}`, '1')
          setDismissed(true)
        }}
        className="absolute top-2 right-3 text-current opacity-60 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
