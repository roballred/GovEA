# Capability: Goals

## What It Does
The system must allow organizations to define broad strategic goals above strategic objectives, so GovEA can distinguish long-horizon outcomes from the measurable objectives and initiatives that advance them. In the shipped product, goals are the top layer of the planning hierarchy and roll up linked objectives, initiatives, capabilities, and value streams.

## Personas
- **Enterprise Architect (Central IT)** — defines enterprise-wide strategic goals and ensures objectives align to them
- **Agency EA Coordinator** — maintains agency-level goals and keeps linked objectives coherent
- **Department Director** — views leadership-facing goals and how current objectives and initiatives support them; does not author

## Behaviors
- Create a goal with name, description, and status
- Link a goal to one or more strategic objectives
- View rolled-up initiatives and capabilities through linked objectives
- View traceability from a goal into supporting objectives, initiatives, and architecture records
- Filter and search goals in the strategy area
- Share goals across federation scopes using visibility settings (`org`, `connections`, `instance`)

## Rules
- A goal must belong to an organization
- Goals represent broad outcomes and are intentionally fewer and more stable than objectives
- In the current shipped model, objectives are the measurable targets under a goal; initiatives continue linking to objectives rather than directly to goals
- Goals follow the standard content workflow: draft -> published -> archived
- Goal-to-objective linkage is the source of strategy rollup for roadmap, traceability, and related planning surfaces

## Implementation Status
- **v1:** Implemented. Goals ship as a first-class planning entity with list/detail pages, CRUD, objective linking, rolled-up traceability context, and viewer filtering.
- **Strategy (ADR-0005):** Implemented. Strategy ships as a first-class **course-of-action** entity that pursues Goals and maps onto the operating model (capabilities, value streams) and the initiatives that deliver it. Includes CRUD + lifecycle (`proposed`/`active`/`achieved`/`abandoned`), Strategy↔Goal/Capability/Value-Stream/Initiative linking from both sides, a `from=strategy` traceability root, active-strategy surfaces on Executive/Roadmap/Dashboard, and backup/export + seed parity. (Supersedes the ADR-0004 planning-container design.)

## Links
- Depends on: Strategic Objectives, Content Workflow, Content Relationships
- Related: Initiatives, Roadmap, Traceability Views
