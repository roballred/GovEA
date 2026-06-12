# Capability: Services

## What It Does

The system must allow organizations to catalog the services they deliver — public-facing or internal — and connect each service to the capabilities it realizes, the personas it serves, and the value streams it participates in. Services are the repository's bridge between what constituents experience and the architecture underneath it.

This file documents the shipped service *record*; the practice of managing services as products (lifecycle, structured ownership, outcomes, discovery) is the [Service Product Management](../../ea/service-product-management/service-product-management.md) group, which builds on this capability.

## Personas

- **Agency EA Coordinator** — catalogs services and keeps their architecture links current
- **Service Owner** — the accountable party the record names (free-text today; structured ownership is spm-service-ownership)
- **Department Director** — reads the service catalog to see what their organization delivers and to whom
- **Content Viewer** — browses published services and follows their relationships

## Behaviors

- Create, edit, publish, and archive service records with name, description, owner (free text), and delivery channels (online, in-person, phone, mobile)
- Link services to the capabilities they realize, the personas they serve, and the value streams they participate in (many-to-many junctions)
- Trace from a service through its relationships — services are native traceability roots with a `View traceability →` entry point on the detail page
- Federate like other portfolio content: org-scoped by default, with instance-visible sharing per the cross-org visibility rules

## Rules

- Services follow the standard content workflow (draft → published → archived) and visibility model; viewers see published content only
- Service relationships obey the same cross-org link validation as other junctions — no links across org-private boundaries
- The owner field is informational free text in the shipped product; it confers no permissions

## Implementation Status

**Shipped (v1).** Service CRUD with channels and free-text owner, capability/persona/value-stream junctions, workflow + visibility + federation, and native traceability roots are all in place. Not yet implemented: CSV round-trip for services (#748), structured ownership, lifecycle, and the rest of the product-practice layer (see ea/service-product-management — all *Not implemented*).

## Links

- Depends on: IAM — Role-Based Access Control, Content Management workflow conventions
- Enables: Service Product Management (ea/service-product-management), Value Streams (po-value-streams), Traceability Views (fd-traceability-views)
- Related: Capability Map (po-capability-map), Application Portfolio (po-application-portfolio)
