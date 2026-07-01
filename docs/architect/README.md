# GovEA Application Architecture

This folder captures the current application architecture for GovEA. It serves two audiences: architects evaluating GovEA for their organization, and maintainers, contributors, and reviewers who need to understand how the product is assembled before changing it.

**The shape in thirty seconds:** GovEA is a server-rendered Next.js application over PostgreSQL, deployed as a single container. Multi-tenancy is enforced at the application layer — every content record is scoped to an organization, users hold per-organization roles, and cross-organization behavior is explicit and approval-based. Every security-relevant mutation writes to an audit log that a database trigger makes append-only. There is no microservice topology, no message bus, and no client-side data authority; that simplicity is deliberate, chosen so government teams can self-host and reason about the system without a platform team.

These documents are implementation-facing. Product intent, personas, and capability definitions remain in `business-architecture/`; schema detail remains in `docs/data-model.md`. Significant decisions and their tradeoffs are recorded as ADRs under [`docs/decisions/`](../decisions/).

## Documents

| Document | Purpose |
|---|---|
| [Application Overview](./application-overview.md) | High-level application shape, module boundaries, and request flow |
| [Security and Tenancy](./security-and-tenancy.md) | Authentication, authorization, organization isolation, federation, and support access |
| [Data and Traceability](./data-and-traceability.md) | Core repository model, relationship patterns, and traceability conventions |
| [Runtime and Deployment](./runtime-and-deployment.md) | Local runtime, container runtime, Azure demo deployment, and operational notes |

## Maintenance Rule

Update these docs when a change alters one of the main architectural seams:

- routing or shell layout
- authentication or role behavior
- tenancy, visibility, federation, or support-access rules
- data model relationships or traceability rules
- runtime, container, or deployment behavior
- cross-cutting concerns such as audit, taxonomy, module toggles, or search

These docs do not replace ADRs. If a change records a decision or tradeoff that should remain reviewable over time, add or update an ADR under `docs/decisions/` and link to it from the relevant architecture document.

**Last full review:** 2026-06-12 (#792) — covered the multi-org membership model, the session/middleware rewrite (ADR-0003), taxonomy recipes, audit telemetry, and the db:push runtime policy. Update this line when the next full review lands.
