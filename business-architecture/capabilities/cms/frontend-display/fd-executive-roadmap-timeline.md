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

## Implementation Status

**Shipped (v1).** `/roadmap` renders the documented timeline view with Timeline / Grid toggle, plain-language impact statements per initiative, status badges (Underway / Complete / planned), time-window labels (e.g. "Q1 FY2026 → Q4 FY2026"), linked capabilities with impact type (improve / extend), and the strategic objective each initiative serves. Confidence badge is rendered consistently across reader surfaces. Confirmed during the Elected Official ([#546](https://github.com/roballred/GovEA/issues/546)) and Department Director ([#557](https://github.com/roballred/GovEA/issues/557)) persona journey audits.

Future work: department / domain / capability-domain / service-area filtering ([#549](https://github.com/roballred/GovEA/issues/549) covers the related traceability hub gap that would feed this), risk-vs-investment framing ([#563](https://github.com/roballred/GovEA/issues/563) covers the financial-dimension prerequisite), print / presentation-ready export ([#559](https://github.com/roballred/GovEA/issues/559)).

## Links
- Depends on: Planning — Roadmap, Planning — Initiatives, Planning — Strategic Objectives
- Related: Mission-to-Technology Traceability Views, Front-end Display — Portfolio Views
