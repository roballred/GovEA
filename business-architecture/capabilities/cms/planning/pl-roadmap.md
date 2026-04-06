# Capability: Roadmap

## What It Does
The system must provide a timeline view of initiatives and their relationship to strategic objectives, allowing stakeholders to see what is planned, what is underway, and what has been delivered — and how these changes connect to the capability portfolio.

The roadmap is a view over existing planning content, not a standalone data store. It renders what is already captured in initiatives and objectives as a governed, readable timeline.

## Personas
- **Enterprise Architect (Central IT)** — reviews the enterprise initiative timeline and identifies sequencing conflicts or gaps in capability coverage
- **Agency EA Coordinator** — uses the roadmap to communicate the agency's transformation trajectory to leadership and peer agencies
- **Department Director** — primary consumer; reads the roadmap to understand what is changing and when, without needing to navigate the full architecture repository

## Behaviors
- Display initiatives on a timeline grouped by status (proposed, active, complete)
- Show the strategic objectives each initiative advances
- Show the capabilities each initiative affects, with impact label
- Filter the roadmap by status, capability, or objective
- Display start and end dates where available; display "TBD" or "ongoing" where dates are not set
- Render the roadmap from published content only — draft and archived initiatives do not appear to Viewers

## Rules
- The roadmap does not have its own data — it is a rendered view of published initiatives with planning metadata
- Only published initiatives appear in the roadmap view for Viewer-role users
- Initiatives without start/end dates appear in a "Unscheduled" section rather than being hidden
- The roadmap is read-only; editing is done through the initiatives management interface

## Implementation Status
- **v1:** Basic roadmap view implemented. Displays published initiatives grouped by status with objective and capability links. Date-based timeline rendering is deferred to a future iteration.

## Links
- Depends on: Initiatives, Strategic Objectives, Capabilities
- Related: Portfolio Views, Front-End Display
- Personas served: Enterprise Architect, Agency EA Coordinator, Department Director
