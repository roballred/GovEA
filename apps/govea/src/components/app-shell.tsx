'use client'

import { useState, useEffect, useCallback, type ReactNode, type KeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'
import { DarkModeToggle } from '@/components/dark-mode-toggle'
import { TourButton } from '@/components/product-tour'
import { isModuleEnabled, moduleForPath } from '@/lib/modules'
import { groupSlug, readOpenGroup, writeOpenGroup } from '@/lib/nav-groups'

// ── Nav structure ─────────────────────────────────────────────────────────────

// #548 — `viewerHidden` removes the item / group from Viewer-role sidebars.
// Data Architecture, Architecture Debt, and the EA-jargon-heavy Goals page
// are author/architect surfaces with no Elected-Official-equivalent reader
// benefit. The persona-walk audit explicitly flagged the dense default nav
// as a Viewer adoption blocker.
type NavItem = { href: string; label: string; moduleKey?: string; contributorOnly?: boolean; viewerHidden?: boolean }
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean; viewerHidden?: boolean }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Business Architecture',
    items: [
      { href: '/personas',      label: 'Personas',      moduleKey: 'personas' },
      { href: '/value-streams', label: 'Value Streams',  moduleKey: 'value-streams' },
      { href: '/capabilities',  label: 'Capabilities',   moduleKey: 'capabilities' },
      { href: '/services',      label: 'Services',       moduleKey: 'services' },
      { href: '/principles',    label: 'Principles',     moduleKey: 'principles', viewerHidden: true },
      { href: '/glossary',      label: 'Glossary',       moduleKey: 'glossary' },
    ],
  },
  {
    // Data Architecture surfaces the full metamodel (entity / attribute /
    // link / business-key + the Chen Notation diagram) the same way
    // Business Architecture surfaces its object types. Every entry is
    // gated on the `data-architecture` module key so toggling the module
    // hides the whole group. Hidden from Viewer-role sidebars per #548.
    label: 'Data Architecture',
    viewerHidden: true,
    items: [
      { href: '/data',                label: 'Overview',      moduleKey: 'data-architecture' },
      { href: '/data/entities',       label: 'Entities',      moduleKey: 'data-architecture' },
      { href: '/data/attributes',     label: 'Attributes',    moduleKey: 'data-architecture' },
      { href: '/data/links',          label: 'Links',         moduleKey: 'data-architecture' },
      { href: '/data/business-keys',  label: 'Business keys', moduleKey: 'data-architecture' },
      { href: '/data/diagram',        label: 'Diagram',       moduleKey: 'data-architecture' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/applications', label: 'Applications', moduleKey: 'applications' },
      { href: '/adrs',         label: 'Decisions',    moduleKey: 'adrs' },
      { href: '/debt',         label: 'Debt',         moduleKey: 'debt', viewerHidden: true },
    ],
  },
  {
    label: 'Strategy',
    items: [
      { href: '/strategies',  label: 'Strategies',  moduleKey: 'strategies' },
      { href: '/goals',       label: 'Goals',       moduleKey: 'objectives', viewerHidden: true },
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
      // Audit Log is visible to Contributors and Admins. The page filters its
      // own rows: contributors see the architecture-content slice only,
      // admins see everything (#597).
      { href: '/audit',      label: 'Audit Log', contributorOnly: true },
    ],
  },
  {
    label: 'Configuration',
    adminOnly: true,
    items: [
      { href: '/taxonomy',        label: 'Taxonomy' },
      { href: '/users',           label: 'Users' },
      { href: '/connections',     label: 'Connections' },
      { href: '/settings',        label: 'Settings' },
      { href: '/settings/notices', label: 'Notices' },
      { href: '/settings/backup', label: 'Backup' },
    ],
  },
]

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({
  role,
  pathname,
  enabledModules,
  isInstanceAdmin,
  unreadNotificationCount,
  onClose,
}: {
  role: Role
  pathname: string
  enabledModules: Record<string, boolean>
  isInstanceAdmin?: boolean
  unreadNotificationCount?: number
  onClose?: () => void
}) {
  const isAdmin = role === 'admin'
  const isContributor = role === 'admin' || role === 'contributor'
  const isViewer = role === 'viewer'

  // #662 single-open accordion. Default-collapsed on first load; storage
  // holds at most one open group at a time under `nav.openGroup`. The
  // initial render renders all-collapsed so SSR + hydration agree; an
  // effect syncs from localStorage after mount.
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = readOpenGroup(window.localStorage)
    if (stored !== null) setOpenGroup(stored)
  }, [])

  // Open exactly one group; clicking the currently-open group collapses it.
  // Setting `force=true` always opens (used by the global helper below so
  // the product tour can pre-open a group regardless of current state).
  const setOpenGroupAndPersist = useCallback((label: string | null) => {
    setOpenGroup(label)
    if (typeof window !== 'undefined') {
      writeOpenGroup(label, window.localStorage)
    }
  }, [])

  const toggleGroup = useCallback((label: string) => {
    setOpenGroupAndPersist(openGroup === label ? null : label)
  }, [openGroup, setOpenGroupAndPersist])

  const onGroupKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleGroup(label)
    }
  }, [toggleGroup])

  // #662 — expose a global hook so the product tour can ensure a parent
  // nav group is open before highlighting a child link. Idempotent;
  // setting the same group again is a no-op. Cleared on unmount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as { __goveaOpenNavGroup?: (label: string) => void }
    w.__goveaOpenNavGroup = (label: string) => {
      setOpenGroupAndPersist(label)
    }
    return () => {
      delete w.__goveaOpenNavGroup
    }
  }, [setOpenGroupAndPersist])

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

      {/* Overview (#614) — stakeholder-facing landing, visible to all roles. */}
      <Link
        href="/overview"
        onClick={onClose}
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/overview' || pathname.startsWith('/overview/')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        Overview
      </Link>

      {/* Executive Summary intentionally has no top-level slot (#731) — it
          lives in the Reports group below, which auto-opens when the route
          is active. Viewers still land on /executive via auth-redirect. */}

      {/* Notifications inbox (#581) */}
      <Link
        href="/notifications"
        onClick={onClose}
        className={cn(
          'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/notifications' || pathname.startsWith('/notifications/')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        <span>Notifications</span>
        {unreadNotificationCount && unreadNotificationCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        ) : null}
      </Link>

      <div className="mt-2 space-y-4">
        {NAV_GROUPS
          .filter(g => !g.adminOnly || isAdmin)
          .filter(g => !(g.viewerHidden && isViewer))
          .map(group => {
          const visibleItems = group.items.filter(
            item =>
              (!item.moduleKey || isModuleEnabled(enabledModules, item.moduleKey as Parameters<typeof isModuleEnabled>[1])) &&
              (!item.contributorOnly || isContributor) &&
              !(item.viewerHidden && isViewer)
          )
          if (visibleItems.length === 0) return null
          // Single-open accordion (#662). The group is open if it's the
          // currently-open one OR it contains the active route (the
          // containing-active-route guard keeps the active-link highlight
          // visible without requiring the user to expand the group
          // manually). The containing-active group also "wins" against
          // the user's explicit open group when both apply — same group.
          const containsActive = visibleItems.some(item =>
            pathname === item.href || pathname.startsWith(item.href + '/')
          )
          const effectiveOpen = openGroup === group.label || containsActive
          const groupId = `navgroup-${groupSlug(group.label)}`
          return (
            <div key={group.label}>
              <button
                type="button"
                aria-expanded={effectiveOpen}
                aria-controls={groupId}
                onClick={() => toggleGroup(group.label)}
                onKeyDown={(e) => onGroupKeyDown(e, group.label)}
                data-tour={group.label === 'Business Architecture' ? 'nav-business-arch' : group.label === 'Strategy' ? 'nav-strategy' : group.label === 'Reports' ? 'nav-reports' : undefined}
                /* #662: top-level group rows are visually a little more
                   prominent than child links — slightly larger text, more
                   padding, brighter idle color — but still clearly the
                   header for a sub-list, not a full nav item. */
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 select-none rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 transition-colors"
              >
                <span>{group.label}</span>
                {/* Disclosure triangle: rotates 90° when open. */}
                <svg
                  className={cn(
                    'h-3 w-3 shrink-0 transition-transform duration-150 ease-out',
                    effectiveOpen ? 'rotate-90' : 'rotate-0'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div
                id={groupId}
                hidden={!effectiveOpen}
                className="mt-0.5 space-y-0.5"
              >
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

      {/* Platform Admin section — instance admins only */}
      {isInstanceAdmin && (
        <div className="mt-auto pt-4">
          <div
            className="mx-0 border-t border-white/10 pt-4"
          >
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none">
              Platform
            </p>
            <div className="mt-0.5 space-y-0.5">
              <Link
                href="/instance"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname.startsWith('/instance')
                    ? 'bg-violet-500/30 text-violet-200 font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.032-.507-3.947-1.399-5.625" />
                </svg>
                Platform Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  role: Role
  email: string
  roleBadgeClass: string
  themeStyle: string
  isInstanceAdmin: boolean
  enabledModules: Record<string, boolean>
  /** Caller's unread notification count — drives the nav badge (#581). */
  unreadNotificationCount?: number
  /** Org switcher (#693 slice 3b) — self-hides for single-membership users. */
  orgSwitcherSlot?: ReactNode
  signOutSlot: ReactNode
  children: ReactNode
}

export function AppShell({
  role,
  email,
  roleBadgeClass,
  themeStyle,
  isInstanceAdmin,
  enabledModules,
  unreadNotificationCount,
  orgSwitcherSlot,
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
        data-print-hide="true"
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
        <SidebarContent role={role} pathname={pathname} enabledModules={enabledModules} isInstanceAdmin={isInstanceAdmin} unreadNotificationCount={unreadNotificationCount} />
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
        data-print-hide="true"
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
        <SidebarContent role={role} pathname={pathname} enabledModules={enabledModules} isInstanceAdmin={isInstanceAdmin} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content area ── */}
      <div className="lg:pl-56 flex flex-col min-h-screen">

        {/* Top header */}
        <header
          data-print-hide="true"
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
            {orgSwitcherSlot}
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
        <main data-print-main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
