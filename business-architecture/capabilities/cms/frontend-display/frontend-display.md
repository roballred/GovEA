# Capability: Front-end Display

## What It Does
The system must present EA content to users in a way that is clear, navigable, and useful without EA training. The authenticated experience is substantial today; optional public unauthenticated publishing remains future work.

## Personas
- **Content Viewer** — the primary user of all front-end display capabilities; expects to find information quickly and trust that it is current
- **CMS Administrator** — configures public vs. authenticated access; monitors the front-end experience

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Content Display | [fd-content-display.md](./fd-content-display.md) | Render published content in plain-language, readable layouts |
| Mission-to-Technology Traceability Views | [fd-traceability-views.md](./fd-traceability-views.md) | Read-only layered trace views from objectives, capabilities, and services to supporting technology |
| Navigation | [fd-navigation.md](./fd-navigation.md) | Menus, breadcrumbs, and consistent site structure |
| Relationship Navigation | [fd-relationship-navigation.md](./fd-relationship-navigation.md) | Traverse links between applications, capabilities, and personas |
| Portfolio Views | [fd-portfolio-views.md](./fd-portfolio-views.md) | Curated overviews: capability map, application portfolio, persona directory, ADR list |
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
- Only published content is ever visible to Viewers — workflow state is the gate
- Core content must render without JavaScript — progressive enhancement only
- Front-end display must be usable by non-technical users without training

## Links
- Depends on: IAM, Content Management
