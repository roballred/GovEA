# Capability Group: Portfolio Management

## What It Does
The system must allow contributors to maintain a structured inventory of the organization's applications, business capabilities, architecture decisions, and supporting reference content. Portfolio management is the authoring side — contributors create and update records; viewers consume them through portfolio views on the front end.

## Personas
- **CMS Contributor** — creates and maintains portfolio records
- **CMS Administrator** — has all Contributor permissions; manages visibility and lifecycle
- **Content Viewer** — reads published portfolio content through front-end views
- **Department Director** — reads portfolio views to inform investment and planning decisions

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Application Portfolio | [po-application-portfolio.md](./po-application-portfolio.md) | Manage applications with lifecycle status and capability links |
| Capability Map | [po-capability-map.md](./po-capability-map.md) | Define business capabilities organized by domain, linked to applications and personas |
| Architecture Decision Records | [po-architecture-decisions.md](./po-architecture-decisions.md) | Record, track, and supersede architecture decisions |
| Principles | [po-principles.md](./po-principles.md) | Capture architecture principles and link them to capabilities and decisions |
| Glossary | [po-glossary.md](./po-glossary.md) | Maintain shared terminology to support consistent EA language across the repository |

## Rules
- Portfolio records follow the standard content workflow: draft → published → archived
- Only published records are visible to Content Viewers and Department Directors
- Every application must link to at least one capability — this is a data integrity rule enforced at the application layer
- Visibility controls (org / connections / instance) apply to all portfolio record types

## Links
- Related: Frontend Display — Portfolio Views, Planning, Content Management
