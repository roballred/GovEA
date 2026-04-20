# Capability: Executive Roadmap Timeline

## What It Does
The system must present a roadmap timeline view that shows what is changing, when it is expected to happen, and which strategic objectives, capabilities, and services are affected, using a visual format suitable for leadership review.

## Personas
- **Department Director** — needs to see what is changing in their area and when
- **Budget & Performance Analyst** — needs to compare planned investment timing against risk and strategic priorities
- **Elected Official** — needs a clear visual timeline of technology change with plain-language impact statements

## Behaviors
- Display initiatives on a timeline using start and end dates where available
- Group or filter the timeline by department, strategic objective, capability domain, or service area
- Show a short plain-language impact summary for each initiative
- Distinguish `planned`, `underway`, `at risk`, and `completed` states visually
- Allow drill-down from a timeline item to its linked objective, capabilities, and applications

## Rules
- The roadmap must remain useful when dates are partial or approximate; missing dates should degrade gracefully rather than hide the initiative
- Timeline labels must describe business impact, not just internal initiative names
- The visual should prioritize sequencing and stakeholder impact over detailed project-management semantics
- Viewer-visible items must follow the current planning visibility rules for initiatives and objectives

## Links
- Depends on: Planning — Roadmap, Planning — Initiatives, Planning — Strategic Objectives
- Related: Mission-to-Technology Traceability Views, Front-end Display — Portfolio Views
