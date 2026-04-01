# GovEA

**Open source enterprise architecture for state and local government.**

GovEA helps government IT teams catalogue their application portfolio, map business capabilities to the people they serve, and make architecture decisions that trace back to real mission needs — not just technology inventory.

Free. Open source. Runs on-prem or as a hosted service.

---

## Why GovEA

Every existing EA tool costs $50,000–$200,000 per year and is designed for Fortune 500 enterprises. State and local government agencies — cities, counties, special districts — typically have 1–3 IT staff doing architecture work, strict data sovereignty requirements, and no budget for enterprise SaaS licensing.

GovEA is built specifically for them.

**Key differentiators:**
- Free and open source (MIT license)
- Runs in a Docker container on-prem or in a government cloud tenant
- Framework-agnostic — TOGAF and SAFe are optional overlays, never required
- Built on the [EasyEA](https://github.com/roballred/EasyEA) methodology — people-centered, lightweight, built for everyday work
- Every application traces to a capability; every capability traces to a persona

---

## The Three Core Entities

```
PERSONAS  ─────────────────────────────────────────────────┐
(citizens, staff, elected officials, external partners)    │
                                                            ▼
CAPABILITIES  ───────────────────────────────────────────► APPLICATIONS
(permitting, licensing, HR, public safety, finance)         (the technology that enables them)
```

**The governing constraint:** every application must link to at least one capability; every capability must link to at least one persona. This keeps the repository grounded in mission rather than becoming a technology inventory nobody trusts.

---

## Monorepo Structure

```
govea/
├── packages/
│   └── core/                  @govea/core — reusable CMS-pattern foundation
│       └── src/
│           ├── content/       Content type registry, field types, defineContentType()
│           ├── taxonomy/      Hierarchical categorization, defineTaxonomy()
│           ├── rbac/          Role-based access control, defineRole()
│           ├── audit/         Change logging with diff computation
│           ├── workflow/      Status state machine (draft → published → archived)
│           └── recipes/       JSON-driven seed and configuration system
└── apps/
    └── govea/                 Next.js 15 App Router application
        ├── prisma/
        │   └── schema.prisma  Database schema (SQLite dev / PostgreSQL production)
        └── src/
            ├── app/
            │   ├── (auth)/login/        Sign-in page (credentials + Entra ID)
            │   └── (app)/               Authenticated routes
            │       ├── dashboard/       Portfolio health overview
            │       ├── organizations/   Organization settings
            │       ├── capabilities/    Capability map (hierarchical)
            │       ├── applications/    Application portfolio with lifecycle filters
            │       ├── personas/        Persona profiles grouped by role type
            │       └── adrs/            Architecture Decision Records
            ├── content-types/           GovEA content type registrations
            │   ├── organization.ts
            │   ├── persona.ts
            │   ├── capability.ts
            │   ├── application.ts
            │   └── adr.ts
            ├── seeds/
            │   └── capability-taxonomy.json   10 domains, 50+ sub-domains
            └── lib/
                ├── db.ts        Prisma client singleton
                ├── auth.ts      Auth.js v5 (credentials + Microsoft Entra ID)
                └── registry.ts  Bootstraps all content types at startup
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Monorepo | Turborepo |
| Database | SQLite (local/container default) → PostgreSQL (production) |
| ORM | Prisma |
| Auth | Auth.js v5 — credentials + Microsoft Entra ID SSO |
| UI | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Node | 22 LTS |

---

## Getting Started

### Prerequisites

- Node 22+
- npm 10+

### Local development

```bash
git clone https://github.com/roballred/GovEA.git
cd GovEA
npm install

# Configure environment
cp apps/govea/.env.example apps/govea/.env
# Edit .env — AUTH_SECRET is required (generate with: openssl rand -base64 32)

# Set up the database
cd apps/govea
npx prisma migrate dev
npx prisma generate

# Start the dev server
cd ../..
npm run dev
```

App runs at `http://localhost:3000`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite: `file:./dev.db` — PostgreSQL: `postgresql://user:pass@host/db` |
| `AUTH_SECRET` | Yes | Random secret for Auth.js — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | App URL — `http://localhost:3000` for local dev |
| `ENTRA_CLIENT_ID` | No | Microsoft Entra ID client ID — enables SSO when present |
| `ENTRA_CLIENT_SECRET` | No | Microsoft Entra ID client secret |
| `ENTRA_TENANT_ID` | No | Microsoft Entra ID tenant ID |

Microsoft Entra ID SSO is disabled by default. Adding the three `ENTRA_*` variables enables it automatically — no code changes required.

### Switch to PostgreSQL

In `apps/govea/prisma/schema.prisma`, change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then update `DATABASE_URL` in `.env` to a PostgreSQL connection string and re-run migrations.

---

## Data Model

### Organization
Top-level entity. Represents the government agency using GovEA.

Fields: name, jurisdiction type (city/county/state/special district/regional), state, population served, EA maturity level (1–5), description, website.

### Persona
A real person type affected by the organization's technology. Based on the [EasyEA persona template](https://github.com/roballred/EasyEA).

Fields: name, role type (citizen/staff/elected/external), department, goals, pain points, critical insights.

### Capability
What the organization does, described as an outcome. Hierarchical — capabilities can have parent capabilities to build a capability map.

Fields: name, description, capability domain (from taxonomy), parent capability, owning department, maturity level, strategic importance (core/supporting/enabling), linked personas (required), TOGAF tag (optional), SAFe tag (optional).

### Application
Technology that enables capabilities. Every application must link to at least one capability.

Fields: name, description, vendor, version, lifecycle status (current/aging/sunset/decommissioned/planned), business criticality, technical debt score (1–5), hosting model, annual cost, contract expiry, owning department, linked capabilities (required), linked personas.

### Architecture Decision Record (ADR)
A significant architecture decision with context, rationale, and consequences. Includes EasyEA ARB review tracking.

Fields: title, status (proposed/accepted/deprecated/superseded), context, decision, consequences, affected capabilities, affected applications, ARB review status, ARB findings.

### Technology Lifecycle
Tracks technology currency and end-of-life risk across the portfolio.

Fields: technology name, vendor, current version, end of support date, end of life date, risk level, linked applications.

---

## Government Capability Taxonomy

GovEA ships with a seed taxonomy covering 10 top-level domains and 50+ sub-domains for state and local government:

- Administrative Services (HR, Finance, Procurement, Legal, Records, Fleet)
- Public Safety (Law Enforcement, Fire, Emergency Management, 911)
- Infrastructure & Public Works (Roads, Water, Solid Waste, Facilities, Capital Projects)
- Community Development (Planning, Permitting, Code Enforcement, Housing)
- Health & Human Services (Social Services, Public Health, Mental Health, Aging)
- Parks, Recreation & Culture (Parks, Recreation, Libraries, Arts)
- Transportation (Transit, Traffic, Parking, Active Transportation)
- Information Technology (Operations, Cybersecurity, GIS, Data, Digital Services)
- Finance & Revenue (Budget, Treasury, Revenue, Grants, Audit)
- Legislative & Executive (Council Support, Executive Office, Communications, Elections)

All taxonomy terms are editable. Agencies can add, rename, or remove terms to match their structure.

---

## User Roles

| Role | Permissions |
|---|---|
| Admin | Full access — manage users, organization settings, all content |
| Contributor | Create and edit EA content — cannot manage users or delete |
| Viewer | Read-only access to published content |

Microsoft Entra ID SSO users are assigned the Viewer role by default. Admins can promote them.

---

## Framework Overlays

GovEA is framework-agnostic. TOGAF and SAFe are supported as **optional** overlays — never required.

- **TOGAF**: Capabilities and applications have a `togafTag` field for mapping to TOGAF Business Capabilities. ADRs track ARB review status aligned to the TOGAF ADM.
- **SAFe**: Capabilities have a `safeTag` field for mapping to SAFe Epics or Value Streams.

Agencies with no formal EA framework can use GovEA without configuring either overlay.

---

## @govea/core

The `packages/core` package contains the reusable CMS-pattern foundation. It is framework-agnostic TypeScript and can be used as the basis for other applications.

### Key exports

```typescript
import { defineContentType, registry }  from '@govea/core/content'
import { defineTaxonomy, taxonomyRegistry } from '@govea/core/taxonomy'
import { defineRole, rbac }             from '@govea/core/rbac'
import { writeAuditEntry, computeDiff } from '@govea/core/audit'
import { STANDARD_WORKFLOW, canTransition } from '@govea/core/workflow'
import { runRecipe, loadRecipe }        from '@govea/core/recipes'
```

### Defining a content type

```typescript
defineContentType({
  name: 'capability',
  label: 'Capability',
  fields: [
    { name: 'name',     type: 'text',     required: true },
    { name: 'domain',   type: 'taxonomy', taxonomy: 'capability-domains' },
    { name: 'personas', type: 'relation', to: 'persona', many: true, required: true },
  ],
  workflow: true,  // draft → published → archived
  audit: true,     // every change is logged automatically
})
```

---

## Roadmap

### v1.0 (current — in development)
- [x] Turborepo monorepo with `@govea/core` reusable package
- [x] Prisma schema — all EA entities with full relationship model
- [x] Auth.js — credentials login + Microsoft Entra ID SSO
- [x] Content type registry — Organization, Persona, Capability, Application, ADR
- [x] Government capability taxonomy seed (10 domains, 50+ sub-domains)
- [x] Dashboard with portfolio health and lifecycle breakdown
- [x] Application portfolio with lifecycle filter tabs
- [x] Capability map with hierarchical tree view
- [x] Personas grouped by role type
- [ ] Create/edit forms for all content types
- [ ] ADR list and detail pages
- [ ] Database seed script (`npm run db:seed`)
- [ ] First-run setup (create initial admin user)
- [ ] Docker container + docker-compose.yml

### v2.0 (planned)
- [ ] AI-assisted documentation (Claude API — optional module)
- [ ] Plain-language stakeholder summaries for elected officials
- [ ] EasyEA ARB review simulation (10 reviewer personas)
- [ ] Multi-tenant SaaS onboarding
- [ ] TOGAF ADM phase overlay
- [ ] SAFe value stream overlay
- [ ] Cross-agency shared services mapping
- [ ] Roadmapping (current → future state timeline)
- [ ] ServiceNow CMDB / Azure DevOps integration
- [ ] Public stakeholder portal (no-login read-only views)

---

## Contributing

GovEA is open source and welcomes contributions. Issues and pull requests are welcome at [github.com/roballred/GovEA](https://github.com/roballred/GovEA).

---

## License

MIT
