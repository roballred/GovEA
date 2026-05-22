# Capability: Initiatives

## What It Does
The system must allow organizations to document change programmes (initiatives, projects, programmes), link them to the capabilities they affect and the objectives they advance, and track their status and timeline. This makes the connection between investment decisions and the architecture they change explicit and visible. In the shipped product, initiatives are planning records, not workflow-governed content items.

## Personas
- **Enterprise Architect (Central IT)** — tracks enterprise-level programmes and their impact on the enterprise capability portfolio
- **Agency EA Coordinator** — maintains the agency's initiative register and links each initiative to the capabilities it builds, changes, or retires
- **Department Director** — views the initiative portfolio to understand what is underway, what capabilities are being built, and how initiatives connect to strategic objectives

## Behaviors
- Create an initiative with name, description, status, start date, end date, and organization
- Link an initiative to one or more capabilities with an impact label (builds, enhances, retires, depends-on)
- Link an initiative to one or more strategic objectives
- View which capabilities an initiative affects and in what way
- View which initiatives are advancing a given objective
- View which initiatives affect a given capability
- Track initiative status through its lifecycle (proposed, active, on-hold, complete, cancelled)
- Display initiatives in roadmap and planning views using their planning status and dates
- Share initiatives across federation scopes using visibility settings (`org`, `connections`, `instance`)

## Rules
- An initiative must belong to an organization
- Initiatives follow the planning lifecycle documented here: proposed, active, on-hold, complete, cancelled
- Initiatives do not use the standard content workflow (`draft`, `published`, `archived`)
- An initiative with no linked capabilities is architecturally incomplete — this should surface as a completeness signal in the admin dashboard
- Impact labels on capability links are optional but recommended; they communicate whether the initiative is building new capability or changing existing capability
- Viewer access is not currently driven by a published-only planning workflow; admin surfaces render initiatives based on auth, organization, federation visibility, and route access rules

## Implementation Status
Shipped (v1). Initiative CRUD with planning lifecycle states, capability and objective linking with impact labels, roadmap visualization, cross-org federation, and a cross-initiative overlap/conflict view (#602) are all in place.

## Links
- Depends on: Content Management — Content Workflow, Content Relationships
- Related: Strategic Objectives, Capabilities, Roadmap
