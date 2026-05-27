'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/instance',          label: 'Dashboard',         exact: true },
  { href: '/instance/orgs',     label: 'Organizations' },
  { href: '/instance/users',    label: 'Users' },
  { href: '/instance/features', label: 'Feature Controls' },
  { href: '/instance/notices',  label: 'Notices' },
  { href: '/instance/audit',    label: 'Audit Log' },
  { href: '/instance/config',   label: 'Configuration' },
]

const BG    = '#1e1b4b' // indigo-950 — distinct from agency admin
const BORDER = '#312e81' // indigo-900

interface ActiveSession {
  id: string
  targetOrgName: string
  expiresAt: Date
}

interface InstanceShellProps {
  email: string
  signOutSlot: ReactNode
  children: ReactNode
  activeBreakGlassSessions?: ActiveSession[]
  instanceName?: string
}

export function InstanceShell({
  email,
  signOutSlot,
  children,
  activeBreakGlassSessions = [],
  instanceName = 'GovEA',
}: InstanceShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 z-40 border-r"
        style={{ backgroundColor: BG, borderColor: BORDER }}
      >
        <div
          className="flex h-14 shrink-0 items-center gap-2 px-4 border-b"
          style={{ borderColor: BORDER }}
        >
          <Link href="/instance" className="font-bold tracking-tight text-white text-lg hover:opacity-80 transition-opacity">
            {instanceName}
          </Link>
          <span className="text-xs text-indigo-300 font-medium">Platform</span>
        </div>
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'flex flex-col fixed inset-y-0 left-0 w-72 z-50 lg:hidden border-r transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: BG, borderColor: BORDER }}
        aria-label="Navigation"
      >
        <div
          className="flex h-14 shrink-0 items-center justify-between px-4 border-b"
          style={{ borderColor: BORDER }}
        >
          <span className="font-bold tracking-tight text-white text-lg">
            {instanceName} <span className="text-indigo-300 font-medium text-sm">Platform</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarNav pathname={pathname} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="lg:pl-56 flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6"
          style={{ backgroundColor: BG, borderColor: BORDER }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-white/70">{email}</span>
            <span className="inline-flex items-center rounded-md border border-violet-400/50 bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-200">
              platform admin
            </span>
            {signOutSlot}
          </div>
        </header>

        {activeBreakGlassSessions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              ⚠ Active break-glass session{activeBreakGlassSessions.length > 1 ? 's' : ''}:{' '}
              {activeBreakGlassSessions.map(s => s.targetOrgName).join(', ')}
            </p>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

function SidebarNav({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <nav className="flex flex-col py-4 px-3 gap-0.5">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none mb-1">
        Platform
      </p>
      {NAV_ITEMS.map(item => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        )
      })}
      <div className="mt-auto pt-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="block rounded-md px-3 py-2 text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          ← Agency Portal
        </Link>
      </div>
    </nav>
  )
}
