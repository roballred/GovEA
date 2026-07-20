'use client'

import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Role } from '@/lib/rbac'

const ROLE_COPY: Record<Role, string> = {
  admin:       'You can create, edit, and publish all EA content, and manage users, connections, and org settings.',
  contributor: 'You can create and edit all EA content. Publish items to make them visible to Viewer-role colleagues.',
  viewer:      'You have read-only access to published content across the catalog.',
}

/**
 * Map each nav step's element selector to the nav group that owns it (#662/#898).
 *
 * The sidebar's groups are now @govcore/nextkit's GroupedSideNav (a native
 * <details> accordion), so tour steps target the rendered DOM directly: a group
 * header by its `[data-nav-group="<label>"]` attribute, a child link by its
 * `a[href="/…"]`. A collapsed group hides its children, which driver.js can't
 * highlight, so before each such step we call `window.__goveaOpenNavGroup(group)`
 * (AppShell registers it) to open the parent first.
 *
 * Top-level targets outside a collapsible group (dashboard, search, role-badge)
 * are intentionally absent.
 */
const NAV_GROUP_FOR_SELECTOR: Record<string, string> = {
  '[data-nav-group="Business Architecture"]': 'Business Architecture',
  'a[href="/personas"]':                      'Business Architecture',
  'a[href="/value-streams"]':                 'Business Architecture',
  'a[href="/capabilities"]':                  'Business Architecture',
  'a[href="/services"]':                      'Business Architecture',
  'a[href="/applications"]':                  'Portfolio',
  'a[href="/adrs"]':                          'Portfolio',
  '[data-nav-group="Strategy"]':              'Strategy',
  'a[href="/roadmap"]':                       'Strategy',
  '[data-nav-group="Reports"]':               'Reports',
}

/**
 * Builds the onHighlightStarted callback for a step. If the step targets a nav
 * element inside a collapsible group, the callback opens that group via the
 * global helper registered by AppShell. No-op for steps outside the nav-group
 * accordion (Dashboard, Search, role badge).
 */
function makeNavGroupOpener(elementSelector: string): (() => void) | undefined {
  const group = NAV_GROUP_FOR_SELECTOR[elementSelector]
  if (!group) return undefined
  return () => {
    const w = window as unknown as { __goveaOpenNavGroup?: (label: string) => void }
    w.__goveaOpenNavGroup?.(group)
  }
}

function buildTour(role: Role) {
  const rawSteps: DriveStep[] = [
      {
        popover: {
          title: 'Welcome to GovEA',
          description: 'GovEA is your organization\'s enterprise architecture workspace. This tour shows you where everything lives and how the pieces connect.',
          side: 'over' as const,
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard"]',
        popover: {
          title: 'Dashboard',
          description: 'See how much of your catalog is published vs. draft and where the gaps are. A good starting point before any governance review.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-nav-group="Business Architecture"]',
        popover: {
          title: 'Business Architecture',
          description: 'Document who you serve, what your organization does, and how value flows. These records anchor everything else in the catalog.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/personas"]',
        popover: {
          title: 'Personas',
          description: 'Add the people your services are built for — residents, businesses, staff, and partner agencies. Link them to capabilities and services to track who each part of your architecture serves.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/value-streams"]',
        popover: {
          title: 'Value Streams',
          description: 'Map how work moves from a triggering event to an outcome. Link stages to capabilities to see where gaps or handoff problems exist.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/capabilities"]',
        popover: {
          title: 'Capabilities',
          description: 'Record what your organization does, independent of which systems do it. Link capabilities to applications to track how each function is currently enabled.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/services"]',
        popover: {
          title: 'Services',
          description: 'Document what you deliver to the public. Link services to the personas who use them and the capabilities that power them.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/applications"]',
        popover: {
          title: 'Applications',
          description: 'Your technology inventory — lifecycle status, capability links, and the decisions behind each system. Filter by lifecycle to surface risks.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/adrs"]',
        popover: {
          title: 'Decisions',
          description: 'Record the why behind major technology choices. Superseded decisions stay visible so future teams understand the full context.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-nav-group="Strategy"]',
        popover: {
          title: 'Strategy',
          description: 'Link capabilities to objectives and running initiatives to show which parts of your architecture are connected to mission outcomes.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: 'a[href="/roadmap"]',
        popover: {
          title: 'Roadmap',
          description: 'A timeline of active and planned initiatives. Useful for stakeholder reviews and communicating what\'s changing and when.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="search"]',
        popover: {
          title: 'Search',
          description: 'Find any record across the catalog instantly. Check for existing items before creating something new to avoid duplicates.',
          side: 'bottom' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="role-badge"]',
        popover: {
          title: `Your role: ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          description: ROLE_COPY[role],
          side: 'bottom' as const,
          align: 'end',
        },
      },
    ]
  // #662 — for each step that targets a nav-group child, attach an
  // onHighlightStarted that opens the owning group via AppShell's global
  // helper. Steps outside the accordion (Dashboard, Search, role badge,
  // the welcome step) pass through unchanged.
  const steps = rawSteps.map((step) => {
    if (!('element' in step) || typeof step.element !== 'string') return step
    const opener = makeNavGroupOpener(step.element)
    return opener ? { ...step, onHighlightStarted: opener } : step
  })

  return driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    popoverClass: 'govea-tour-popover',
    steps,
  })
}

export function TourButton({ role }: { role: Role }) {
  useEffect(() => {
    // Inject subtle custom styles for the popover without fighting with driver.js defaults
    const style = document.createElement('style')
    style.id = 'govea-tour-styles'
    style.textContent = `
      .govea-tour-popover .driver-popover-title {
        font-size: 15px;
        font-weight: 600;
      }
      .govea-tour-popover .driver-popover-description {
        font-size: 13px;
        line-height: 1.5;
        color: #555;
      }
      .driver-popover-progress-text {
        font-size: 11px;
      }
    `
    if (!document.getElementById('govea-tour-styles')) {
      document.head.appendChild(style)
    }
    return () => {
      document.getElementById('govea-tour-styles')?.remove()
    }
  }, [])

  const handleClick = () => {
    const tour = buildTour(role)
    tour.drive()
  }

  return (
    <button
      onClick={handleClick}
      title="Take the tour"
      className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      Tour
    </button>
  )
}
