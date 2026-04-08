# GovEA

**Open source enterprise architecture for state and local government.**

GovEA helps government IT teams catalogue their application portfolio, map business capabilities to the people they serve, and make architecture decisions that trace back to real mission needs — not just technology inventory.

Free. Open source. Runs on-prem or as a hosted service.

---


## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle
- **Authentication:** Auth.js with Microsoft Entra ID via OIDC first; SAML support can be added later through BoxyHQ SAML Jackson
- **UI:** Tailwind CSS + shadcn/ui
- **Deployment:** Docker and web-hosted deployments, with containers available for on-prem installs
- **Product architecture:** build toward a reusable `@govea/core` package for CMS-pattern primitives such as content types, field validation, taxonomy, RBAC, audit trail, workflow, and recipe-based seeding
- **Search:** embedded/local search in v1 so self-hosted deployments do not require an external search service
- **Extensibility:** TOGAF and SAFe remain optional overlays, not hard-coded assumptions in the product


## Data Model

GovEA is built around a mission-first traceability chain:

```text
Personas -> Capabilities -> Applications
```

- Every **Application** must link to at least one **Capability**.
- Every **Capability** must link to at least one **Persona**.
- **Organization** is the top-level tenant boundary.
- Additional core entities include **Architecture Decision Record (ADR)** and **Technology Lifecycle**.
- v1 is single-organization, but the data model must preserve a path to v2 multi-tenancy by scoping users, roles, content types, and taxonomies to an organization.

## Roadmap

- **Current phase:** active implementation and architecture hardening. The repository now includes a working Next.js application, Drizzle schema and migrations, seeded datasets, admin UI, authentication flows, and Docker-based dev/demo support.
- **Implemented today:** applications, capabilities, personas, value streams, strategic objectives, initiatives, roadmap views, ADRs, audit history, taxonomy, user management, setup flows, and reusable `@govea/core` primitives.
- **Current priorities:** close remaining architecture-documentation gaps, expand automated coverage, improve local bootstrap and demo workflows, and continue filling core EA capability areas such as lifecycle, analysis, and integrations.
- **Near-term direction:** strengthen multi-organization support, improve stakeholder-facing views and detail pages, and keep implementation aligned with persona and capability standards.
- **Longer-term direction:** ARB review simulation using reviewer personas and broader hosted SaaS deployment options.
- **Testing principle:** test infrastructure, synthetic data, and restorable test states are part of the development cycle, not an afterthought.

---

## Contributing

GovEA is open source and welcomes contributions. Issues and pull requests are welcome at [github.com/roballred/GovEA](https://github.com/roballred/GovEA).

---

## License

MIT
