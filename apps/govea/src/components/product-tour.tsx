'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Role } from '@/lib/rbac'

const ROLE_COPY: Record<Role, string> = {
  admin:       'As an Admin, you can create and edit all EA content and manage users, connections, and org settings.',
  contributor: 'As a Contributor, you can create and edit all EA content. Set items to Published to make them visible to read-only colleagues.',
  viewer:      'As a Viewer, you have read-only access to published content across the catalog.',
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
          description: 'Your organization\'s enterprise architecture workspace — built for state and local government teams using the EasyEA methodology. This tour walks you through the key sections and what makes GovEA different.',
          side: 'over' as const,
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard"]',
        popover: {
          title: 'Dashboard — Your EA Health Check',
          description: 'See catalog coverage at a glance: how many items are published vs. draft, review health scores, and recent activity. Before any ARB meeting, this is the first place to check — it shows you exactly where your gaps are.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-business-arch"]',
        popover: {
          title: 'Business Architecture — Start Here',
          description: 'The foundation of EasyEA. Document who you serve, what you deliver, what your organization does, and how value flows. Everything in your portfolio — every application, every decision — connects back to this layer.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-personas"]',
        popover: {
          title: 'Personas — People Before Systems',
          description: 'Personas represent everyone who interacts with government: residents, businesses, internal staff, and partner agencies. In EasyEA, you start here — not with technology. Every service, capability, and application you catalog should ultimately trace to a person it serves.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-value-streams"]',
        popover: {
          title: 'Value Streams — How Work Flows',
          description: 'Model the end-to-end flow of value from a triggering event to an outcome. Each stage maps to the capabilities that enable it. This is how you find redundancies, handoff gaps, and the real cost of legacy systems — before you try to replace them.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-capabilities"]',
        popover: {
          title: 'Capabilities — What Your Organization Does',
          description: 'Capabilities are technology-agnostic. "Process Permit Applications" is a capability — the system that does it today is just an implementation detail. This separation lets you plan replacements, measure coverage, and survive application turnover without losing institutional knowledge.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-services"]',
        popover: {
          title: 'Services — What You Deliver to the Public',
          description: 'Services are the tangible things residents and businesses interact with — permitting, licensing, benefits enrollment. Link them to the personas who use them and the capabilities that power them to build a complete picture of government service delivery.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-applications"]',
        popover: {
          title: 'Applications — Your Technology Portfolio',
          description: 'Track every application with its lifecycle status (active, sunset, or decommissioned), the capabilities it supports, and the decisions made about it. When leadership asks "why are we still running this?" — the answer is here.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-adrs"]',
        popover: {
          title: 'Decisions — Institutional Memory',
          description: 'Architecture Decision Records (ADRs) capture the "why" behind every major technical choice — not just what was decided, but the context, constraints, and alternatives considered. Future teams won\'t repeat past mistakes if the reasoning is documented here.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-strategy"]',
        popover: {
          title: 'Strategy — Mission to Technology',
          description: 'Connect your architecture to mission. Link capabilities to strategic objectives and running initiatives. This is how you justify every system you operate — and surface the ones you can\'t justify. Essential for budget season and IT governance reviews.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-roadmap"]',
        popover: {
          title: 'Roadmap — The Executive View',
          description: 'A visual timeline of active initiatives and planned changes. Built for elected officials and non-technical stakeholders who need to see what\'s changing, when, and why — without reading a 40-page strategy document.',
          side: 'right' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="search"]',
        popover: {
          title: 'Search Everything',
          description: 'Find any persona, capability, application, decision, or principle across your catalog instantly. Especially useful when linking items — check for duplicates before creating something new, and discover connections you didn\'t know existed.',
          side: 'bottom' as const,
          align: 'start',
        },
      },
      {
        element: '[data-tour="role-badge"]',
        popover: {
          title: `Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`,
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
