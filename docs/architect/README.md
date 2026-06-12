# GovEA Application Architecture

This folder captures the current application architecture for GovEA. It is intended for maintainers, contributors, and reviewers who need to understand how the product is assembled before changing it.

These documents are implementation-facing. Product intent, personas, and capability definitions remain in `business-architecture/`; schema detail remains in `docs/data-model.md`.

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
