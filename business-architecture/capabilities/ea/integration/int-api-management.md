# Capability: API Management Platform Integration

## What It Does

The system must surface integration architecture — which systems expose APIs, which consume them, and what contracts govern the exchange — by connecting to the API management platforms where that information is already maintained. Architects should not have to document integration topology by hand when the API gateway already has it.

The 2026 market research identifies API management platform integration as **not available in any reviewed commercial EA tool**. Every tool requires architects to map integration architecture manually from API gateway exports or network diagrams. Government IT estates have become API-driven; EA tooling has not kept pace.

The specific pain this solves: architects cannot tell which applications are tightly coupled without reviewing API gateway logs or interviewing delivery teams. Dependency analysis for rationalisation or decommission is blocked by this gap. Applications that look standalone in GovEA may actually be deeply coupled through an API layer that EA has no visibility into.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs integration topology to produce credible impact analysis; an application decommission recommendation that ignores API consumers is a risk, not an architecture decision
- **Domain Architect** — needs to see which capabilities are delivered through API-exposed services and which have undocumented integration dependencies
- **Agency EA Coordinator** — needs to surface undocumented integrations between agency applications that are invisible in the EA repository but present in the API gateway

## Behaviors

- Connect to API management platforms to discover published APIs and subscriptions:
  - Azure API Management (primary government target in M365-deployed environments)
  - MuleSoft Anypoint Platform
  - Kong Gateway / Kong Konnect
  - Apigee (Google Cloud APIM)
- Map APIs and consumers to GovEA Application records: an API producer maps to a GovEA application; a consumer subscription maps to another application, establishing an integration dependency link
- Surface on each Application record: APIs it exposes (producer role), APIs it consumes (consumer role), and the applications on each end of those relationships
- Populate application-to-application integration dependencies in GovEA from API gateway data, replacing or supplementing architect-drawn integration lines
- Flag applications with many downstream API consumers as high-impact in the decommission or change-risk analysis
- Surface APIs with no consuming subscribers (unused APIs) as potential candidates for decommission

## Rules

- API management integration is read-only in GovEA; GovEA does not publish, modify, or delete API policies
- API credentials and subscription keys visible in the management platform are never imported into GovEA — only metadata (name, owner, consumer, version) is consumed
- Integration dependency links derived from API gateway data are marked with source attribution so architects can distinguish automatically-discovered links from architect-authored ones
- The system does not attempt to infer semantic meaning from API request/response schemas; it maps the existence of producer/consumer relationships, not the content of what flows through them

## Implementation Notes

- Azure APIM management REST API is the highest-priority implementation target given its prevalence in government M365 and Azure environments
- API consumer mapping requires subscription-level access in the API management platform, which may require elevated service-account permissions; the permission model must be documented clearly for administrator setup
- Integration topology at the API layer can be very large in well-instrumented estates; the import must be bounded (e.g., to tagged or group-scoped APIs) and not attempt to ingest the full gateway catalogue without filtering

## Links

- Depends on: `po-application-portfolio`, `rm-end-to-end-traceability`
- Related: `int-data-governance.md`, `int-cloud-discovery.md`, `int-rest-api.md`
