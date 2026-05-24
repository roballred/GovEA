# Capability: Front-end Display

**Scope:** v1

## What It Does
The system must present EA content to users in a way that is clear, navigable, and useful without EA training. The authenticated experience is substantial today; optional public unauthenticated publishing remains future work.

## Personas
- **Content Viewer** — the primary user of all front-end display capabilities; expects to find information quickly and trust that it is current
- **CMS Administrator** — configures public vs. authenticated access; monitors the front-end experience

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Content Display | [fd-content-display.md](./fd-content-display.md) | Render published content in plain-language, readable layouts |
| Mission-to-Technology Traceability Views | [fd-traceability-views.md](./fd-traceability-views.md) | Stakeholder-friendly visual chains from objectives and services down to supporting technology |
| Navigation | [fd-navigation.md](./fd-navigation.md) | Menus, breadcrumbs, and consistent site structure |
| Relationship Navigation | [fd-relationship-navigation.md](./fd-relationship-navigation.md) | Traverse links between applications, capabilities, and personas |
| Portfolio Views | [fd-portfolio-views.md](./fd-portfolio-views.md) | Curated overviews: capability map, application portfolio, persona directory, ADR list |
| Application Risk Portfolio View | [fd-application-risk-portfolio.md](./fd-application-risk-portfolio.md) | Visualize application lifecycle and dependency risk for leadership audiences |
| Executive Roadmap Timeline | [fd-executive-roadmap-timeline.md](./fd-executive-roadmap-timeline.md) | Leadership-friendly timeline of technology change and business impact |
| Repository Confidence Summary | [fd-repository-confidence-summary.md](./fd-repository-confidence-summary.md) | Plain-language confidence cue for how trustworthy the published repository is |
| Guided Answer Views | [fd-guided-answer-views.md](./fd-guided-answer-views.md) | Direct answer pages for stakeholder questions assembled from linked repository content |
| Responsive Layout | [fd-responsive-layout.md](./fd-responsive-layout.md) | Works on any device without horizontal scrolling or zooming |
| Public & Authenticated Views | [fd-public-authenticated-views.md](./fd-public-authenticated-views.md) | Control what requires login vs. what is publicly accessible |
| Theming | [fd-theming.md](./fd-theming.md) | Theme selection, agency branding, and content rendering customization |

## Success Criteria

The following outcomes indicate Front-end Display is working well for a 1–3 person government IT department 6 months after deployment:

- A department head can answer "what applications support the permitting process?" by navigating from a capability to its linked applications — without asking IT
- A stakeholder can open a traceability view from an objective, capability, or service and understand the supporting architecture without needing a separate walkthrough
- A Viewer who has never used GovEA before can find a specific application record within 2 minutes using search or navigation, without a manual
- A Contributor can maintain links between related records directly from the relevant detail page without returning to a separate list view
- Content reads as plain English to a non-technical audience — no EA jargon appears in labels, headings, or body copy (see [fd-content-display.md](./fd-content-display.md) for the jargon avoidance standard)
- Published dates are visible on all content so Viewers can assess freshness without contacting the author
- The front end loads and is fully readable without JavaScript enabled

## Rules
- Viewer-visible content follows the published-content rule for core workflow-governed records, plus the explicit ADR and initiative visibility mappings defined in Content Workflow
- Core content must render without JavaScript — progressive enhancement only
- Front-end display must be usable by non-technical users without training

## Implementation Status
Shipped (v1, partial). All authenticated viewer surfaces ship: content detail pages, navigation, relationship navigation, portfolio and traceability views, application risk portfolio (#608 dependency-impact), executive roadmap, repository confidence summary, guided answers, responsive layout, and theming. Print/export-ready output landed under #618. Public unauthenticated access (#547) and a role-tailored landing for Viewers (#548) remain follow-up work under the viewer-experience epic (#556).

## Links
- Depends on: IAM, Content Management
