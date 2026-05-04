# GovEA

**Open source enterprise architecture for state and local government.**

GovEA helps government IT teams catalogue their application and service portfolio, map business capabilities to the people they serve, and make architecture decisions that trace back to real mission needs, not just technology inventory.

Free. Open source. Runs on-prem or as a hosted service.

---

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle
- **Authentication:** Auth.js with Microsoft Entra ID via OIDC first, using admin-managed pre-provisioned SSO access; SAML support can be added later through BoxyHQ SAML Jackson
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
- **Services** model the government-facing delivery layer and link to personas, capabilities, and value streams. Supporting applications are surfaced through linked capabilities.
- **Strategic Objectives** link to capabilities and value streams. Supporting applications are surfaced through linked capabilities rather than direct objective-to-application joins.
- **Persona Type** and **Persona Tag** values are managed through **Taxonomy**, not through persona-specific admin tables.
- **Organization** is the top-level tenant boundary.
- **Instance Admin** is a separate instance-scoped operating role used for platform administration. It does not automatically make a user the owner or editor of every agency's EA content, and it should not absorb routine org-scoped settings like themes or module choices.
- Additional core entities include **Architecture Decision Records (ADRs)**, **Strategic Objectives**, **Initiatives**, **Principles**, and the **Glossary**.
- Single-org use is still the default operating mode, but GovEA now also ships a prototype multi-organization model with org-scoped visibility and approval-based cross-org links.

For the implementation-level schema reference, including field metadata, enums, and junction tables, see [`docs/data-model.md`](./docs/data-model.md).

---

## Development Approach

