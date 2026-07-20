'use client'

import { useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'
import { DarkModeToggle } from '@govcore/nextkit/theming'
import { AppShell as CoreAppShell, GroupedSideNav, type NavGroup as CoreNavGroup } from '@govcore/nextkit'
import { MobileNavDrawer } from '@govcore/nextkit/client'
import { TourButton } from '@/components/product-tour'
import { isModuleEnabled, moduleForPath } from '@/lib/modules'

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
  navLabel,
  className,
}: {
  role: Role
  pathname: string
  enabledModules: Record<string, boolean>
  isInstanceAdmin?: boolean
  unreadNotificationCount?: number
  /** #872 — distinguishes the desktop vs mobile nav landmarks for AT. */
  navLabel: string
  /**
   * Layout for the nav element. The desktop rail owns its own padding; inside
   * MobileNavDrawer the drawer already pads its content area, so the drawer
   * passes a padding-free variant rather than double-padding the links (#898).
   */
  className?: string
}) {
  const isAdmin = role === 'admin'
  const isContributor = role === 'admin' || role === 'contributor'
  const isViewer = role === 'viewer'

  // #898 — the collapsible group accordion is now @govcore/nextkit's
  // GroupedSideNav (branded tone). GovEA still owns role/module gating: filter
  // groups + items here, compute `active` per item, and mark the group holding
  // the active route `defaultOpen` (nextkit's native <details> accordion opens
  // it with no client JS). The ungrouped links (Dashboard/Overview/
  // Notifications) and the Platform Admin footer stay bespoke below — they
  // carry a badge, a tour anchor, and a distinct treatment GroupedSideNav's
  // plain items don't model.
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const visibleGroups: CoreNavGroup[] = NAV_GROUPS
    .filter(g => !g.adminOnly || isAdmin)
    .filter(g => !(g.viewerHidden && isViewer))
    .map(group => {
      const items = group.items
        .filter(
          item =>
            (!item.moduleKey || isModuleEnabled(enabledModules, item.moduleKey as Parameters<typeof isModuleEnabled>[1])) &&
            (!item.contributorOnly || isContributor) &&
            !(item.viewerHidden && isViewer)
        )
        .map(item => ({ href: item.href, label: item.label, active: isActive(item.href) }))
      return { label: group.label, items, defaultOpen: items.some(i => i.active) }
    })
    .filter(group => group.items.length > 0)

  // #662/#898 — expose the product-tour hook over nextkit's native accordion:
  // opening a group is `details.open = true` on the `data-nav-group` element
  // GroupedSideNav emits (both the desktop and mobile sidebars carry one, so
  // set every match). Replaces the old controlled-state setter; the tour code
  // still just calls `window.__goveaOpenNavGroup(label)`. Cross-session
  // persistence of the open group is intentionally dropped (GovCore #103 —
  // the active group auto-opens via defaultOpen, which is the case that
  // mattered).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as { __goveaOpenNavGroup?: (label: string) => void }
    w.__goveaOpenNavGroup = (label: string) => {
      document
        .querySelectorAll<HTMLDetailsElement>(`[data-nav-group="${label.replace(/"/g, '\\"')}"]`)
        .forEach(el => { el.open = true })
    }
    return () => {
      delete w.__goveaOpenNavGroup
    }
  }, [])

  return (
    <nav aria-label={navLabel} className={className ?? 'flex flex-col h-full overflow-y-auto py-4 px-3 gap-1'}>
      {/* Dashboard */}
      <Link
        href="/dashboard"
        data-tour="dashboard"
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive('/dashboard')
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        Dashboard
      </Link>

      {/* Overview (#614) — stakeholder-facing landing, visible to all roles. */}
      <Link
        href="/overview"
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive('/overview')
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
        className={cn(
          'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive('/notifications')
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

      {/* Collapsible sections — @govcore/nextkit GroupedSideNav on the branded
          rail (#898). A distinct aria-label keeps the two nav landmarks unique. */}
      <GroupedSideNav
        groups={visibleGroups}
        ariaLabel={`${navLabel} sections`}
        tone="branded"
        className="mt-2 w-full"
      />

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
  isInstanceAdmin,
  enabledModules,
  unreadNotificationCount,
  orgSwitcherSlot,
  signOutSlot,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Redirect to dashboard if the current route's module has been disabled
  useEffect(() => {
    const mod = moduleForPath(pathname)
    if (mod && !isModuleEnabled(enabledModules, mod.key)) {
      router.replace('/dashboard')
    }
  }, [pathname, enabledModules, router])

  // #898 phase 2b — the shell chrome (fixed rail, sticky header, skip-link,
  // print-hidden chrome, focusable <main>) is now @govcore/nextkit's AppShell
  // in its `fixed-rail` layout. GovEA keeps only what is genuinely its own:
  // the role/module-gated SidebarContent, the branded header controls, and the
  // module-disabled redirect above. Passing `mobileNav` makes the rail
  // desktop-only and the drawer own everything below `lg`.
  //
  // Both the desktop rail and the drawer get a padding-free SidebarContent:
  // the rail's own wrapper and the drawer both pad their content area, so the
  // nav must not pad again. The rail additionally takes `h-full` so the
  // `mt-auto` Platform Admin footer still pins to the bottom of the rail — its
  // wrapper is a flex column with height, which the drawer's is not.
  const sidebar = (navLabel: string, className: string) => (
    <SidebarContent
      navLabel={navLabel}
      className={className}
      role={role}
      pathname={pathname}
      enabledModules={enabledModules}
      isInstanceAdmin={isInstanceAdmin}
      unreadNotificationCount={unreadNotificationCount}
    />
  )

  return (
    <CoreAppShell
      layout="fixed-rail"
      width="fluid"
      navAriaLabel="Primary"
      nav={sidebar('Primary', 'flex flex-col gap-1 h-full')}
      // Desktop rail wordmark (the header's `title` is the mobile-only echo).
      railHeader={
        <Link
          href="/dashboard"
          className="font-bold tracking-tight text-white text-lg hover:opacity-80 transition-opacity"
        >
          GovEA
        </Link>
      }
      // Below `lg` the rail is hidden and this owns the nav — hamburger,
      // slide-in panel, backdrop, scroll-lock, focus handling, close-on-select
      // (#898 phase 2a). Same SidebarContent as the rail, so they can't drift.
      mobileNav={
        <MobileNavDrawer
          title="GovEA"
          tone="branded"
          ariaLabel="Primary (mobile)"
          nav={sidebar('Primary (mobile)', 'flex flex-col gap-1')}
        />
      }
      // Mobile-only wordmark; on `lg+` the rail's railHeader carries it, so this
      // collapses to nothing and the header leads with search.
      title={
        <Link href="/dashboard" className="lg:hidden font-bold tracking-tight text-white text-lg">
          GovEA
        </Link>
      }
      search={
        <>
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
          {/* Mobile: icon link to the search page */}
          <Link
            href="/search"
            className="lg:hidden inline-flex rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Search"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </Link>
        </>
      }
      actions={
        <>
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
        </>
      }
      // #559 — keep budget-hearing / oversight handouts edge-to-edge. AppShell
      // already prints chrome-free; data-print-main is the hook globals.css
      // uses to zero the content padding for print (the rule now also targets
      // the fixed-rail content wrapper, which carries the padding here).
      mainProps={{ 'data-print-main': '' } as HTMLAttributes<HTMLElement>}
    >
      {children}
    </CoreAppShell>
  )
}
