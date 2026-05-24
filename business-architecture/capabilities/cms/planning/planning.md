# Capability: Planning

**Scope:** v1

## What It Does

The system must allow organizations to document their strategic direction, track the initiatives delivering on that direction, and visualize the relationship between strategy, initiatives, and the architecture portfolio. In the current product this is a strong early-v1 capability: demo-ready and useful, but not yet semantically uniform across every planning artifact.

## Personas
- **Enterprise Architect (Central IT)** — publishes enterprise-wide objectives and tracks capability alignment across agencies
- **Agency EA Coordinator** — maintains the agency's strategic objectives and links them to capabilities and value streams
- **Department Director** — consumes planning outputs to understand how technology investments connect to strategic priorities

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Goals | [pl-goals.md](./pl-goals.md) | Define broad strategic outcomes above objectives and roll up supporting planning context |
| Strategic Objectives | [pl-strategic-objectives.md](./pl-strategic-objectives.md) | Define measurable objectives under goals using the standard content workflow; link to capabilities and value streams |
| Initiatives | [pl-initiatives.md](./pl-initiatives.md) | Track change programmes using planning lifecycle states; link to capabilities and objectives with impact |
| Roadmap | [pl-roadmap.md](./pl-roadmap.md) | Visualize initiatives and objectives in a read-only status-grouped roadmap view |

## Design Principle
Planning capabilities are a lens on existing architecture content — they do not exist in isolation. Goals roll up strategic intent. Strategic objectives trace to capabilities and value streams. Initiatives trace to objectives and capabilities. The roadmap visualizes initiative timelines against the architecture they affect. Nothing in this capability group is meaningful unless the underlying capability and persona content is maintained.

## Success Criteria

- A leader can answer "what is our strategy in this domain, and what is changing it?" by walking from a goal through its objectives to the initiatives in flight, without leaving the planning surface
- Every published strategic objective is traceable to at least one capability — orphaned objectives surface as a completeness signal
- Initiatives surface their impact on capabilities (`builds`, `enhances`, `retires`, `depends-on`) so the roadmap is meaningful at the capability level, not just a Gantt chart
- The roadmap renders the same data the planning records hold — no separate authoring surface for roadmap layout
- Cross-org federation visibility applies consistently to goals, objectives, initiatives, and roadmap views

## Rules

- Goals and strategic objectives use the standard `draft / published / archived` content workflow plus visibility settings (`org`, `connections`, `instance`)
- Goals sit above objectives in the shipped hierarchy: Goal → Objective → Initiative
- Initiatives use planning lifecycle states (`proposed`, `active`, `on-hold`, `complete`, `cancelled`) plus optional start/end dates — not the standard content workflow
- The roadmap is a rendered view over initiative records — there is no separate authoring surface
- ADRs and initiatives apply the viewer-status mappings defined in [Content Workflow](../content-management/cm-content-workflow.md), not the published-only core rule

## Implementation Status

Shipped (v1). Goals, Strategic Objectives, Initiatives (with cross-initiative overlap/conflict view #602), and the roadmap visualization are all in place with their respective lifecycle states, linkages, and federation visibility. The biggest early semantic blur — Goal vs Objective — was corrected by separating goals from objectives in the shipped planning model.

## Links

- Depends on: Content Management — Content Workflow, Content Management — Content Relationships, IAM — Role-Based Access Control
- Related: Portfolio (Capabilities, Value Streams), Frontend Display (Executive Roadmap Timeline)
