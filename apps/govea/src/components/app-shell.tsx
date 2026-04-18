'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'
import { DevToolbar } from '@/components/dev-toolbar'
import { DarkModeToggle } from '@/components/dark-mode-toggle'
import { isModuleEnabled, moduleForPath } from '@/lib/modules'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; moduleKey?: string }
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Business Architecture',
    items: [
      { href: '/personas',      label: 'Personas',      moduleKey: 'personas' },
      { href: '/value-streams', label: 'Value Streams',  moduleKey: 'value-streams' },
      { href: '/capabilities',  label: 'Capabilities',   moduleKey: 'capabilities' },
      { href: '/services',      label: 'Services',       moduleKey: 'services' },
      { href: '/glossary',      label: 'Glossary',       moduleKey: 'glossary' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/applications', label: 'Applications', moduleKey: 'applications' },
      { href: '/adrs',         label: 'Decisions',    moduleKey: 'adrs' },
      { href: '/principles',   label: 'Principles',   moduleKey: 'principles' },
    ],
  },
  {
    label: 'Strategy',
    items: [
      { href: '/objectives',  label: 'Objectives',  moduleKey: 'objectives' },
      { href: '/initiatives', label: 'Initiatives', moduleKey: 'initiatives' },
      { href: '/roadmap',     label: 'Roadmap',     moduleKey: 'roadmap' },
    ],
  },
  {
    label: 'Configuration',
    adminOnly: true,
    items: [
      { href: '/taxonomy',    label: 'Taxonomy' },
      { href: '/users',       label: 'Users' },
      { href: '/connections', label: 'Connections' },
      { href: '/audit',       label: 'Audit Log' },
      { href: '/settings',    label: 'Settings' },
    ],
  },
]

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({
  role,
  pathname,
  enabledModules,
  onClose,
}: {
  role: Role
  pathname: string
  enabledModules: Record<string, boolean>
  onClose?: () => void
}) {
  const isAdmin = role === 'admin'

  return (
    <nav className="flex flex-col h-full overflow-y-auto py-4 px-3 gap-1">
      {/* Dashboard */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/dashboard' || pathname.startsWith('/dashboard/')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        Dashboard
      </Link>

      <div className="mt-2 space-y-4">
        {NAV_GROUPS.filter(g => !g.adminOnly || isAdmin).map(group => {
          const visibleItems = group.items.filter(
            item => !item.moduleKey || isModuleEnabled(enabledModules, item.moduleKey as Parameters<typeof isModuleEnabled>[1])
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none">
                {group.label}
              </p>
              <div className="mt-0.5 space-y-0.5">
                {visibleItems.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
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
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  role: Role
  email: string
  roleBadgeClass: string
  themeStyle: string
  isDev: boolean
  enabledModules: Record<string, boolean>
  signOutSlot: ReactNode
  children: ReactNode
}

export function AppShell({
  role,
  email,
  roleBadgeClass,
  themeStyle,
  isDev,
  enabledModules,
  signOutSlot,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Close mobile sidebar on navigation — React-idiomatic derived state update during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (sidebarOpen) {
      setSidebarOpen(false)
    }
  }

  // Redirect to dashboard if the current route's module has been disabled
  useEffect(() => {
    const mod = moduleForPath(pathname)
    if (mod && !isModuleEnabled(enabledModules, mod.key)) {
      router.replace('/dashboard')
    }
  }, [pathname, enabledModules, router])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const sidebarBg = 'hsl(var(--header-bg))'
  const sidebarBorder = 'hsl(var(--header-border))'

  return (
    <div className="min-h-screen bg-background">
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}

      {/* ── Desktop sidebar (fixed, always visible on lg+) ── */}
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 z-40 border-r"
        style={{ backgroundColor: sidebarBg, borderColor: sidebarBorder }}
      >
        {/* Logo */}
        <div
          className="flex h-14 shrink-0 items-center px-4 border-b"
          style={{ borderColor: sidebarBorder }}
        >
          <Link
            href="/dashboard"
            className="font-bold tracking-tight text-white text-lg hover:opacity-80 transition-opacity"
          >
            GovEA
          </Link>
        </div>
        <SidebarContent role={role} pathname={pathname} enabledModules={enabledModules} />
      </aside>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slide-in drawer) ── */}
      <aside
        className={cn(
          'flex flex-col fixed inset-y-0 left-0 w-72 z-50 lg:hidden border-r transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: sidebarBg, borderColor: sidebarBorder }}
        aria-label="Navigation"
      >
        {/* Mobile sidebar header */}
        <div
          className="flex h-14 shrink-0 items-center justify-between px-4 border-b"
          style={{ borderColor: sidebarBorder }}
        >
          <span className="font-bold tracking-tight text-white text-lg">GovEA</span>
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
        <SidebarContent role={role} pathname={pathname} enabledModules={enabledModules} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content area ── */}
      <div className="lg:pl-56 flex flex-col min-h-screen">

        {/* Top header */}
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6"
          style={{
            backgroundColor: sidebarBg,
            borderColor: sidebarBorder,
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          {/* Logo — mobile only (desktop logo is in sidebar) */}
          <Link
            href="/dashboard"
            className="lg:hidden font-bold tracking-tight text-white text-lg"
          >
            GovEA
          </Link>

          {/* User info */}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-sm text-white/70">{email}</span>
            <span className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
              roleBadgeClass
            )}>
              {role}
            </span>
            <DarkModeToggle />
            {signOutSlot}
          </div>
        </header>

        {/* Page content */}
        <main className={cn('flex-1 p-4 lg:p-6', isDev && 'pb-16')}>
          {children}
        </main>
      </div>

      {isDev && <DevToolbar />}
    </div>
  )
}
