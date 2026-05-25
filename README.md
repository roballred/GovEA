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
- **Authentication:** Auth.js with OpenID Connect (OIDC) SSO first, using admin-managed pre-provisioned access; Microsoft Entra ID is the current configured provider target, and Okta, Auth0, or other OIDC providers can be supported through the same architectural pattern. SAML support can be added later through BoxyHQ SAML Jackson
- **UI:** Tailwind CSS + shadcn/ui
- **Deployment:** Docker and web-hosted deployments, with containers available for on-prem installs
- **Product architecture:** build toward a reusable `@govea/core` package for CMS-pattern primitives such as content types, field validation, taxonomy, RBAC, audit trail, workflow, and recipe-based seeding
- **Search:** embedded/local search in v1 so self-hosted deployments do not require an external search service
- **Extensibility:** TOGAF and SAFe remain optional overlays, not hard-coded assumptions in the product

---

## Data Model

GovEA is built around a mission-first traceability chain:

```text
Goals -> Strategic Objectives -> Initiatives -> Capabilities -> Applications
```

- **Goals** define broad strategic intent above measurable **Strategic Objectives**.
- **Initiatives** connect strategic objectives to the capabilities and applications changed by delivery work.
- Every **Application** must link to at least one **Capability**.
- Every **Capability** must link to at least one **Persona**.
- **Services** model the government-facing delivery layer and link to personas, capabilities, and value streams. Supporting applications are surfaced through linked capabilities.
- **Strategic Objectives** link to capabilities and value streams. Supporting applications are surfaced through linked capabilities rather than direct objective-to-application joins.
- **Persona Type** and **Persona Tag** values are managed through **Taxonomy**, not through persona-specific admin tables.
- **Organization** is the top-level tenant boundary.
- **Instance Admin** is a separate instance-scoped operating role used for platform administration. It does not automatically make a user the owner or editor of every agency's EA content, and it should not absorb routine org-scoped settings like themes or module choices.
- Additional core entities include **Goals**, **Architecture Decision Records (ADRs)**, **Strategic Objectives**, **Initiatives**, **Principles**, and the **Glossary**.
- Single-org use is still the default operating mode, but GovEA now also ships a prototype multi-organization model with org-scoped visibility and approval-based cross-org links.

For the implementation-level schema reference, including field metadata, enums, and junction tables, see [`docs/data-model.md`](./docs/data-model.md).

For the application architecture overview, including runtime shape, tenancy, traceability, and deployment notes, see [`docs/architect/`](./docs/architect/).

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

**Database only** (start Postgres without running migrations or the app server):

```bash
pnpm demo:db
```

Use this when you want to restart the Next.js layer or run migrations manually without disturbing the database. After the database is ready, run in a separate terminal:

```bash
pnpm --filter govea db:migrate  # run migrations
pnpm --filter govea db:seed     # load seed data
pnpm --filter govea dev         # start the app server
```

**Stop the database:**

```bash
pnpm demo:db:stop
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

### Named volumes and Podman compose providers

The demo stack persists Postgres data in a named volume (`demo_postgres_data`). With rootless Podman, `podman compose` (bundled with Podman Desktop) and `podman-compose` (the pip/brew package) can manage named volumes differently. If you start the stack with one tool and later switch to the other, you may land on what appears to be an empty database with no error — the data is in a volume the other tool can't see.

**Recommendation:** pick one provider and stick to it. The `container-compose.sh` helper prefers `podman compose` when both are available, so as long as you use `pnpm demo:*` commands you stay on the same provider.

If you deliberately want a clean local database (to re-run seed data from scratch, for example), remove the volume explicitly:

```bash
# Stop the stack first
pnpm demo:db:stop          # or pnpm demo:stop for the full stack

# Remove the named volume
podman volume rm demo_postgres_data   # or: docker volume rm demo_postgres_data

