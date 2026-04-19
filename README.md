# GovEA

**Open source enterprise architecture for state and local government.**

GovEA helps government IT teams catalogue their application and service portfolio, map business capabilities to the people they serve, and make architecture decisions that trace back to real mission needs — not just technology inventory.

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
- **Services** model the government-facing delivery layer and can link to personas, capabilities, applications, and value streams.
- **Persona Type** and **Persona Tag** values are managed through **Taxonomy**, not through persona-specific admin tables.
- **Organization** is the top-level tenant boundary.
- Additional core entities include **Architecture Decision Record (ADR)** and **Technology Lifecycle**.
- v1 is single-organization, but the data model must preserve a path to v2 multi-tenancy by scoping users, roles, content types, and taxonomies to an organization.

For the implementation-level schema reference — including field metadata, enums, and junction tables — see [`docs/data-model.md`](./docs/data-model.md).

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

## Capabilities

GovEA's capability surface spans 8 groups, each driven by validated government EA practitioner personas:

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

For the full capability inventory — including implementation status — see [`capabilities.md`](./capabilities.md).

Capabilities are defined one at a time through the EasyEA workflow: persona validation → capability definition → ARB review → implementation issues.

---

## Current Status

**Implemented:**
- Full CRUD for the core EA object model: applications, services, capabilities, personas, value streams, strategic objectives, initiatives, ADRs
- Supporting reference content for principles and glossary terms
- Mission-first traceability: Personas → Capabilities → Applications enforced at the application layer
- Service catalogue: first-class service records linked to personas, capabilities, applications, and value streams
- Contributor-friendly relationship panels across detail pages, including in-context persona editing
- Live dashboard for EA practitioners with repository activity and coverage signals
- Demo-ready planning module — strategic objectives plus initiatives with a roadmap view grouped by planning status
- Audit trail — immutable before/after log of all changes
- Taxonomy management — org-scoped taxonomy with admin UI, controlled domain vocabulary, persona types, persona tags, and domain-aware filtering
- Identity & access management — SSO via Microsoft Entra ID (OIDC), local auth fallback, Admin/Contributor/Viewer roles
- User management and first-run setup flow
- Live admin dashboard with coverage, recent activity, and domain summaries
- Prototype multi-org federation — connection requests, visibility levels, shared content, cross-org linking
- Reusable `@govea/core` package — RBAC, audit, taxonomy, workflow, content type, and recipe primitives
- E2E smoke test coverage across all routes × roles (Playwright)
- Containerized local development plus Azure Container Apps dev deployment support

**Partially implemented / still maturing:**
- ADRs — basic CRUD, detail pages, and linkage exist, but the authoring experience is still maturing relative to the core portfolio records
- Planning semantics and timeline presentation — useful for demos and early v1, with objectives using content workflow while initiatives use planning lifecycle states
- Admin configuration beyond core settings
- Repository completeness, end-to-end traceability, and architecture debt tooling

**Active work:**
- Expanding automated test coverage
- Improving local bootstrap and demo workflows

**Near-term:**
- Stakeholder-facing views and plain-language detail pages
- Repository completeness signals and gap detection
- Stronger multi-organization support
- Repository-wide search and broader workflow consistency across all entity types

**Longer-term:**
- End-to-end traceability and architecture debt tracking
- ARB review simulation using reviewer personas
- Broader hosted SaaS deployment options
- Progressive coverage across remaining capability groups

---

## Cost & Why Not an Existing Tool

GovEA is free and open source. There is no licensing fee. The real cost is staff time — to deploy, configure, and maintain the system. For a self-hosted deployment on existing infrastructure, plan for:

- **Initial setup:** a few hours for a technically capable IT staff member
- **Ongoing maintenance:** periodic updates, user provisioning, and backup verification — no dedicated admin role required
- **Hosting:** runs on any server or container platform; no proprietary cloud dependency

### Why not SharePoint, Confluence, or Notion?

Those tools are general-purpose document repositories. They can store EA content, but they cannot enforce the relationships that make EA useful:

- They cannot require that an application links to a capability, or that a capability links to a persona
- They have no concept of a traceability chain from strategy to people to systems
- They produce content for whoever created it — not outputs shaped for department directors or elected officials
- Taxonomy and classification are ad hoc — there is no shared model across the organization

### Why not an existing EA tool (LeanIX, Ardoq, MEGA HOPEX, etc.)?

Commercial EA tools are designed for large enterprise architecture practices. They are expensive, complex, and assume a dedicated EA team with formal training. For state and local government agencies:

- Licensing costs are prohibitive for agencies with no EA budget
- Tool complexity discourages adoption — EA content stays current only when it is easy to maintain
- Outputs are designed for architects, not for elected officials or department directors
- On-prem or air-gapped deployment is difficult or unavailable

GovEA is designed specifically for the agencies commercial tools ignore: 500–2,000 employees, 1–3 person IT team, no EA budget, needing something that works without a consultant.

---

## Contributing

GovEA is open source and welcomes contributions. Before opening a pull request, read [`Standards.md`](./Standards.md) — it defines the workflow for both human and AI-assisted contributions.

### Traceability

Every issue and PR that touches implementation should link back to a persona and capability. Capability IDs are the file stem of the relevant sub-capability file:

```
business-architecture/capabilities/cms/iam/iam-user-management.md  →  iam-user-management
```

In issues:
```
Capability: iam-user-management
Persona: CMS Administrator
```

In PR descriptions:
```
Closes #42
Capability: iam-user-management
```

See [`Standards.md`](./Standards.md) for the full traceability convention.

Issues and pull requests: [github.com/roballred/GovEA](https://github.com/roballred/GovEA)

---

## License

MIT
