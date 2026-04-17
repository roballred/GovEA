# GovEA Capabilities

This document describes GovEA's implemented and planned capabilities, organized by group. It is the authoritative summary of what the product does and where it is headed.

Capability definitions live in [`business-architecture/capabilities/`](./business-architecture/capabilities/). That folder is the authoritative source — this document summarizes it.

---

## Capability Groups

| # | Group | Status |
|---|---|---|
| 1 | [Identity & Access Management](#1-identity--access-management) | Implemented |
| 2 | [Content Management](#2-content-management) | Partially implemented |
| 3 | [Portfolio Management](#3-portfolio-management) | Partially implemented |
| 4 | [Planning & Roadmap](#4-planning--roadmap) | Implemented |
| 5 | [Frontend Display](#5-frontend-display) | Partially implemented |
| 6 | [Admin Configuration](#6-admin-configuration) | Partially implemented |
| 7 | [Multi-Organization Federation](#7-multi-organization-federation) | Prototype |
| 8 | [Repository & Modelling](#8-repository--modelling) | Scaffolded |

---

## 1. Identity & Access Management

Controls authentication, authorization, and all identity events.

| Capability | Status | Description |
|---|---|---|
| User Management | Implemented | Create, edit, deactivate, and assign roles to user accounts |
| Role-Based Access Control | Implemented | Enforce Admin / Contributor / Viewer roles across all content and actions |
| SSO Authentication | Implemented | Microsoft Entra ID sign-in via OpenID Connect (OIDC) |
| Local Authentication | Implemented | Email and password login; always available as SSO fallback |
| IAM Audit Trail | Implemented | Immutable log of all identity and access events |
| First-Run Setup | Implemented | Bootstrap the initial Admin account on first launch |
| API Auth Decision | Implemented | Auth strategy for API routes (session-based, not token-based in v1) |

**Roles:**

| Role | Access |
|---|---|
| Admin | Full access — users, org settings, all content |
| Contributor | Create and edit EA content — no user management, no delete |
| Viewer | Read-only, published content only |

SSO users default to Viewer. Admins promote as needed.

---

## 2. Content Management

Foundational content authoring and lifecycle capabilities shared across all EA content types.

| Capability | Status | Description |
|---|---|---|
| Content Authoring | Implemented | Create, edit, and save content items |
| Content Workflow | Partially implemented | Draft / published semantics exist, but workflow behavior is not yet fully consistent across all content areas |
| Taxonomy Management | Implemented | Hierarchical org-scoped taxonomy terms for categorizing all content |
| Content Relationships | Implemented | Link content items; enforce GovEA traceability rules at publish time |
| Content Search & Filtering | Partially implemented | Strong per-entity filtering and taxonomy-driven browse paths; true repository-wide search remains limited |
| Content Types | Partially implemented | Configurable schemas for content; v1 types are fixed in the data model |
| Content Versioning | Not implemented | Change history, diffs, and version restore |

**Traceability rule:** Applications must link to at least one Capability. Capabilities must link to at least one Persona. This constraint is enforced at the application layer.

---

## 3. Portfolio Management

The structured inventory of the organization's architecture objects.

| Capability | Status | Description |
|---|---|---|
| Application Portfolio | Implemented | Manage applications with lifecycle status, capability links, and metadata |
| Capability Map | Implemented | Define business capabilities organized by domain; linked to applications and personas |
| Personas | Implemented | Define the people GovEA serves; linked to capabilities and value streams |
| Architecture Decision Records (ADRs) | Partially implemented | ADR schema and list experience exist; full authoring and lifecycle tooling is not yet complete |
| Value Streams | Implemented | Define value streams with ordered stages; link to capabilities and personas |

**Data model relationships:**

```
Personas → Capabilities → Applications
Strategic Objectives → Capabilities, Value Streams, Applications
Initiatives → Capabilities, Objectives, Applications
ADRs → Capabilities, Applications, Initiatives, Objectives
```

---

## 4. Planning & Roadmap

Strategic direction, change initiatives, and timeline visualization.

| Capability | Status | Description |
|---|---|---|
| Strategic Objectives | Implemented | Define and track business goals; link to capabilities and value streams |
| Initiatives | Implemented | Track change programmes; link to capabilities and objectives with impact labels (build / improve / retire / migrate) |
| Roadmap View | Implemented | Usable early-v1 roadmap surface for initiatives and objectives, with richer timeline semantics deferred |

**Design principle:** Planning capabilities are a lens on existing architecture content. Strategic objectives trace to capabilities. Initiatives trace to objectives and capabilities. Nothing here is meaningful unless the underlying capability and persona content is maintained.

This area is strong enough for demos and early v1 use, but the planning model should still be treated as evolving rather than fully settled.

---

## 5. Frontend Display

How content is presented to authenticated users and, optionally, the public.

| Capability | Status | Description |
|---|---|---|
| Navigation | Implemented | App shell with role-aware sidebar navigation |
| Portfolio Views | Implemented | List and detail pages for all EA entity types |
| Relationship Navigation | Implemented | Navigate between linked entities (capability ↔ application ↔ persona) |
| Value Stream Display | Implemented | Visualize value stream stages with linked capabilities |
| Content Display | Implemented | Detail pages with status badges, metadata, and linked records |
| Public / Authenticated Views | Not implemented | Opt-in public access to published content without login |
| Responsive Layout | Partially implemented | Desktop-first; mobile not a v1 priority |
| Theming | Implemented | Built-in organization themes plus per-user dark mode for the authenticated app shell |

---

## 6. Admin Configuration

Organization-level settings and administrative tools.

| Capability | Status | Description |
|---|---|---|
| Organization Settings | Partially implemented | Core organization branding and appearance settings exist; broader configuration remains future work |
| Persona Type Management | Implemented | Create and manage persona type categories |
| Persona Tags | Implemented | Tag-based classification for personas |
| Admin Dashboard | Partially implemented | Summary stats and navigation for admins |
| Feature Management | Not implemented | Enable/disable optional product features per org |
| Email Configuration | Not implemented | SMTP setup for notifications and password reset |
| Backup & Export | Not implemented | Data export and backup tooling |
| Security Settings | Not implemented | Session timeouts, password policy, IP restrictions |

---

## 7. Multi-Organization Federation

Allows organizations to connect, share content, and link local EA artifacts to enterprise-wide counterparts while preserving each org's autonomy.

| Capability | Status | Description |
|---|---|---|
| Org Connections | Prototype | Establish and manage connections between organizations |
| Content Visibility | Prototype | Control which content is visible at org / connections / instance level |
| Cross-Org Linking | Prototype | Link local capabilities and personas to enterprise counterparts |
| Cross-Org Link Approval | Scaffolded | Review and approve or reject incoming cross-org link requests |

**Visibility levels:**

| Level | Visible to |
|---|---|
| `org` | This organization only |
| `connections` | This org and all directly connected orgs |
| `instance` | All orgs on the same GovEA instance |

**Design principle:** Single-org installs work identically without federation UI or complexity. Federation is opt-in from the agency side — no org can be forced into a connection. Content ownership never transfers across org boundaries.

Current reality: federation is no longer just schema groundwork. Connection-aware visibility, cross-org linking, and write-protection guardrails exist, but approval flows and deeper hardening are still in progress.

---

## 8. Repository & Modelling

Reliability, navigability, and self-auditing of the architecture store.

| Capability | Status | Description |
|---|---|---|
| Audit Trail | Implemented | Immutable log of all create/update/delete events with before/after JSON |
| Repository Completeness | Partially implemented | Early dashboard signals showing where the EA object store has gaps |
| End-to-End Traceability | Not implemented | Cross-layer impact analysis from strategic goals through capabilities to applications |
| Architecture Debt Tracking | Not implemented | Surface and track decisions and conditions that constrain future options |

This group is strategically important, but today it is still mostly documented direction plus a small amount of shipped dashboarding rather than a mature product surface.

**Out of scope for v1:**
- Multi-framework modelling (ArchiMate, BPMN, UML) — GovEA uses enforced relationship chains and plain-language descriptions, not formal notation
- Meta-model customization — the GovEA meta-model is fixed in v1; custom content types extend it without changing the core

---

## Capability Target Surface

GovEA's long-term capability surface spans 8 groups, each defined through the EasyEA workflow: persona validation → capability definition → ARB review → implementation issues.

| Group | Near-term priorities |
|---|---|
| Repository & Modelling | End-to-end traceability, architecture debt tracking |
| Application & IT Portfolio | Technology lifecycle tracking, rationalization views |
| Business & Capability Architecture | Capability heat maps, operating model views |
| Planning & Analysis | Scenario planning, value stream analytics |
| Governance & Compliance | ARB review workflow, regulatory mapping |
| Integration | ITSM/CMDB connectors, DevOps pipeline links |
| Collaboration & Stakeholder Engagement | Change notifications, stakeholder-facing plain-language views |
| Reporting & Documentation | Configurable reports, KPI tracking, elected-official summaries |

Capabilities are added one at a time as personas are validated and pain points confirmed. The roadmap is driven by real government EA practitioner needs, not feature parity with commercial tools.
