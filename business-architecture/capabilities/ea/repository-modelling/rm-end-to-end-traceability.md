# Capability: End-to-End Traceability

## What It Does

The system must allow any user to follow a chain of relationships across the full architecture — from strategic objectives through capabilities to applications and technology — in either direction, and must surface where those chains are broken or incomplete.

## Personas

- **Enterprise Architect (Central IT)** — needs to see the full impact of a proposed change or decommission before it happens; wants to identify which agencies have redundant applications serving the same capability
- **Agency EA Coordinator** — needs to demonstrate that their agency's technology investments are grounded in real capability needs; needs to see which capabilities have no supporting applications (gaps), not just which applications exist
- **Department Director** — needs a single navigable view showing how their department's strategy connects down to the specific applications and people their teams depend on; currently this information is scattered across tools and requires architect interpretation

> ⚠️ Enterprise Architect and Agency EA Coordinator are **Assumed** personas. Traceability behaviors below reflect persona goals and pain points as currently understood and must be validated before implementation.

## Behaviors

- From any strategic objective, navigate to linked initiatives, then to the capabilities those initiatives affect, then to the applications supporting each capability
- From any application, navigate upward to linked capabilities, then to the personas those capabilities serve, then to any strategic objectives or initiatives connected to those capabilities
- From any persona, see the full set of capabilities defined for them and the applications enabling each capability
- Impact panel: select any object and see all directly and indirectly connected objects, grouped by type (objectives, capabilities, applications, personas, ADRs)
- Broken chain indicator: surface objects where a required link is missing — applications with no capability, capabilities with no application, capabilities with no persona, personas with no capability
- Cross-agency view (Enterprise Architect only): across connected organizations, show which capabilities are served by multiple independent applications — potential rationalisation signals

## Rules

- The core chain constraint (every Application links to a Capability; every Capability links to a Persona) is enforced at publish time and cannot be bypassed
- Traceability navigation is read-only — no editing occurs within the trace view
- Cross-agency traceability is available only to Enterprise Architect role and only where federation connections have been established and content is marked as `connections` or `instance` visibility
- Broken chain indicators are visible to Contributors and Admins; they do not surface to Viewers (Viewers only see published, complete content)

## Implementation Notes

- The core chain (Personas → Capabilities → Applications) is already enforced in the data model and publish workflow
- What is not yet implemented: reverse traversal UI, impact panel, broken chain indicators, cross-agency views
- Technology layer (infrastructure, platforms) is a natural extension of this chain but is not in scope until the Technology Lifecycle capability set is defined

## Links

- Depends on: `cm-content-relationships`, `po-capability-map`, `po-application-portfolio`, `mo-content-visibility`
- Related: `rm-repository-completeness`, `pl-strategic-objectives`, `pl-initiatives`, `pl-roadmap`
- Personas served: Enterprise Architect, Agency EA Coordinator, Department Director
