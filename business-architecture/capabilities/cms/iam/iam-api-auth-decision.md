# Architecture Decision: API Authentication Scope (v1)

## Decision

GovEA v1 exposes no external API surface. API authentication is out of scope for v1.

## Context

An ARB review (issue #6) flagged that API authentication references existed in OrchardCore capability references but no explicit decision had been documented about whether GovEA v1 would include an external API.

## Rationale

All data access in v1 is through:
- Next.js server actions (server-side, session-protected)
- The admin UI (session-protected)
- The `api/auth/[...nextauth]` route (NextAuth internal — not a public API)

There are no REST endpoints, GraphQL endpoints, or token-based API consumers in v1. The primary personas (CMS Administrator, Agency EA Coordinator, Content Viewer) all interact through the browser UI. No integration use case requiring a machine-readable API has been identified for v1.

## Consequences

- No API key management, bearer token issuance, or OAuth client credential flow is needed in v1
- If a public or partner API is added in v2, authentication must be designed at that time (API keys, OAuth 2.0 client credentials, or similar)
- This decision should be revisited if data export or integration requirements surface during persona validation

## Status

Accepted — v1 scope

## Related

- ARB finding: roballred/GovEA#6
- Affected personas: Enterprise Architect (Central IT), Agency EA Coordinator
