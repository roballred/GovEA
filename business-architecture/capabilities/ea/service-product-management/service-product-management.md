# Capability: Service Product Management

**Scope:** v2

## What It Does

Government services outlive the projects that build them — but most agencies manage them as projects anyway: funded to build, documented at go-live, then run on institutional memory until something breaks. This capability group lets an organization manage its services **as products**: each service has a position in a lifecycle, an accountable owner, outcomes it is measured against, an evidence trail from user research, and a portfolio-level health view that makes the whole service estate legible to leadership.

The product **is** the service. This group adds no new entity type — it adds product practice to the existing Services entity (see [po-services](../../cms/portfolio/po-services.md)), reusing GovEA's existing machinery: lifecycle stages install as taxonomy via the recipe engine, outcomes follow the scorecard patterns, discovery builds on the persona junctions services already have.

## Personas

- **Service Owner** — lives in this group; the service record becomes the artifact they run their service with
- **Agency EA Coordinator** — connects service product data to the rest of the architecture repository; uses portfolio health to focus attention
- **Department Director** — reads lifecycle and outcome summaries to make investment decisions in plain language
- **Elected Official** — sees what services exist, who they serve, and whether they are working — without EA vocabulary

> ⚠️ All four personas are **Assumed**, and Service Owner was drafted specifically for this group. Per Standards.md, capabilities here may be designed but must not drive implementation until a real service owner or product manager validates the underlying need (#668 — this group is strong material for the first Tier-1 interview).

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Product Lifecycle | [spm-product-lifecycle.md](./spm-product-lifecycle.md) | Services carry an explicit lifecycle stage (discovery → live → retired), distinct from content workflow status |
| Service Ownership | [spm-service-ownership.md](./spm-service-ownership.md) | Structured, accountable ownership replacing the free-text owner field; succession without knowledge loss |
| Outcome Measurement | [spm-outcome-measurement.md](./spm-outcome-measurement.md) | Agreed outcomes per service with plain-language health reporting |
| Continuous Discovery | [spm-continuous-discovery.md](./spm-continuous-discovery.md) | User-research evidence linked to the service record via personas and feedback |
| Service Portfolio Health | [spm-service-portfolio-health.md](./spm-service-portfolio-health.md) | Portfolio-level view: lifecycle distribution, ownerless services, stale outcomes |

## Design Principle

A service record that the Service Owner maintains for their own accountability stays current; a service record maintained for the architects' benefit goes stale. Every capability in this group must make the owner's existing job easier — budget conversations, performance reviews, succession — or it will not be adopted.

## Out of Scope

| Capability | Rationale |
|---|---|
| Delivery/backlog management | GovEA is not a work tracker. Initiatives link funded change to services; sprint-level work stays in the agency's delivery tools (future DevOps integration, int-devops, is the bridge) |
| Service desk / ticketing | Operational incidents belong to ITSM (int-itsm-cmdb). This group is about the service's life, not its tickets |
| Citizen-facing service catalogs | Publishing a public service directory is a frontend-display concern; this group manages the practice behind it |

## Success Criteria

- A Service Owner can answer "where is my service in its life, who owns it, and how is it doing?" from the service record alone
- "Who owns this service?" has a structured answer for every live service; ownerless services are visible, not invisible
- A Department Director can read a service portfolio summary without EA vocabulary and see where attention is needed
- Lifecycle, ownership, and outcome data flows into existing traceability and reports rather than creating a parallel surface

## Rules

- The Service entity is the product — no parallel Product entity, no duplicate records
- Lifecycle stage is orthogonal to content workflow status (a *draft record* can describe a *live service*)
- Nothing in this group auto-mutates service records; owners assert lifecycle and outcomes, the system surfaces staleness
- All data respects existing RBAC, workflow, visibility, and federation rules — portfolio health never leaks org-private services

## Implementation Status

**Planned — documentation only.** The Services entity itself is shipped (CRUD, channels, free-text owner, junctions to capabilities/personas/value streams, traceability roots — see po-services). None of the product-practice capabilities in this group exist in the product. Design questions to resolve before implementation, in a follow-up design slice gated on persona validation (#668):

- Lifecycle stages as an org taxonomy installed via the recipe engine (#671's install machinery) vs a fixed enum — recipe-backed is the working assumption (GDS-style stages as a starter recipe, org-customizable)
- Structured owner: user reference vs role reference, and what happens when the user leaves (succession)
- Initiative ↔ service linkage (initiatives currently link to capabilities and objectives only)
- Outcome records: follow the completeness-signals/scorecard pattern (#380, #573) vs a dedicated metrics design; budget linkage waits on #563
- Reconcile with the open modeling efforts in the same neighborhood — #694 (value chains) and #697 (Strategy entity) — before any schema work, so the three designs land as one model

## Links

- Depends on: Portfolio — Services (po-services), Planning — Initiatives (pl-initiatives), IAM — Role-Based Access Control
- Enables: Frontend Display — Traceability Views, Repository — Completeness signals, future public service catalog work
- Related: Integration (int-devops, int-itsm-cmdb), Planning — Roadmap (pl-roadmap), EA Adoption & Engagement (#71)
