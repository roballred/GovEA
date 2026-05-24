# Capability: REST API

## What It Does

The system must expose a documented, authenticated REST API that allows external systems to read from and write to the GovEA repository — enabling custom integrations with bespoke government systems, CMDBs, project tools, and automation workflows that GovEA does not natively support.

The REST API is the integration fallback and the integration foundation. Every named integration (CMDB, DevOps, PPM) is built on top of it, and any organisation with a bespoke system can use the API directly rather than waiting for a named connector. It is also what makes GovEA scriptable — bulk imports, automated reporting pipelines, and administrative scripts depend on it.

## Implementation Status

**Not implemented.** GovEA currently has no external-facing API. All data access is through the web UI. This document is the design specification for that future work.

## Personas

- **CMS Administrator** — needs a way to bulk-import application or capability data from legacy systems during initial setup without entering hundreds of records manually
- **Enterprise Architect (Central IT)** — needs to run automated reporting pipelines that pull EA data into governance dashboards without manual export
- **Domain Architect** — needs scriptable access to update records in batch (e.g., after a portfolio review changes the status of many applications simultaneously)
- **Junior EA Analyst** — needs to bulk-load data from spreadsheets and exports during repository population; currently this is manual form entry

## Behaviors

- Expose a REST API with:
  - `GET /api/v1/{entity}` — list entities (Applications, Capabilities, Personas, Services, ADRs, Objectives, Initiatives)
  - `GET /api/v1/{entity}/{id}` — get a single entity with its relationships
  - `POST /api/v1/{entity}` — create an entity
  - `PATCH /api/v1/{entity}/{id}` — update an entity
  - Entity-specific relationship endpoints: `POST /api/v1/capabilities/{id}/personas`, etc.
- Authentication via API token scoped to a GovEA user account and role; tokens are created in user settings and can be revoked
- Apply the same RBAC rules as the UI: API tokens inherit the permissions of the user they are scoped to
- Rate limiting: per-token rate limits to prevent runaway automation from degrading service for interactive users
- Publish an OpenAPI 3.x specification that can be imported into Postman, Bruno, or used to generate client SDKs
- Provide a bulk import endpoint accepting JSON or CSV for initial repository population

## Rules

- The REST API applies the same visibility rules as the web UI: draft content is accessible only to the token owner if they have Contributor or Admin role; published content is accessible to all authenticated token holders at or above Viewer role
- API tokens cannot grant more access than the user role they are scoped to; an API token for a Viewer account cannot write records
- Write operations through the API generate audit trail entries identical to UI-initiated writes — the actor is the token owner, and the source is marked as `api`
- API tokens for service accounts (e.g., CMDB sync jobs) should be scoped to a dedicated service user with the minimum required role, not to a named individual's account
- Breaking changes to the API must be versioned; `/api/v1/` and `/api/v2/` are maintained in parallel during a deprecation window

## Implementation Notes

- Next.js Route Handlers are the natural implementation surface for a v1 API alongside the existing Server Actions
- The OpenAPI spec should be auto-generated from the route handler schemas, not maintained manually, to avoid spec drift
- Bulk import endpoint should accept both JSON (array of objects) and CSV (with column mapping), and should run as a background job for large payloads rather than a synchronous request
- Token storage must follow the same security standards as OAuth access tokens: hashed at rest, not queryable in plaintext

## Links

- Depends on: all entity actions (capabilities, applications, personas, services, ADRs, objectives, initiatives), `iam-audit-trail`, RBAC
- Related: `int-itsm-cmdb.md`, `int-devops.md`, `int-bi-analytics.md`, all other integration capabilities
