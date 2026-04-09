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

---

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

---

## Development Approach

This project is developed using the [EasyEA framework](https://github.com/roballred/EasyEA) — a people-centered, lightweight methodology designed for everyday work.

All development standards are defined in [`Standards.md`](./Standards.md). The short version:

- **Humans lead.** AI is a capability amplifier, not the decision maker. Humans define intent, review outputs, and own merge decisions.
- **Persona-first.** Every capability traces back to a real person's pain point or goal. If a feature can't be tied to a persona, it doesn't ship.
- **Issue-first.** Work begins from a tracked issue with clear scope. Issues reference the relevant persona(s) and capability ID(s).
- **Pull requests required.** All changes — human or AI-assisted — go through the same branch, review, and merge workflow.
- **Tests are part of development.** Not an afterthought.

The `business-architecture/` folder is the authoritative source for personas and capabilities. The data model and roadmap flow from there, not from technology choices.

### CI

Every pull request runs:
- **Type check** — `tsc --noEmit` against `apps/govea/tsconfig.json` (strict mode)
- **Lint** — ESLint 9 flat config via `eslint-config-next`

Both must pass before merge.

---

## Capability Roadmap

GovEA's capability roadmap is grounded in the [`ea-research/EA-Tools-Market-Research-2026.md`](./ea-research/EA-Tools-Market-Research-2026.md) — a structured analysis of 7 leading EA platforms, 12 practitioner personas, and 45+ capabilities mapped across 8 groups.

Key findings that shape GovEA's direction:

- **EA Adoption & Engagement is the most cited systemic problem across all commercial tools.** No existing tool solves it well. This is a primary differentiator target for GovEA.
- **Integration is severely underserved.** Gaps in PPM, HR, API management, and process mining force manual work that limits EA's analytical credibility in every tool reviewed.
- **The mid-market is underserved.** The fastest-growing segment — organisations of 500–2,000 employees building their first EA practice — is largely ignored by tools designed for large enterprises. Government agencies at that scale are the core GovEA audience.
- **Plain-language outputs are absent.** No tool reviewed produces outputs designed for elected officials or non-technical stakeholders. GovEA treats this as a first-class requirement, not a reporting add-on.

### Capability groups under development

The following 8 groups define GovEA's target capability surface, derived from the market research and filtered through GovEA's personas:

| Group | Description |
|---|---|
| Repository & Modelling | Architecture repository, traceability, ADRs, debt tracking |
| Application & IT Portfolio | Portfolio management, technology lifecycle, rationalisation |
| Business & Capability Architecture | Capability mapping, strategy alignment, operating model |
| Planning & Analysis | Value streams, roadmapping, scenario planning, heatmaps |
| Governance & Compliance | Review processes, regulatory mapping, audit trail |
| Integration | ITSM, CMDB, DevOps, cloud, and business system connectors |
| Collaboration & Stakeholder Engagement | Role-based access, stakeholder views, change notifications |
| Reporting & Documentation | Plain-language outputs, configurable reports, KPI tracking |

Capabilities are defined one at a time through the EasyEA workflow: persona validation → capability definition → ARB review → implementation issues. The research document is a reference source, not an implementation backlog.

---

## Current Status

- **Implemented:** applications, capabilities, personas, value streams, strategic objectives, initiatives, roadmap views, ADRs, audit history, taxonomy, user management, setup flows, multi-org federation scaffolding, and reusable `@govea/core` primitives
- **Active work:** closing architecture-documentation gaps, expanding automated test coverage, improving local bootstrap and demo workflows
- **Near-term:** strengthen multi-organization support, improve stakeholder-facing views and detail pages
- **Longer-term:** ARB review simulation using reviewer personas, broader hosted SaaS deployment options, and progressive capability coverage across the 8 groups above

---

## Contributing

GovEA is open source and welcomes contributions. Before opening a pull request, read [`Standards.md`](./Standards.md) — it defines the workflow for both human and AI-assisted contributions.

Issues and pull requests: [github.com/roballred/GovEA](https://github.com/roballred/GovEA)

---

## License

MIT
