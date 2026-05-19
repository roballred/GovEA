# Capability: Mission-to-Technology Traceability Views

## What It Does
The system must provide stakeholder-friendly visual views that trace a mission or strategic objective down through capabilities, services, and applications so non-architect users can understand why a system exists and what outcome it supports.

Capabilities are the required bridge from mission/service context to applications. Strategic Objective and Service traces surface supporting applications through linked Capabilities rather than through direct Objective -> Application or Service -> Application links.

## Personas
- **Department Director** - needs to understand how department goals connect to systems and service delivery
- **Budget & Performance Analyst** - needs to connect investment decisions to mission outcomes and business capability coverage
- **Elected Official** - needs a concise visual explanation of what technology supports a public service or strategic goal

## Behaviors
- From a strategic objective, display linked initiatives, capabilities, and capability-derived applications in a readable visual chain
- From a capability or service, display upstream objectives and downstream applications without requiring the user to open multiple detail pages
- Show relationship labels in plain language such as `supports`, `enables`, and `changes`
- Allow the user to switch between a compact summary view and a deeper drill-down view
- Provide a printable or presentation-friendly layout suitable for briefings

## Rules
- The default visual must optimize for readability over relationship density; it is not a general-purpose graph explorer
- Viewer-visible results must respect publication and visibility rules at every step of the chain
- The visual must avoid EA jargon in headings, legends, and labels
- Missing capability links should surface as plain-language gaps because those links are now the path to supporting applications

## Implementation Status

**Shipped (v1, drill-down only — no top-level entry).** Traceability is rendered via `/traceability?from=<entityType>&id=<id>`, reachable from any capability / objective / initiative detail page via a "View traceability →" link. The view itself matches the documented behaviors. Confirmed during the Elected Official ([#546](https://github.com/roballred/GovEA/issues/546)) and Content Viewer ([#552](https://github.com/roballred/GovEA/issues/552)) persona journey audits.

Known gap: visiting `/traceability` with no query params returns 404 — there is no top-level entry surface (a hub of starting points, or a default featured trace). Tracked at [#549](https://github.com/roballred/GovEA/issues/549).

## Links
- Depends on: Front-end Display - Content Display, Front-end Display - Relationship Navigation, Repository & Modelling - End-to-End Traceability
- Related: Planning - Strategic Objectives, Planning - Initiatives, Front-end Display - Portfolio Views
