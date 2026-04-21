# Capability: Mission-to-Technology Traceability Views

## What It Does
The system must provide stakeholder-friendly visual views that trace a mission or strategic objective down through capabilities, services, and applications so non-architect users can understand why a system exists and what outcome it supports.

## Personas
- **Department Director** — needs to understand how department goals connect to systems and service delivery
- **Budget & Performance Analyst** — needs to connect investment decisions to mission outcomes and business capability coverage
- **Elected Official** — needs a concise visual explanation of what technology supports a public service or strategic goal

## Behaviors
- From a strategic objective, display linked initiatives, capabilities, services, and applications in a readable visual chain
- From a capability or service, display upstream objectives and downstream applications without requiring the user to open multiple detail pages
- Show relationship labels in plain language such as `supports`, `enables`, and `changes`
- Allow the user to switch between a compact summary view and a deeper drill-down view
- Provide a printable or presentation-friendly layout suitable for briefings

## Rules
- The default visual must optimize for readability over relationship density; it is not a general-purpose graph explorer
- Viewer-visible results must respect publication and visibility rules at every step of the chain
- The visual must avoid EA jargon in headings, legends, and labels
- Missing links should surface as plain-language gaps such as `No supporting applications recorded yet`

## Links
- Depends on: Front-end Display — Content Display, Front-end Display — Relationship Navigation, Repository & Modelling — End-to-End Traceability
- Related: Planning — Strategic Objectives, Planning — Initiatives, Front-end Display — Portfolio Views
