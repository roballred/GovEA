# GovEA — Project Instructions for Claude

## What This Is

GovEA is a free, open source enterprise architecture tool built specifically for state and local government. Most EA tools cost $50,000–$200,000/year and are designed for Fortune 500 enterprises. State and local agencies — cities, counties, special districts — typically have 1–3 IT staff doing architecture work, strict data sovereignty requirements, and no budget for enterprise SaaS licensing. GovEA is built for them.

Built on the [EasyEA](https://github.com/roballred/EasyEA) methodology — people-centered, lightweight, designed for everyday work rather than compliance theater.

**Deployment targets:** open source self-hosted, Docker container on-prem, paid SaaS (shared or dedicated)

---

## Core Domain Model

The governing constraint of GovEA is a three-entity chain:

```
PERSONAS ──────────────────────────────────────────────────────┐
(citizens, staff, elected officials, external partners)        │
                                                               ▼
CAPABILITIES ────────────────────────────────────────────► APPLICATIONS
(permitting, licensing, HR, public safety, finance)        (technology that enables them)
```

**Rules that must never break:**
- Every application must link to at least one capability
- Every capability must link to at least one persona
- This keeps the repository grounded in mission, not just technology inventory

Additional entities: **Organization** (top-level tenant), **Architecture Decision Record** (ADR), **Technology Lifecycle**

---

## Non-Negotiables

- **Framework-agnostic:** TOGAF and SAFe are optional overlays, never required. Don't design in a way that assumes or enforces either.
- **Open source first:** MIT license. Everything must work without a paid license.
- **Multi-tenant:** v1 is single-org. v2 must support multi-tenancy. Design the data model to not foreclose this.
- **On-prem deployable:** Must run in a Docker container with no external service dependencies. SQLite or PostgreSQL — user's choice.
- **Government data sovereignty:** No mandatory external APIs or cloud services in the critical path.

---

## Working Principles

These come directly from the project owner and override default Claude behavior:

1. **Testing is a first-class citizen.** Role switching in dev mode without full auth. Standard synthetic data with restorable states for different scenarios. Test infrastructure is part of the feature, not an afterthought.

2. **Modularity and atomicity.** Keep workable items small and self-contained. This is especially important because tokens cost money. Prefer many small files over large monolithic ones. Each module should do one thing well.

3. **Issues and commits are linked.** Every significant change should reference a GitHub issue. Don't create commits that are disconnected from tracked work.

4. **Documentation stays current.** Update docs as part of the work, not as a separate pass. README, CLAUDE.md, and design docs should reflect current state at all times.

5. **Dev container.** The project should have a ready dev container. When starting implementation work, ask whether to use the container.

---

## Design Phase Status

The codebase was reset to start from a clean design foundation. We are in the **design and technical decision phase**. No implementation exists yet.

Decisions to be made:
- Technology stack (runtime, framework, ORM, auth, UI)
- Monorepo structure (if any)
- API layer design (REST, tRPC, GraphQL, server actions)
- Data model details and migration strategy
- Auth strategy (credentials, SSO, token model)
- CMS-pattern architecture specifics (content type registry, field types, workflow, RBAC)
- Testing infrastructure

Do not propose implementation until design decisions are confirmed.

---

## EasyEA Reference

The methodology behind GovEA lives at https://github.com/roballred/EasyEA. Key concepts:
- People-centered: start with personas, not systems
- 7-step lightweight workflow
- ARB review with 10 distinct reviewer personas (simulated in v2)
- Plain-language outputs for elected officials and non-technical stakeholders

---

## @govea/core Concept

GovEA's foundation should be a reusable core package — a CMS-pattern engine that can underpin other applications. Think OrchardCMS capabilities but in JavaScript/TypeScript:
- Content type registry (define types declaratively, not imperatively)
- Field type system with validation
- Hierarchical taxonomy
- Role-based access control
- Audit trail with change diffing
- Workflow state machine (draft → published → archived)
- Recipe/seed system for JSON-driven configuration and data setup

This core should be framework-agnostic TypeScript, usable outside of GovEA.

---

## Government Capability Taxonomy

GovEA ships with a seed taxonomy for state and local government — 10 top-level domains, 50+ sub-domains:

Administrative Services, Public Safety, Infrastructure & Public Works, Community Development, Health & Human Services, Parks/Recreation/Culture, Transportation, Information Technology, Finance & Revenue, Legislative & Executive

All terms are editable. Agencies customize to match their structure.

---

## User Roles

| Role | Access |
|---|---|
| Admin | Full access — users, org settings, all content |
| Contributor | Create and edit EA content — no user management, no delete |
| Viewer | Read-only, published content only |

SSO users default to Viewer. Admins promote as needed.

---

## GitHub

Repo: https://github.com/roballred/GovEA
