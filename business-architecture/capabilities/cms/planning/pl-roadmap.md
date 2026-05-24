# Capability: Roadmap

## What It Does
The system must provide a roadmap view of initiatives and their relationship to strategic objectives, allowing stakeholders to see what is planned, what is underway, and what has been delivered — and how these changes connect to the capability portfolio.

The roadmap is a view over existing planning content, not a standalone data store. It renders what is already captured in initiatives and objectives as a readable planning view.

## Personas
- **Enterprise Architect (Central IT)** — reviews the enterprise initiative timeline and identifies sequencing conflicts or gaps in capability coverage
- **Agency EA Coordinator** — uses the roadmap to communicate the agency's transformation trajectory to leadership and peer agencies
- **Department Director** — primary consumer; reads the roadmap to understand what is changing and when, without needing to navigate the full architecture repository

## Behaviors
- Display initiatives grouped by planning status
- Show the strategic objectives each initiative advances
- Show the capabilities each initiative affects, with impact label
- Display start and end dates where available
- Render the roadmap directly from initiative records and their planning metadata

## Rules
- The roadmap does not have its own data — it is a rendered view of initiatives with planning metadata
- The current v1 roadmap groups initiatives by planning status, not by a richer date-based timeline model
- Initiatives without start/end dates are still shown; dates are additive metadata rather than a requirement for roadmap visibility
- The roadmap is read-only; editing is done through the initiatives management interface

## Implementation Status
- **v1:** Basic roadmap view implemented. Displays initiatives grouped by planning status with objective and capability links. Richer date-based timeline rendering, filtering, and scheduling semantics are deferred to a future iteration.

## Links
- Depends on: Initiatives, Strategic Objectives, Capabilities
- Related: Portfolio Views, Front-End Display
