# Capability Group: Planning

The system must allow organizations to document their strategic direction, track the initiatives delivering on that direction, and visualize the relationship between strategy, initiatives, and the architecture portfolio. In the current product this is a strong early-v1 capability: demo-ready and useful, but not yet semantically uniform across every planning artifact.

## Personas
- **Enterprise Architect (Central IT)** — publishes enterprise-wide objectives and tracks capability alignment across agencies
- **Agency EA Coordinator** — maintains the agency's strategic objectives and links them to capabilities and value streams
- **Department Director** — consumes planning outputs to understand how technology investments connect to strategic priorities

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Strategic Objectives | [pl-strategic-objectives.md](./pl-strategic-objectives.md) | Define and track business goals using the standard content workflow; link to capabilities and value streams |
| Initiatives | [pl-initiatives.md](./pl-initiatives.md) | Track change programmes using planning lifecycle states; link to capabilities and objectives with impact |
| Roadmap | [pl-roadmap.md](./pl-roadmap.md) | Visualize initiatives and objectives in a read-only status-grouped roadmap view |

## Design Principle
Planning capabilities are a lens on existing architecture content — they do not exist in isolation. Strategic objectives trace to capabilities and value streams. Initiatives trace to objectives and capabilities. The roadmap visualizes initiative timelines against the architecture they affect. Nothing in this capability group is meaningful unless the underlying capability and persona content is maintained.

## Current Semantic Model
- Strategic objectives are treated like governed content: they use the standard workflow (`draft`, `published`, `archived`) plus visibility settings.
- Initiatives are treated like planning records: they use planning lifecycle states (`proposed`, `active`, `on-hold`, `complete`, `cancelled`) plus optional start/end dates.
- The roadmap is a rendered view over initiative records. It groups initiatives by planning status and shows their linked objectives and capabilities.
- This is intentionally good enough for demos and early-v1 use, but still evolving. A future iteration may unify planning semantics further, but the current docs should describe the shipped split model accurately.
