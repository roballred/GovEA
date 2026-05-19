# Capability: Portfolio Views

## What It Does
The system must provide curated, structured views of the EA repository that give users a meaningful overview — not just a flat list of content items. Each view is tailored to its content type and the questions viewers typically ask.

## Personas
- **Content Viewer** — uses portfolio views as the primary entry point to understand the organization's EA landscape

## Behaviors

### Capability Map
- Display capabilities organized hierarchically by domain
- Show strategic importance and maturity level for each capability
- Allow filtering by domain
- Link each capability to its detail page
- Surface linked personas, applications, principles, and decisions from the detail context

### Application Portfolio
- Display all applications with lifecycle status prominently (Current, Aging, Sunset, Decommissioned, Planned)
- Allow filtering by lifecycle status, hosting model, and owning department
- Show business criticality and technical debt score
- Link each application to its detail page
- Surface linked capabilities from the detail context

### Persona Directory
- Display all personas grouped by role type (Citizen, Staff, Elected, External)
- Show each persona's name and critical insight summary
- Link each persona to their detail page
- Allow permitted users to update persona content from the detail page without returning to the table dialog flow

### ADR List
- Display all Architecture Decision Records with status (Proposed, Accepted, Deprecated, Superseded)
- Allow filtering by status and affected capability
- Show decision title and date
- Link each ADR to its detail page

### Other Shipped Detail Views
- Strategic objectives, initiatives, value streams, and principles each have dedicated detail pages with linked-record navigation
- Detail pages are the primary place to understand and, where permitted, maintain cross-entity relationships

## Rules
- Portfolio views show viewer-visible content only: published core content plus ADR and initiative records allowed by the Content Workflow visibility mappings
- Views must be useful without EA training — labels, groupings, and filters use plain language
- Navigation into portfolio views must be accessible without JavaScript

## Implementation Status

**Shipped (v1).** Application portfolio view at `/applications` (Portfolio toggle) renders the documented plain-language risk cards (e.g. "N applications retiring while still supporting active capabilities — review or re-map before decommission"). Executive Summary tile at `/executive` aggregates portfolio counts and surfaces coverage gaps. Confirmed during the Elected Official ([#546](https://github.com/roballred/GovEA/issues/546)), Department Director ([#557](https://github.com/roballred/GovEA/issues/557)), and Budget & Performance Analyst ([#562](https://github.com/roballred/GovEA/issues/562)) persona journey audits.

Future work: financial / investment dimensions on the portfolio view ([#563](https://github.com/roballred/GovEA/issues/563)), print / presentation-ready export ([#559](https://github.com/roballred/GovEA/issues/559)), duplicate-application detection ([#538](https://github.com/roballred/GovEA/issues/538) covers the related capability concern).

## Links
- Depends on: Content Display, Relationship Navigation, Content Management — Content Workflow
- Related: Navigation, Responsive Layout
