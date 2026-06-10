# GovEA Capabilities

This document describes GovEA's implemented and planned capabilities, organized by group. It is the authoritative summary of what the product does and where it is headed.

Capability definitions live in [`business-architecture/capabilities/`](./business-architecture/capabilities/). That folder is the authoritative source; this document summarizes it.

---

## Capability Groups

The **Scope** column shows whether a group is in v1 (current release) or v2 (deferred), defined in each group's parent file under `business-architecture/capabilities/`. The **Status** column shows what's actually shipped today against that scope. Scope is the canonical signal for non-technical readers planning around the roadmap; Status reflects the current implementation surface.

| # | Group | Scope | Status |
|---|---|---|---|
| 1 | [Identity & Access Management](#1-identity--access-management) | v1 | Implemented |
| 2 | [Content Management](#2-content-management) | v1 | Partially implemented |
| 3 | [Portfolio Management](#3-portfolio-management) | v1 | Partially implemented |
| 4 | [Planning & Roadmap](#4-planning--roadmap) | v1 | Implemented |
| 5 | [Frontend Display](#5-frontend-display) | v1 | Partially implemented |
| 6 | [Admin Configuration](#6-admin-configuration) | v1 | Partially implemented |
| 7 | [Multi-Organization Federation](#7-multi-organization-federation) | v1 | Prototype |
| 8 | [Repository & Modelling](#8-repository--modelling) | v1 | Partially implemented |
| 9 | [Data Architecture](#9-data-architecture) | v1 | Partially implemented |
| 10 | [Framework Alignment](#10-framework-alignment) | v1 | Partially implemented |
| 11 | [Deployment & Operations](#11-deployment--operations) | v1 | Partially implemented |
| 12 | [Integration](./business-architecture/capabilities/ea/integration/integration.md) | v2 | Not started — deferred to v2 (#10, #382) |

---

## 1. Identity & Access Management

Controls authentication, authorization, and all identity events.

| Capability | Status | Description |
|---|---|---|
| User Management | Implemented | Create, edit, deactivate, and assign org-scoped roles to user accounts |
| Role-Based Access Control | Implemented | Enforce Admin / Contributor / Viewer roles across all content and actions, with `instance_admin` layered separately for platform operations |
| Instance Administration | Implemented | Instance-scoped admin role, `/instance` console, org inventory, user view, audit view, org suspension, instance-admin promotion/demotion, audited break-glass sessions, and scoped act-as support actions without taking over org-scoped settings |
| SSO Authentication | Implemented | OpenID Connect (OIDC) SSO with admin-managed pre-provisioned access; current provider wiring targets Microsoft Entra ID |
| Local Authentication | Implemented | Email and password login; always available as SSO fallback |
| IAM Audit Trail | Implemented | Immutable log of all identity and access events, including instance-scoped platform events |
| First-Run Setup | Implemented | Bootstrap the initial Admin account on first launch |
| API Auth Decision | Implemented | Auth strategy for API routes (session-based, not token-based in v1) |

**Org-scoped roles:**

| Role | Access |
|---|---|
| Admin | Full access within the user's organization: users, org settings, and all local content |
| Contributor | Create and edit EA content within the user's organization; no user management and no delete |
| Viewer | Read-only access to viewer-visible content: published core content, accepted ADRs, and active/complete initiatives |

SSO users must be pre-provisioned by an Admin. They sign in with the role already assigned to their account.

**Instance admin:** `instance_admin` is an instance-scoped operating role stored separately from the org-scoped `user_role`. It is for platform administration, not automatic ownership of every tenant's EA content.

---

## 2. Content Management

Foundational content authoring and lifecycle capabilities shared across all EA content types.

| Capability | Status | Description |
|---|---|---|
| Content Authoring | Implemented | Create, edit, and save content items, including markdown-authored long-text fields |
| Content Workflow | Partially implemented | Draft -> Published -> Archived is established for core content types, but planning entities still use their own lifecycle states |
| Taxonomy Management | Implemented | Hierarchical org-scoped taxonomy terms for domains, persona types, persona tags, and other controlled vocabularies |
| Content Relationships | Implemented | Link content items; enforce GovEA traceability rules at publish time |
| Content Search & Filtering | Partially implemented | Per-entity filtering, taxonomy-driven browsing, and embedded repository-wide search are shipped; search relevance and workflow consistency are still maturing |
| Content Types | Partially implemented | Configurable schemas for content; v1 types are fixed in the data model |
| Content Versioning | Not implemented | Change history, diffs, and version restore |

**Traceability rule:** Applications must link to at least one Capability. Capabilities must link to at least one Persona. This constraint is enforced at the application layer.

---

## 3. Portfolio Management

The structured inventory of the organization's architecture objects.

| Capability | Status | Description |
|---|---|---|
| Application Portfolio | Implemented | Manage applications with lifecycle status, capability links, and metadata |
| Services | Implemented | Manage government-facing services linked to personas, capabilities, and value streams; supporting applications are derived through capabilities |
| Capability Map | Implemented | Define business capabilities organized by domain; linked to applications, personas, principles, and decisions |
| Personas | Implemented | Define the people GovEA serves; linked to capabilities and value streams |
| Architecture Decision Records (ADRs) | Partially implemented | Basic ADR CRUD, detail pages, supersession, and cross-linking exist, but the overall authoring experience is still maturing relative to the stronger core portfolio records |
| Principles | Implemented | Capture architecture principles, link them to capabilities and decisions, and classify them with taxonomy-backed principle sets |
| Glossary | Implemented | Maintain shared terminology to support consistent EA language across the repository |
| Value Streams | Implemented | Define value streams with ordered stages; link to capabilities and personas |

**Data model relationships:**

```text
Personas -> Capabilities -> Applications
Personas -> Services -> Capabilities, Value Streams
Strategic Objectives -> Capabilities, Value Streams
Initiatives -> Capabilities, Objectives, Applications
ADRs -> Capabilities, Applications, Initiatives, Objectives
Principles -> Capabilities, ADRs
Glossary -> Shared reference terms across all content
```

Applications are intentionally surfaced for Services and Strategic Objectives through linked Capabilities. GovEA no longer maintains direct `service_applications` or `objective_applications` joins.

This is still one of GovEA's strongest product areas, but it should be described as partially implemented overall until ADRs reach the same maturity as applications, capabilities, personas, services, and value streams.

---

## 4. Planning & Roadmap

Strategic direction, change initiatives, and timeline visualization.

| Capability | Status | Description |
|---|---|---|
| Goals | Implemented | Define broad strategic goals above objectives, with objective rollup and traceability into initiatives and capabilities |
| Strategic Objectives | Implemented | Define measurable objectives under goals; link to capabilities and value streams |
| Initiatives | Implemented | Track change programmes with planning lifecycle statuses; link to capabilities and objectives with impact labels (build / improve / retire / migrate) |
| Roadmap View | Implemented | Visualize initiatives in an executive timeline or planning grid, with linked objectives, date ranges, capability impact labels, and role-aware viewer filtering |

**Design principle:** Planning capabilities are a lens on existing architecture content. Goals capture broad strategic intent. Strategic objectives trace to capabilities and value streams as measurable targets under those goals. Initiatives trace to objectives and capabilities. Nothing here is meaningful unless the underlying capability and persona content is maintained.

**Current semantic model:** Goals and strategic objectives follow the standard content workflow (`draft`, `published`, `archived`). Objectives now sit under goals in the shipped hierarchy. Initiatives do not use the governed-content workflow; they use planning lifecycle states (`proposed`, `active`, `on-hold`, `complete`, `cancelled`) plus optional start/end dates. The roadmap is a read-only view over initiative records, shown either as an executive timeline or grouped planning grid.

This area is strong enough for demos and early v1 use, but the planning model should still be treated as evolving rather than fully settled.

---

## 5. Frontend Display

How content is presented to authenticated users and, optionally, the public.

| Capability | Status | Description |
|---|---|---|
| Navigation | Implemented | App shell with role-aware sidebar navigation plus a distinct instance-admin console shell |
| Portfolio Views | Implemented | List and detail pages for all EA entity types |
| Mission-to-Technology Traceability Views | Implemented | Read-only layered trace views from goals, strategic objectives, initiatives, capabilities, and services to supporting applications and related records |
| Guided Answer Views | Implemented | `/answers?q=` assembles capabilities, services, technology, active initiatives, and strategic objectives into a plain-language stakeholder answer with relevance explanations |
| Relationship Navigation | Implemented | Navigate between linked entities (capability <-> application <-> persona) |
| Value Stream Display | Implemented | Visualize value stream stages with linked capabilities |
| Content Display | Implemented | Detail pages with status badges, metadata, linked records, contributor-friendly edit affordances, and markdown-rendered narrative fields on shipped surfaces |
| Product Tour | Implemented | Role-aware guided tour covering the main dashboard, architecture, portfolio, strategy, search, and role-specific workflows |
| Public / Authenticated Views | Not implemented | Opt-in public access to published content without login |
| Repository Confidence Summary | Implemented | Plain-language freshness and trust cue for stakeholder-facing roadmap and executive views, backed by completeness settings, trend history, and suppression behavior |
| Application Risk Portfolio | Implemented | Leadership-oriented portfolio card view on the Applications page, with lifecycle and dependency risk cues derived from existing data |
| Responsive Layout | Partially implemented | Desktop-first; mobile not a v1 priority |
| Theming | Implemented | Organization-selected predefined themes applied through settings |

---

## 6. Admin Configuration

Organization-level settings and administrative tools.

| Capability | Status | Description |
|---|---|---|
| Organization Settings | Partially implemented | Theme selection is available today; broader org settings remain future work |
| Persona Type Management | Implemented | Manage persona type categories as taxonomy terms under the `Persona Type` branch |
| Persona Tags | Implemented | Manage persona tag values as taxonomy terms under the `Persona Tag` branch |
| Admin Dashboard | Implemented | Live practitioner dashboard with repository activity, coverage signals, and navigation shortcuts |
| Feature Management | Partially implemented | Org-level module toggles and instance-wide module availability controls are shipped; richer dependency and feature-flag behavior remains future work |
| Email Configuration | Partially implemented | Admin UI, encrypted SMTP settings, delivery log, and dashboard warning are shipped; actual SMTP transport remains the next slice |
| Backup & Export | Partially implemented | Application and Capability CSV import/export are shipped; full repository export, backup, and broader entity coverage remain future work |
| Security Settings | Not implemented | Session timeouts, password policy, IP restrictions |

---

## 7. Multi-Organization Federation

Allows organizations to connect, share content, and link local EA artifacts to enterprise-wide counterparts while preserving each org's autonomy.

| Capability | Status | Description |
|---|---|---|
| Org Connections | Prototype | Establish and manage connections between organizations |
| Content Visibility | Prototype | Control which content is visible at org / connections / instance level |
| Cross-Org Linking | Prototype | Link local capabilities and personas to enterprise counterparts |
| Cross-Org Link Approval | Prototype | Review and approve or reject incoming cross-org link requests on shipped capability and persona detail pages |

**Visibility levels:**

| Level | Visible to |
|---|---|
| `org` | This organization only |
| `connections` | This org and all directly connected orgs |
| `instance` | All orgs on the same GovEA instance |

**Design principle:** Single-org installs work identically without federation UI or complexity. Federation is opt-in from the agency side; no org can be forced into a connection. Content ownership never transfers across org boundaries.

Current reality: federation is a working prototype, not just schema groundwork. Connection-aware visibility, approval-based cross-org linking, read-only remote detail pages, connection cleanup, and write-protection guardrails are shipped. Notifications, richer history, and broader cross-org management remain future work.

---

## 8. Repository & Modelling

Reliability, navigability, and self-auditing of the architecture store.

| Capability | Status | Description |
|---|---|---|
| Audit Trail | Implemented | Immutable log of all create/update/delete events with before/after JSON |
| Repository Completeness | Partially implemented | Snapshot foundations, configurable staleness windows, ranked cleanup actions, domain-target RAG indicators, trend history, and stakeholder confidence cues are shipped |
| End-to-End Traceability | Partially implemented | Objective, capability, service, application, data-architecture, and debt-linked views exist, but broader repository-wide traversal remains future work |
| Architecture Debt Tracking | Implemented | CRUD, linked-debt panels, dashboard priority signals, publish-time acknowledgement, and lifecycle-based system-detected debt |
| Risk Tracking | Proposed | First-class architecture and delivery risk tracking has a capability definition and design note, but no product surface yet |

This group is strategically important and now has several shipped trust-building surfaces. The remaining risk is product focus: risk tracking, traceability expansion, and Data Architecture growth should stay tied to validated user decisions rather than becoming broad modelling or GRC platforms.

**Out of scope for v1:**
- Multi-framework modelling (ArchiMate, BPMN, UML): GovEA uses enforced relationship chains and plain-language descriptions, not formal notation
- Meta-model customization: the GovEA meta-model is fixed in v1; custom content types extend it without changing the core

---

## 9. Data Architecture

First-class modelling support for data architecture and data asset context.

| Capability | Status | Description |
|---|---|---|
| Data Architecture Metamodel | Partially implemented | Data entities, attributes, categories, business keys, and semantic relationships are shipped; conceptual/logical/physical boundary decisions remain open |
| Chen Notation Visualization | Implemented | Data entity relationship visualization is available for the shipped metamodel |
| Data Architecture Navigation | Implemented | Data Architecture has its own sidebar group and representative demo fixtures |

Current reality: GovEA now supports a concrete Data Architecture v1 surface. The next product decision is whether #363 is complete for v1 or should split conceptual/logical expansion into focused follow-up issues.

---

## 10. Framework Alignment

Optional alignment to external architecture frameworks such as TOGAF without replacing GovEA's EasyEA-based model.

| Capability | Status | Description |
|---|---|---|
| Framework Reference Management | Not implemented | Store external framework references separately from GovEA's authoritative capability definitions |
| Framework Mapping | Partially implemented | Capabilities and applications carry TOGAF Architecture Domain values through the generic taxonomy system (no bespoke panel); broader framework concept mapping remains future work |
| ADM Phase Alignment | Partially implemented | ADM phases ship as an optional taxonomy classification (ADR-0002) installed by the TOGAF recipe; capabilities and initiatives can be tagged. No phase gates or workflow |
| TOGAF-Aligned Reporting | Partially implemented | Reports hub ships an Architecture Vision summary for all orgs, plus TOGAF Application Landscape and ADM Coverage reports when the TOGAF recipe is installed |
| Framework Overlay Configuration | Partially implemented | TOGAF is enabled by installing the taxonomy-backed recipe per organization (no module toggle); framework taxonomy types carry an audience flag that hides them from viewers and stakeholder reports |

Current reality: GovEA's framework alignment is taxonomy-and-recipe-backed (ADR-0002). The TOGAF recipe installs Architecture Domain and ADM Phase taxonomy types (marked framework-audience so they stay out of stakeholder views); capabilities, applications, and initiatives are tagged through the ordinary taxonomy UI; and the Reports area derives Application Landscape and ADM Coverage from those values. The earlier hard-coded overlay module/toggle and the framework_mappings table have been removed. Admin-managed external framework references and broader mapping depth remain future work.

**Design principle:** Framework support should increase credibility without increasing friction. TOGAF-aware architects should be able to recognize familiar concepts and reporting structures, while ordinary GovEA users continue working with plain-language personas, capabilities, services, applications, objectives, initiatives, principles, and decisions.

Framework alignment is distinct from formal modelling notation. GovEA can map content to TOGAF concepts and produce TOGAF-friendly reports without adding mandatory ADM workflow, ArchiMate modelling, or meta-model customization.

---

## 11. Deployment & Operations

Makes the operator-facing surface (deploy, monitor, upgrade) explicit so the cost of running GovEA is legible before deployment.

| Capability | Status | Description |
|---|---|---|
| Deployment | Implemented | Container-based deployment with Podman or Docker, three documented workflows, env-var-only configuration |
| Health & Monitoring | Partially implemented | Platform audit log captures operator-relevant events; dedicated `/api/healthz` endpoint and documented log shape are planned |
| Upgrade & Migration | Not implemented | Schema transition from pre-production `db:push` to migration files lands with the first real tenant; cross-links to [#4](https://github.com/roballred/GovEA/issues/4) |

Current reality: deployment is solid (the `pnpm demo:*` workflows are exercised by CI on every PR), monitoring is operator-roll-your-own, and the upgrade story is forthcoming. The group was added to close [ARB Finding #10](https://github.com/roballred/GovEA/issues/10) — making the cost of ownership visible to evaluating Central IT directors.

---

## Capability Target Surface

GovEA's longer-horizon capability direction spans the major themes below, each defined through the EasyEA workflow: persona validation -> capability definition -> ARB review -> implementation issues.

| Group | Near-term priorities |
|---|---|
| Identity & Access Management | Operational experience with act-as sessions, then decide whether to promote #436 read gating |
| Repository & Modelling | Risk tracking validation, end-to-end traceability expansion, repository confidence calibration |
| Application & IT Portfolio | Technology lifecycle tracking, custom-field reuse, import/export maturation, richer rationalization views |
| Business & Capability Architecture | Inherited system glossary, menu definitions, operating model views, stronger cross-entity classification and relationship visualisation |
| Data Architecture | Decide #363 v1 boundary, then split conceptual/logical expansion if needed |
| Planning & Analysis | Scenario planning, value stream analytics |
| Governance & Compliance | ARB review workflow, regulatory mapping |
| Integration | Tier 1: ITSM/CMDB sync, DevOps pipeline links, cloud discovery — Tier 2 (critical gaps): PPM/project portfolio, ERP/financial, HR/org design — Tier 3: data governance platform, API management platform, BI analytics feed — Tier 4 (emerging): IaC, AI/ML registry, low-code platforms — Foundational: REST API |
| Collaboration & Stakeholder Engagement | Stakeholder validation, stakeholder-facing plain-language views, feedback capture |
| Reporting & Documentation | Configurable reports, KPI tracking, elected-official summaries |
| Framework Alignment | Optional TOGAF mapping, ADM phase alignment, and framework-aware reporting |

Capabilities are added one at a time as personas are validated and pain points confirmed. The roadmap is driven by real government EA practitioner needs, not feature parity with commercial tools.
