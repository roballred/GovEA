# Capability Group: Repository & Modelling

The system must maintain a reliable, navigable, and self-auditing store of all architecture objects — capabilities, applications, personas, decisions, and technology — and surface the relationships, gaps, and accumulated debt within that store so that architects and decision-makers can trust what they see. In the current product, most of this group remains roadmap work beyond the existing audit trail and early coverage signals.

## Personas

- **Enterprise Architect (Central IT)** — needs confidence that the repository reflects reality and can show the impact of a change before it happens
- **Agency EA Coordinator** — needs to maintain their portion of the repository without central IT involvement and see where their agency's architecture has gaps
- **Department Director** — needs a traceable path from their department's strategy down to the specific applications and people affected

> ⚠️ Enterprise Architect and Agency EA Coordinator are **Assumed** personas. Capabilities in this group carry elevated implementation risk until those personas are validated through direct user research.

## Sub-Capabilities

| Capability | File | Status | Description |
|---|---|---|---|
| End-to-End Traceability | [rm-end-to-end-traceability.md](./rm-end-to-end-traceability.md) | Partially implemented | Objective, capability, and service trace views exist, and application/capability impact analysis is shipped; broader cross-layer and cross-agency traversal remains future work |
| Architecture Debt Tracking | [rm-architecture-debt.md](./rm-architecture-debt.md) | Not implemented | Surface and track decisions and conditions that constrain future options |
| Risk Tracking | [rm-risk-tracking.md](./rm-risk-tracking.md) | Proposed | Record and manage architecture and delivery risks linked to repository objects and mitigation decisions |
| Repository Completeness | [rm-repository-completeness.md](./rm-repository-completeness.md) | Scaffolded | Early signals and dashboards showing where the EA object store has gaps |

## Capabilities Covered Elsewhere

The following market research capabilities in this group are substantively addressed by existing GovEA capability definitions and do not require separate definitions here:

| Market Capability | Covered By |
|---|---|
| Architecture Repository | `cm-content-versioning`, `cm-content-relationships`, `po-capability-map`, `po-application-portfolio`, `iam-audit-trail` |
| Architecture Decision Records | `po-architecture-decisions` |

## Out of Scope

| Market Capability | Rationale |
|---|---|
| Multi-Framework Modelling (ArchiMate, BPMN, UML, SysML, Zachman) | GovEA uses plain-language descriptions and enforced relationship chains, not formal modelling notations. Adding notation frameworks would increase complexity without serving the state and local government audience, where most EA practitioners are not modelling-certified. Optional framework alignment, such as mapping GovEA records to TOGAF concepts, is covered separately by `ea/framework-alignment`. |
| Meta-Model Customisation | The GovEA meta-model (Organization → Personas, Capabilities, Applications, ADRs, Technology) is fixed in v1. Custom content types are available via `cm-content-types` for extensions. Full meta-model modification is deferred beyond v1. |

## Deferred

| Market Capability | Rationale |
|---|---|
| Knowledge Graph Exploration | Graph-based navigation to surface unexpected dependencies has value but no directly validated pain point in state and local government EA at v1 scale. Deferred to v2 pending persona validation and repository size warranting graph tooling. |

## Design Principle

Trust is the foundation of this capability group. An architecture repository that nobody believes is worse than no repository at all. Every capability in this group exists to increase trust: traceability shows the chain is real, debt tracking makes the gaps honest, and completeness signals tell users exactly what to rely on and what to take with caution.
