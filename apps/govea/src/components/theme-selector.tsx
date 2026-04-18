'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { themes } from '@/lib/themes'
import { updateOrgTheme } from '@/actions/settings'
import { cn } from '@/lib/utils'

export function ThemeSelector({ activeTheme }: { activeTheme: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSelect(themeId: string) {
    const theme = themes.find(t => t.id === themeId)
    if (!theme) return

    document.documentElement.classList.toggle('dark', theme.darkMode)
    localStorage.setItem('govea-dark-mode', theme.darkMode ? 'dark' : 'light')

    startTransition(async () => {
      await updateOrgTheme(themeId)
      router.refresh()
    })
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', pending && 'opacity-60 pointer-events-none')}>
      {themes.map(theme => {
        const isActive = theme.id === activeTheme
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => handleSelect(theme.id)}
            className={cn(
              'w-full text-left rounded-lg border-2 overflow-hidden transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isActive ? 'border-primary shadow-sm' : 'border-transparent hover:border-border'
            )}
          >
            {/* Preview */}
            <div className="h-24 flex flex-col">
              <div
                className="h-8 flex items-center px-3 gap-1.5"
                style={{ backgroundColor: theme.previewColors.header }}
              >
                <div className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: theme.previewColors.primary }} />
                <div className="h-1.5 w-12 rounded-full opacity-40" style={{ backgroundColor: theme.previewColors.primary }} />
                <div className="ml-auto h-1.5 w-8 rounded-full opacity-30" style={{ backgroundColor: theme.previewColors.primary }} />
              </div>
              <div
                className="flex-1 p-2 flex gap-1.5 items-start"
                style={{ backgroundColor: theme.previewColors.background }}
              >
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-1.5 w-16 rounded-full bg-current opacity-20" />
                  <div className="h-2.5 w-full rounded bg-white border border-current/10" />
                  <div className="h-2.5 w-full rounded bg-white border border-current/10" />
                </div>
                <div
                  className="h-5 w-12 rounded text-[8px] font-bold flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: theme.previewColors.primary }}
                >
                  Save
                </div>
              </div>
            </div>

            {/* Label */}
            <div className="px-3 py-2.5 bg-card border-t border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{theme.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
              </div>
              {isActive && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
