'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

/**
 * First-sign-in onboarding modal (#587 follow-up).
 *
 * Surfaced by the Early-Maturity EA Practice Lead persona walk:
 *   "Today, an admin who completes /setup lands in an empty org with
 *    no first-time framing, no starter content option, no inline
 *    empty-state CTAs on the catalog pages."
 *
 * Shows once per browser to admins, offering three anchored choices:
 *   - Take the tour (existing driver.js tour)
 *   - Apply a starter pack (navigates to /settings#starter-content)
 *   - Start from scratch (just dismisses)
 *
 * Persistence is via localStorage rather than a server-side flag so that:
 *   - No schema change is required (smallest reviewable PR for v1)
 *   - Switching devices re-shows the modal once — acceptable for an
 *     onboarding affordance; if a director-of-IT installs GovEA on a
 *     laptop one day and an iPad the next, seeing the welcome once
 *     more is fine
 *
 * If we ever need cross-device persistence, the upgrade path is a
 * `firstSignInOnboardingDismissedAt` timestamp on users + a tiny
 * server action — same pattern as `markCapabilityReviewed`. Tracked
 * here so the option is visible.
 */
const STORAGE_KEY = 'govea-first-sign-in-dismissed'

// Minimal tour definition — keep in sync with the main TourButton's tour.
// Shared via a re-exported `buildTour()` would be cleaner; deferred to
// avoid expanding scope of #587 follow-up.
function buildBasicTour() {
  return driver({
    showProgress: true,
    popoverClass: 'govea-tour-popover',
    steps: [
      { element: '[data-tour="dashboard-link"]', popover: { title: 'Dashboard', description: 'Coverage and health signals across all of your EA content live here.' } },
      { element: '[data-tour="capabilities-link"]', popover: { title: 'Capabilities', description: 'What your organization must be able to do.' } },
      { element: '[data-tour="applications-link"]', popover: { title: 'Applications', description: 'The technology platforms that deliver capabilities.' } },
      { element: '[data-tour="settings-link"]', popover: { title: 'Settings', description: 'Apply starter content, adjust security, and configure your org here.' } },
    ],
  })
}

export function FirstSignInModal({ role }: { role: 'admin' | 'contributor' | 'viewer' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (role !== 'admin') return
    try {
      if (typeof window === 'undefined') return
      const dismissed = window.localStorage.getItem(STORAGE_KEY)
      if (!dismissed) setOpen(true)
    } catch {
      // localStorage can be unavailable (Safari private mode, etc.) —
      // gracefully skip in that case rather than crashing the dashboard.
    }
  }, [role])

  function dismiss() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, new Date().toISOString())
      }
    } catch {}
    setOpen(false)
  }

  function handleTakeTour() {
    dismiss()
    // Small delay so the modal animates closed before the tour overlay opens.
    setTimeout(() => buildBasicTour().drive(), 200)
  }

  function handleApplyStarterPack() {
    dismiss()
    router.push('/settings#starter-content')
  }

  function handleStartScratch() {
    dismiss()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to GovEA</DialogTitle>
          <DialogDescription>
            Pick the path that fits how you want to start. You can change your mind any time — none of these are one-way doors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleTakeTour}
            className="w-full rounded-md border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
          >
            <p className="font-medium">Take the tour</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              A short guided walk through the main surfaces — dashboard, capabilities, applications, settings.
            </p>
          </button>

          <button
            type="button"
            onClick={handleApplyStarterPack}
            className="w-full rounded-md border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
          >
            <p className="font-medium">Apply a starter pack</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seed your org with a small, credible example map you can use to demo or replace as you build your own. Tagged so it never gets confused with your authored content.
            </p>
          </button>

          <button
            type="button"
            onClick={handleStartScratch}
            className="w-full rounded-md border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
          >
            <p className="font-medium">Start from scratch</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Skip both. You&rsquo;ll see empty-state prompts on each catalog page as you go.
            </p>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Don&rsquo;t show this again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
