# Capability: Portfolio Management

**Scope:** v1

## What It Does
The system must allow contributors to maintain a structured inventory of the organization's applications, business capabilities, architecture decisions, and supporting reference content. Portfolio management is the authoring side — contributors create and update records; viewers consume them through portfolio views on the front end.

## Personas
- **Enterprise Architect (Central IT)** — owns the portfolio at the enterprise level; uses it to model the organization-wide application, capability, and decision landscape
- **Agency EA Coordinator** — maintains their agency's portfolio as a sub-set of the enterprise view
- **Department Director** — reads portfolio views to inform investment and planning decisions
- **Business Stakeholder** — references published portfolio content to understand what the organization can do and what's planned

> RBAC roles (Admin / Contributor / Viewer) are not personas — they describe access, not people. Role behavior is documented in [`iam-role-based-access-control.md`](../iam/iam-role-based-access-control.md) and reflected in each sub-capability's `## Rules` block.

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Application Portfolio | [po-application-portfolio.md](./po-application-portfolio.md) | Manage applications with lifecycle status and capability links |
| Capability Map | [po-capability-map.md](./po-capability-map.md) | Define business capabilities organized by domain, linked to applications and personas |
| Architecture Decision Records | [po-architecture-decisions.md](./po-architecture-decisions.md) | Record, track, and supersede architecture decisions |
| Principles | [po-principles.md](./po-principles.md) | Capture architecture principles and link them to capabilities and decisions |
| Glossary | [po-glossary.md](./po-glossary.md) | Maintain shared terminology to support consistent EA language across the repository |
| Services | [po-services.md](./po-services.md) | Catalog delivered services with channels and ownership, linked to capabilities, personas, and value streams |
| Value Streams | [po-value-streams.md](./po-value-streams.md) | Define value streams with ordered stages; link stages to capabilities and link streams to personas, objectives, and services |

## Rules
- Portfolio records follow the standard content workflow: draft → published → archived
- Only published records are visible to Content Viewers and Department Directors
- Every application must link to at least one capability — this is a data integrity rule enforced at the application layer
- Visibility controls (org / connections / instance) apply to all portfolio record types

## Success Criteria

- A contributor can author an application, capability, persona, value stream, principle, or glossary term through the same authoring conventions and see it on the matching list and detail pages
- The Application → Capability → Persona chain is enforced at publish time so the repository never carries orphan applications or capability rows without persona context
- Domain Director and Content Viewer audiences can navigate the published portfolio through the frontend without admin access
- Cross-org link semantics on capabilities and personas preserve source-org ownership while exposing inbound attribution to the target org
- A new content type joins the portfolio by following the same authoring + relationship + workflow conventions, not by hand-built scaffolding (Services did exactly this — see po-services.md)

## Implementation Status
Portfolio Management is one of GovEA's strongest shipped areas. Applications, capabilities, personas, services, value streams, principles, and glossary content all have meaningful day-to-day product surface today.

ADRs are real and usable, but they are not yet as mature as the rest of the portfolio layer. Schema support, linking, list/detail pages, and basic CRUD exist; richer authoring polish, analytics, and broader decision-support workflows still need work. For that reason this group should currently be described as partially implemented overall, not fully implemented.

## Links
- Related: Frontend Display — Portfolio Views, Planning, Content Management