# Start fresh — the volume is recreated automatically
pnpm demo:db
pnpm --filter govea db:migrate
pnpm --filter govea db:seed
```

### Azure container builds

Azure deployments build images in the cloud via `az acr build` and do not require a local Docker daemon. See `scripts/azure-dev.sh` for details.

---

## Capabilities

GovEA's capability surface spans 10 groups, each driven by government EA practitioner personas and validated through the EasyEA workflow:

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
| Data Architecture | Data entities, attributes, categories, business keys, and semantic relationships for data-architecture work |

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
- Application custom fields with CSV import/export so agencies can extend and load portfolio metadata without schema changes
- Impact analysis on application and capability detail pages to surface decommission and change consequences from existing relationship data
- Live dashboard for EA practitioners with repository activity, coverage signals, and review-health tracking
- Repository completeness and confidence workflow: daily snapshot model, configurable staleness windows, ranked cleanup actions, domain-target RAG indicators, trend history, stakeholder-facing trust cues, and auto-suppression behavior
- Architecture debt tracking with CRUD, linked-debt panels, dashboard priority signals, publish-time acknowledgement, and lifecycle-based system-detected debt
- Data Architecture module with entities, attributes, categories, business keys, semantic relationships, Chen notation visualization, and dedicated navigation
- Demo-ready planning module: goals, strategic objectives, and initiatives with roadmap grid and executive timeline views
- Goals layer above strategic objectives, with objective rollup and traceability into initiatives and capabilities
- Reports hub with generated Architecture Vision, Executive Summary, Heatmap Analysis, and TOGAF Application Landscape outputs from existing repository content
- Capability relationship map with both focused SVG navigation and Mermaid diagram views
- Repository-wide search across the core content model
- Guided product tour with role-aware coach marks for the main application areas
- Audit trail: immutable before/after log of all changes
- Taxonomy management: org-scoped taxonomy with admin UI, controlled domain vocabulary, persona types, persona tags, and domain-aware filtering
- Shared taxonomy foundation now proven across applications and capabilities, including capability-priority classification as the second pilot
- Identity & access management: OIDC SSO with admin-managed pre-provisioned access, current Microsoft Entra ID provider wiring, local auth fallback, Admin/Contributor/Viewer roles
- Instance admin console: platform dashboard, org inventory, org detail, cross-org user view, audit log, org suspension, instance-admin promotion/demotion, audited break-glass sessions, scoped act-as support actions, and instance-level platform configuration
- Clear product boundary: org admins manage their own workspace settings; instance admins govern the shared platform and tenant lifecycle
- User management and first-run setup flow
- Live admin dashboard with coverage, recent activity, domain summaries, and operational review-health signals
- Email configuration surface with encrypted SMTP settings, delivery log, and an admin dashboard warning when email is not configured
- EasyEA starter content and empty-state prompts for new practices that need a credible first repository quickly
- CSV import/export for Applications and Capabilities, with broader entity coverage planned
- Prototype multi-org federation: connection requests, visibility levels, approval-based cross-org links, read-only remote detail pages, and write-protection enforcement
- Demo seed data and dev login roster for Riverdale, GovEA Project dogfooding, Office of Digital Services, Hartfield TOGAF overlay, and dev-only instance-admin scenarios
- Reusable `@govea/core` package: RBAC, audit, taxonomy, workflow, content type, and recipe primitives
- E2E smoke test coverage across all routes x roles (Playwright)
- Containerized local development plus Azure Container Apps dev deployment support

**Partially implemented / still maturing:**
- ADRs: basic CRUD, detail pages, and linkage exist, but the authoring experience is still maturing relative to the core portfolio records
- Planning semantics: useful for demos and early v1, with objectives using content workflow while initiatives use planning lifecycle states
- Long-form authoring: markdown now renders on detail pages, but editing still uses plain textareas rather than a richer toolbar/preview workflow
- Admin configuration beyond core settings, including the real SMTP send path behind the shipped Email Configuration UI
- Repository portability beyond Application and Capability CSV round-trips
- Risk tracking is defined as a proposed Repository & Modelling capability, but the first-class product surface has not been implemented yet
- Data Architecture quality signals, naming-standard hints, and any later conceptual/logical expansion

**Active work:**
- Finishing actual SMTP email transport so configured email can support notifications and password reset
- Continuing CSV import/export across the next high-value entity types
- Adding Data Architecture quality cues and Data Vault naming-standard hints
- Adding authoring guardrails for duplicate names, unsaved changes, and publish-readiness guidance
- Building a traceable release pipeline for the Azure demo so deployments are tied to a known commit, image digest, and post-deploy smoke result
- Keeping documentation aligned with rapid product-shape changes

**Near-term:**
- Ship the #528 SMTP transport follow-up, then split the #581 change-notification substrate into small slices
- Continue #596 after Capabilities with Personas and ADRs as the next likely import/export targets
- Ship #570 and the Layer 1 / Layer 2 portions of #573 before broadening Data Architecture scope
- Ship #566 / #567 authoring guardrails as shared patterns across content forms
- Ship #504 for traceable demo releases and rollback
- Complete #512 before broader #499 onboarding, glossary, or tour copy work

**Longer-term:**
- End-to-end traceability expansion and risk-informed decision support
- ARB review simulation using reviewer personas
- Broader hosted SaaS deployment options
- Progressive coverage across remaining capability groups

---

## Cost & Why Not an Existing Tool

GovEA is free and open source. There is no licensing fee. The real cost is staff time, to deploy, configure, and maintain the system. For a self-hosted deployment on existing infrastructure, plan for:

- **Initial setup:** a few hours for a technically capable IT staff member
- **Ongoing maintenance:** periodic updates, user provisioning, and backup verification; no dedicated admin role required
- **Hosting:** runs on any server or container platform; no proprietary cloud dependency

### What does it take to run this?

| Concern | Today | Where it's documented |
|---|---|---|
| **Deployment** | Single container against a Postgres database. Three documented workflows: host app + containerized DB, DB-only, full container stack. ~1 hour from clean environment to working demo instance. | [Local Containers](#local-containers) above; capability: [`do-deployment`](business-architecture/capabilities/cms/deployment-operations/do-deployment.md) |
| **Configuration** | Environment variables only — `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` required; SSO and SMTP optional. No source-code edit required to deploy. | [`apps/govea/.env.local`](./apps/govea/.env.local) shape; capability: [`do-deployment`](business-architecture/capabilities/cms/deployment-operations/do-deployment.md) |
| **Health & monitoring** | Drop into a generic uptime + log-aggregation tool. Operator-relevant events go to the platform audit log (`/instance/audit`). A dedicated `/api/healthz` endpoint and a documented log shape are planned. | Capability: [`do-health-monitoring`](business-architecture/capabilities/cms/deployment-operations/do-health-monitoring.md) |
| **Upgrades** | Pre-production: `pnpm --filter govea db:push` syncs schema. Once a real tenant exists, the workflow shifts to migration files — procedure documented in advance. | Capability: [`do-upgrade-migration`](business-architecture/capabilities/cms/deployment-operations/do-upgrade-migration.md); [#4](https://github.com/roballred/GovEA/issues/4) |
| **Admin time/month** | Estimated 1–4 hours for an active small-to-mid-tenant install, dominated by user provisioning and content review nudges — not platform operations. | Capability group: [`cms/deployment-operations`](business-architecture/capabilities/cms/deployment-operations/deployment-operations.md) |

The full operator-facing capability surface is documented under [`business-architecture/capabilities/cms/deployment-operations/`](business-architecture/capabilities/cms/deployment-operations/).



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