This project is developed using the [EasyEA framework](https://github.com/roballred/EasyEA), a people-centered, lightweight methodology designed for everyday work.

All development standards are defined in [`Standards.md`](./Standards.md). The short version:

- **Humans lead.** AI is a capability amplifier, not the decision maker. Humans define intent, review outputs, and own merge decisions.
- **Persona-first.** Every capability traces back to a real person's pain point or goal. If a feature can't be tied to a persona, it doesn't ship.
- **Issue-first.** Work begins from a tracked issue with clear scope. Issues reference the relevant persona(s) and capability ID(s).
- **Pull requests required.** All changes, human or AI-assisted, go through the same branch, review, and merge workflow.
- **Tests are part of development.** Not an afterthought.

The `business-architecture/` folder is the authoritative source for personas and capabilities. The data model and roadmap flow from there, not from technology choices.

### CI

Every pull request runs:
- **Type check** - `tsc --noEmit` against `apps/govea/tsconfig.json` (strict mode)
- **Lint** - ESLint 9 flat config via `eslint-config-next`

Both must pass before merge.

---

## Local Containers

GovEA uses a runtime-agnostic compose helper (`scripts/container-compose.sh`) so local container workflows work with either Podman or Docker. Podman is the preferred default when installed.

### Auto-detection

The helper detects the available runtime automatically:
- uses **Podman** when `podman` is found in PATH
- falls back to **Docker** if Podman is not available
- override with `CONTAINER_RUNTIME=docker` or `CONTAINER_RUNTIME=podman`

### Common workflows

**Host app + containerized Postgres** (fastest hot reload):

```bash
pnpm demo:start
```

**Full container stack** (auto-detected runtime):

```bash
pnpm demo:container
```

**Stop the container stack:**

```bash
pnpm demo:stop
```

**Explicit runtime override:**

```bash
CONTAINER_RUNTIME=docker pnpm demo:start
CONTAINER_RUNTIME=podman pnpm demo:container
```

Or use the convenience aliases:

```bash
pnpm demo:docker   # forces Docker
pnpm demo:podman   # forces Podman
```

### Podman setup (macOS)

```bash
brew install podman
podman machine start
```

Ensure `podman compose` or `podman-compose` is available:

```bash
podman compose version   # bundled with Podman Desktop
# or
pip install podman-compose
```

### Azure container builds

Azure deployments build images in the cloud via `az acr build` and do not require a local Docker daemon. See `scripts/azure-dev.sh` for details.

---

## Capabilities

GovEA's capability surface spans 9 groups, each driven by government EA practitioner personas and validated through the EasyEA workflow:

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
| Framework Alignment | Optional TOGAF/SAFe-style overlays, mappings, and framework-aware reports |

For the full capability inventory, including implementation status, see [`capabilities.md`](./capabilities.md).

Capabilities are defined one at a time through the EasyEA workflow: persona validation -> capability definition -> ARB review -> implementation issues. Framework alignment is treated as an optional overlay: it may map GovEA content to TOGAF or other frameworks, but it does not replace the core GovEA model.

---

## Current Status

**Implemented:**
- Full CRUD for the core EA object model: applications, services, capabilities, personas, value streams, strategic objectives, initiatives, ADRs
- Supporting reference content for principles and glossary terms, including taxonomy-backed principle sets
- Mission-first traceability: Personas -> Capabilities -> Applications enforced at the application layer
- Stakeholder-friendly traceability views: read-only objective, capability, and service traces that show how mission context connects to applications, initiatives, and related architecture records
- Guided stakeholder answer view: `/answers?q=` turns repository search context into a briefing-style answer with capabilities, services, technology, initiatives, and objectives
- Service catalogue: first-class service records linked to personas, capabilities, and value streams, with supporting applications derived through capabilities
- Contributor-friendly relationship panels across detail pages, including in-context persona editing
- Markdown-rendered long-form detail pages across the portfolio model, with shared prose styling for descriptions and other narrative fields
- Leadership-friendly application risk portfolio view on the Applications page, highlighting retiring systems that still support active capability work
- Live dashboard for EA practitioners with repository activity, coverage signals, and review-health tracking
- Demo-ready planning module: strategic objectives plus initiatives with roadmap grid and executive timeline views
- Reports hub with generated Architecture Vision output from existing repository content
- Repository-wide search across the core content model
- Guided product tour with role-aware coach marks for the main application areas
- Audit trail: immutable before/after log of all changes
- Taxonomy management: org-scoped taxonomy with admin UI, controlled domain vocabulary, persona types, persona tags, and domain-aware filtering
- Identity & access management: SSO via Microsoft Entra ID (OIDC) with admin-managed pre-provisioned access, local auth fallback, Admin/Contributor/Viewer roles
- Instance admin console: platform dashboard, org inventory, org detail, cross-org user view, audit log, org suspension, instance-admin promotion/demotion, and audited break-glass sessions
- Clear product boundary: org admins manage their own workspace settings; instance admins govern the shared platform and tenant lifecycle
- User management and first-run setup flow
- Live admin dashboard with coverage, recent activity, domain summaries, and operational review-health signals
- Prototype multi-org federation: connection requests, visibility levels, approval-based cross-org links, read-only remote detail pages, and write-protection enforcement
- Two-city demo seed data and dev login roster for Riverdale, Lakeside, state admin, and dev-only instance-admin scenarios
- Reusable `@govea/core` package: RBAC, audit, taxonomy, workflow, content type, and recipe primitives
- E2E smoke test coverage across all routes x roles (Playwright)
- Containerized local development plus Azure Container Apps dev deployment support

**Partially implemented / still maturing:**
- ADRs: basic CRUD, detail pages, and linkage exist, but the authoring experience is still maturing relative to the core portfolio records
- Planning semantics: useful for demos and early v1, with objectives using content workflow while initiatives use planning lifecycle states
- Long-form authoring: markdown now renders on detail pages, but editing still uses plain textareas rather than a richer toolbar/preview workflow
- Admin configuration beyond core settings
- Repository completeness, broader repository confidence, deeper end-to-end traceability analysis, and architecture debt tooling

**Active work:**
- Defining the true instance-level configuration surface for the `/instance` console
- Turning the new reporting and portfolio foundations into stronger stakeholder-facing decision support
- Expanding automated test coverage
- Improving local bootstrap and demo workflows
- Keeping documentation aligned with rapid product-shape changes

**Near-term:**
- Define and ship instance-level platform configuration in `/instance`
- Add an executive dashboard for non-architect leadership audiences
- Add impact analysis on application and capability detail pages
- Add heatmap analysis views over existing portfolio data
- Start lightweight user feedback capture for EA practice fit

**Longer-term:**
- End-to-end traceability and architecture debt tracking
- ARB review simulation using reviewer personas
- Broader hosted SaaS deployment options
- Progressive coverage across remaining capability groups

---

## Cost & Why Not an Existing Tool

GovEA is free and open source. There is no licensing fee. The real cost is staff time, to deploy, configure, and maintain the system. For a self-hosted deployment on existing infrastructure, plan for:

- **Initial setup:** a few hours for a technically capable IT staff member
- **Ongoing maintenance:** periodic updates, user provisioning, and backup verification; no dedicated admin role required
- **Hosting:** runs on any server or container platform; no proprietary cloud dependency



## Contributing

GovEA is open source and welcomes contributions. Before opening a pull request, read [`Standards.md`](./Standards.md), which defines the workflow for both human and AI-assisted contributions.

### Traceability

Every issue and PR that touches implementation should link back to a persona and capability. Capability IDs are the file stem of the relevant sub-capability file:

```
business-architecture/capabilities/cms/iam/iam-user-management.md  ->  iam-user-management
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
