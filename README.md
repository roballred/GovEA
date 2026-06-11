# GovEA

**Open source enterprise architecture for state and local government.**

GovEA helps government teams understand what they have, why it matters, and how technology connects to public outcomes. It is built around people, capabilities, applications, services, decisions, and strategy rather than compliance theater.

GovEA is free and open source. It can run locally, in containers, on-prem, or as a hosted deployment.

## What It Does

GovEA gives state and local government teams a practical EA workspace for:

- mapping personas, services, capabilities, applications, goals, objectives, and initiatives
- tracing mission needs to the systems that support them
- managing architecture decisions, principles, glossary terms, and architecture debt
- building stakeholder-friendly reports and roadmap views
- keeping taxonomy, audit, roles, and organization boundaries clear
- importing and exporting portfolio data as the product matures

The core traceability chain is:

```text
Goals -> Strategic Objectives -> Initiatives -> Capabilities -> Applications
```

For the full model, see [Data Model](./docs/data-model.md) and [Data and Traceability](./docs/architect/data-and-traceability.md).

## Who It Is For

GovEA is designed for public-sector teams that need useful enterprise architecture without heavyweight tooling overhead:

- enterprise architects and domain architects
- agency EA coordinators
- department leaders and business stakeholders
- budget, performance, and planning analysts
- data architects and application portfolio owners
- instance and organization administrators

Persona definitions live in [business-architecture/personas](./business-architecture/personas/). Persona journey findings live in [docs/persona-journeys](./docs/persona-journeys/).

## Current Shape

The product is in active development. The shipped surface includes the core EA repository, traceability views, taxonomy, reporting, role-based access, audit, local/container development, and a growing set of import/export and admin capabilities.

For detail, use these source-of-truth documents:

| Topic | Details |
|---|---|
| Product capabilities and status | [capabilities.md](./capabilities.md) |
| Current priorities | [docs/product-priorities.md](./docs/product-priorities.md) |
| Product and delivery risks | [docs/risk-register.md](./docs/risk-register.md) |
| Architecture overview | [docs/architect/README.md](./docs/architect/README.md) |
| Runtime and deployment | [docs/architect/runtime-and-deployment.md](./docs/architect/runtime-and-deployment.md) |
| Security and tenancy | [docs/architect/security-and-tenancy.md](./docs/architect/security-and-tenancy.md) |
| Data model | [docs/data-model.md](./docs/data-model.md) |
| Standards for AI-assisted work | [Standards.md](./Standards.md) |

## Tech Stack

- **App:** Next.js App Router, React, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Auth.js with local development auth and OIDC SSO architecture
- **UI:** Tailwind CSS and shadcn/ui
- **Testing:** TypeScript, ESLint, Vitest integration tests, Playwright smoke tests
- **Deployment:** containerized app plus PostgreSQL

For deeper technical notes, start with [docs/architect](./docs/architect/).

## Quick Start

Prerequisites:

- Node.js 20 or newer
- pnpm 9 or newer
- Docker or Podman for local database/container workflows

Clone and verify:

```bash
git clone https://github.com/roballred/GovEA.git
cd GovEA
pnpm verify
```

`pnpm verify` installs dependencies and runs the core local checks: type check, lint, and business-architecture docs lint.

Start a local demo database and app:

```bash
pnpm demo:start
```

Common local commands:

```bash
pnpm demo:db          # start Postgres only
pnpm demo:db:stop     # stop Postgres
pnpm demo:container   # run the full container stack
pnpm demo:stop        # stop the demo stack
```

For manual database work:

```bash
pnpm --filter govea db:migrate
pnpm --filter govea db:seed
pnpm --filter govea dev
```

## Development Workflow

GovEA follows the project standards in [Standards.md](./Standards.md):

- humans own direction, review, and merge decisions
- work starts from tracked issues
- capability and persona traceability matter
- all changes go through pull requests
- tests or explicit validation notes are expected for every change

Pull requests normally run:

- type check
- lint
- business-architecture docs lint
- production build
- integration tests
- Playwright smoke tests

## Architecture And Product Docs

Use the README as the starting point, not the full manual. Detailed material belongs in these docs:

- [Capabilities](./capabilities.md)
- [Architecture Overview](./docs/architect/README.md)
- [Application Overview](./docs/architect/application-overview.md)
- [Data and Traceability](./docs/architect/data-and-traceability.md)
- [Runtime and Deployment](./docs/architect/runtime-and-deployment.md)
- [Security and Tenancy](./docs/architect/security-and-tenancy.md)
- [Data Model](./docs/data-model.md)
- [Product Priorities](./docs/product-priorities.md)
- [Risk Register](./docs/risk-register.md)
- [Business Architecture Style Guide](./business-architecture/STYLE.md)

## Framework Alignment

GovEA is EasyEA-first. External frameworks such as TOGAF should support government teams without replacing the core workflow.

Framework support is taxonomy-and-recipe-backed ([ADR-0002: ADM as Classification](./docs/decisions/0002-adm-as-classification.md)): installing the TOGAF recipe gives an organization Architecture Domain and ADM Phase classifications, and the TOGAF reports read from that taxonomy — there is no hard-coded overlay. Current framework-alignment detail is tracked in [capabilities.md](./capabilities.md) and [ADR-0001: TOGAF and ADM Scope Boundary](./docs/decisions/0001-togaf-adm-scope.md).

## Deployment Notes

GovEA is container-friendly and designed to run against PostgreSQL. Local development can use Docker or Podman. Azure demo deployment helpers are present, but operator-specific Azure account configuration belongs in private operator environments, not this public repository.

See [Runtime and Deployment](./docs/architect/runtime-and-deployment.md) for architecture details and [Release Pipeline Policy](./docs/release-pipeline.md) for deployment privacy guidance.

## License

GovEA is released under the [MIT License](./LICENSE).
