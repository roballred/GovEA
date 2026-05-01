'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'
import { DevToolbar } from '@/components/dev-toolbar'
import { DarkModeToggle } from '@/components/dark-mode-toggle'
import { TourButton } from '@/components/product-tour'
import { isModuleEnabled, moduleForPath } from '@/lib/modules'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; moduleKey?: string; contributorOnly?: boolean }
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
    label: 'Reports',
    items: [
      { href: '/reports',    label: 'Reports' },
      { href: '/executive',  label: 'Executive Summary' },
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
  const isContributor = role === 'admin' || role === 'contributor'

  return (
    <nav className="flex flex-col h-full overflow-y-auto py-4 px-3 gap-1">
      {/* Dashboard */}
      <Link
        href="/dashboard"
        onClick={onClose}
        data-tour="dashboard"
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/dashboard' || pathname.startsWith('/dashboard/')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        Dashboard
      </Link>

      {/* Executive Summary */}
      <Link
        href="/executive"
        onClick={onClose}
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/executive' || pathname.startsWith('/executive/')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        Executive Summary
      </Link>

      <div className="mt-2 space-y-4">
        {NAV_GROUPS.filter(g => !g.adminOnly || isAdmin).map(group => {
          const visibleItems = group.items.filter(
            item =>
              (!item.moduleKey || isModuleEnabled(enabledModules, item.moduleKey as Parameters<typeof isModuleEnabled>[1])) &&
              (!item.contributorOnly || isContributor)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p
                data-tour={group.label === 'Business Architecture' ? 'nav-business-arch' : group.label === 'Strategy' ? 'nav-strategy' : group.label === 'Reports' ? 'nav-reports' : undefined}
                className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none"
              >
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
                      data-tour={
                        item.href === '/personas'      ? 'nav-personas'      :
                        item.href === '/value-streams' ? 'nav-value-streams' :
                        item.href === '/capabilities'  ? 'nav-capabilities'  :
                        item.href === '/services'      ? 'nav-services'      :
                        item.href === '/applications'  ? 'nav-applications'  :
                        item.href === '/adrs'          ? 'nav-adrs'          :
                        item.href === '/roadmap'       ? 'nav-roadmap'       :
                        undefined
                      }
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
  isInstanceAdmin: boolean
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
  isInstanceAdmin,
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

          {/* Search */}
          <div className="flex-1 flex items-center">
            {/* Desktop: visible input */}
            <form action="/search" method="get" className="hidden lg:flex w-full max-w-sm">
              <input
                name="q"
                type="search"
                placeholder="Search…"
                data-tour="search"
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
            </form>
            {/* Mobile: icon link to search page */}
            <Link
              href="/search"
              className="lg:hidden rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </Link>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            {isInstanceAdmin && (
              <Link
                href="/instance"
                className="hidden sm:inline-flex items-center rounded-md border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-200 hover:bg-violet-500/30 transition-colors"
              >
                Platform Admin
              </Link>
            )}
            <span className="hidden sm:block text-sm text-white/70">{email}</span>
            <span
              data-tour="role-badge"
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                roleBadgeClass
              )}
            >
              {role}
            </span>
            <TourButton role={role} />
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
