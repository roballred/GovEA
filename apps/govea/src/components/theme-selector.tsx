'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeSelector as CoreThemeSelector } from '@govcore/nextkit/theming'
import { THEME_STORAGE_KEY } from '@govcore/theme'
import { themes } from '@/lib/themes'
import { updateOrgTheme } from '@/actions/settings'

/**
 * Per-org theme picker (#897). Wraps @govcore/nextkit's ThemeSelector so the
 * choice persists to the org (server) via updateOrgTheme, not just localStorage.
 *
 * GovEA's brand is per-org and server-authoritative: <ThemeStyle> in the admin
 * layout applies the org theme on load, so after a change we router.refresh()
 * to re-render it. `activeTheme` (the org's persisted theme) seeds the shared
 * localStorage key on mount so the selector highlights the org theme rather
 * than this browser's last local pick.
 */
export function ThemeSelector({ activeTheme }: { activeTheme: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (localStorage.getItem(THEME_STORAGE_KEY) !== activeTheme) {
      localStorage.setItem(THEME_STORAGE_KEY, activeTheme)
      document.documentElement.setAttribute('data-theme', activeTheme)
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }))
    }
  }, [activeTheme])

  return (
    <CoreThemeSelector
      themes={themes}
      onChange={themeId =>
        startTransition(async () => {
          await updateOrgTheme(themeId)
          router.refresh()
        })
      }
    />
  )
}
