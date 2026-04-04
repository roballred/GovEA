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

### Application Portfolio
- Display all applications with lifecycle status prominently (Current, Aging, Sunset, Decommissioned, Planned)
- Allow filtering by lifecycle status, hosting model, and owning department
- Show business criticality and technical debt score
- Link each application to its detail page

### Persona Directory
- Display all personas grouped by role type (Citizen, Staff, Elected, External)
- Show each persona's name and critical insight summary
- Link each persona to their detail page

### ADR List
- Display all Architecture Decision Records with status (Proposed, Accepted, Deprecated, Superseded)
- Allow filtering by status and affected capability
- Show decision title and date
- Link each ADR to its detail page

## Rules
- Portfolio views show published content only
- Views must be useful without EA training — labels, groupings, and filters use plain language
- All portfolio views must be accessible without JavaScript

## Links
- Depends on: Content Display, Relationship Navigation, Content Management — Content Workflow
- Related: Navigation, Responsive Layout
