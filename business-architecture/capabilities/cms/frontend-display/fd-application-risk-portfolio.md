# Capability: Application Risk Portfolio View

## What It Does
The system must provide a visual portfolio view that helps stakeholders identify which applications are aging, business-critical, duplicated, or likely to require investment attention soon.

## Personas
- **Department Director** — needs to understand which systems create operational risk for their department
- **Budget & Performance Analyst** — needs a portfolio-level picture of where technology risk is likely to drive cost or service disruption
- **Enterprise Architect** — needs a credible visual to explain application risk and rationalisation priorities to leadership

## Behaviors
- Display applications in a visual portfolio view using lifecycle status, criticality, dependency concentration, or equivalent risk cues
- Allow filtering by department, domain, hosting model, or lifecycle status
- Highlight applications with sunset or decommission status that still support important capabilities or services
- Surface duplicate or overlapping applications where they serve the same capability area
- Allow drill-down from a portfolio cell or card into the application record and linked capabilities

## Rules
- The primary view must communicate risk and investment posture, not just inventory size
- Risk cues must use plain-language labels and intuitive color/status treatment
- The visual must not imply precision the repository does not support; any derived score should be explainable
- Viewer-facing output should emphasize operational meaning such as `aging`, `replacement underway`, or `high dependency`

## Implementation Status

- **v1:** Implemented as a Portfolio view on the Applications page. It uses existing lifecycle and capability-link data to surface retiring systems, no-capability-link records, and cleaner portfolio cards for leadership-style review.
- Duplicate-detection, richer scoring, and deeper modernization analysis remain future work.

## Links
- Depends on: Portfolio Management — Application Portfolio, Front-end Display — Portfolio Views
- Related: Planning — Initiatives, Repository & Modelling — Repository Completeness
