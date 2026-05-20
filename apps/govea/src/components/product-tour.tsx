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
        element: '[data-tour="nav-business-arch"]',
        popover: {
          title: 'Business Architecture',
          description: 'Document who you serve, what your organization does, and how value flows. These records anchor everything else in the catalog.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-personas"]',
        popover: {
          title: 'Personas',
          description: 'Add the people your services are built for — residents, businesses, staff, and partner agencies. Link them to capabilities and services to track who each part of your architecture serves.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-value-streams"]',
        popover: {
          title: 'Value Streams',
          description: 'Map how work moves from a triggering event to an outcome. Link stages to capabilities to see where gaps or handoff problems exist.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-capabilities"]',
        popover: {
          title: 'Capabilities',
          description: 'Record what your organization does, independent of which systems do it. Link capabilities to applications to track how each function is currently enabled.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-services"]',
        popover: {
          title: 'Services',
          description: 'Document what you deliver to the public. Link services to the personas who use them and the capabilities that power them.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-applications"]',
        popover: {
          title: 'Applications',
          description: 'Your technology inventory — lifecycle status, capability links, and the decisions behind each system. Filter by lifecycle to surface risks.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-adrs"]',
        popover: {
          title: 'Decisions',
          description: 'Record the why behind major technology choices. Superseded decisions stay visible so future teams understand the full context.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-strategy"]',
        popover: {
          title: 'Strategy',
          description: 'Link capabilities to objectives and running initiatives to show which parts of your architecture are connected to mission outcomes.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-roadmap"]',
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
