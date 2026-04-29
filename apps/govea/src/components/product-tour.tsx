'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Role } from '@/lib/rbac'

const ROLE_COPY: Record<Role, string> = {
  admin:       'You can create, edit, and publish all EA content, and manage users, connections, and org settings.',
  contributor: 'You can create and edit all EA content. Publish items to make them visible to Viewer-role colleagues.',
  viewer:      'You have read-only access to published content across the catalog.',
}

function buildTour(role: Role) {
  return driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    popoverClass: 'govea-tour-popover',
    steps: [
      {
        popover: {
          title: 'Welcome to GovEA',
          description: 'GovEA is your organization\'s architecture repository, planning, and reporting workspace. This tour shows you where the core sections live and how they fit together.',
          side: 'over' as const,
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard"]',
        popover: {
          title: 'Dashboard',
          description: 'Check catalog coverage, review draft content, and see recent activity. A useful first stop before any planning or governance review.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-personas"]',
        popover: {
          title: 'Personas',
          description: 'Capture who your organization serves or supports — residents, staff, partner agencies, and others. Linking personas to capabilities and services keeps the architecture grounded in real users.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-capabilities"]',
        popover: {
          title: 'Capabilities',
          description: 'Define what your organization needs to do, independent of which systems do it. Capabilities are the main organizing layer — everything else links back to them.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-applications"]',
        popover: {
          title: 'Applications',
          description: 'Track which systems support which capabilities, and manage lifecycle and portfolio decisions. Filter by lifecycle status to surface risk.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-strategy"]',
        popover: {
          title: 'Strategy',
          description: 'Connect capabilities and applications to strategic objectives and active initiatives. This is how you show what the architecture is doing for the mission.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-roadmap"]',
        popover: {
          title: 'Roadmap',
          description: 'See planned and active initiatives on a timeline. Useful for leadership conversations about what\'s changing and when.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-reports"]',
        popover: {
          title: 'Reports',
          description: 'Turn your repository content into outputs for leadership and planning conversations — architecture vision, portfolio health, and executive summaries.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="search"]',
        popover: {
          title: 'Search',
          description: 'Find any record across the catalog and follow links between related items. Check here before creating something new to avoid duplicates.',
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
    ],
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
