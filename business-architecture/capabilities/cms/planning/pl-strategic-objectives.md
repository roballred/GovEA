# Capability: Strategic Objectives

## What It Does
The system must allow organizations to define measurable strategic objectives, link them to the capabilities and value streams that deliver on them, and track their status over time. This closes the gap between stated strategy and the architecture that enables it. In the shipped product, objectives sit under Goals in the planning hierarchy and are the planning artifact that most closely follows the standard governed-content model.

## Personas
- **Enterprise Architect (Central IT)** — defines enterprise-level objectives and links them to enterprise capabilities
- **Agency EA Coordinator** — maintains agency-level objectives tied to the agency's capability portfolio
- **Department Director** — views how strategic objectives connect to current capabilities and investment priorities; does not author

## Behaviors
- Create a strategic objective with name, description, success metric, time horizon, and status
- Link a strategic objective to a goal
- Link a strategic objective to one or more capabilities
- Link a strategic objective to one or more value streams
- View which capabilities and value streams support a given objective
- View which goal a given objective advances
- View which objectives a given capability or value stream contributes to
- Track objective status through the standard content workflow (`draft`, `published`, `archived`)
- Share objectives across federation scopes using visibility settings (`org`, `connections`, `instance`)

## Rules
- A strategic objective must belong to an organization
- In the current shipped model, an objective belongs to one goal
- Strategic objectives follow the standard content workflow: draft → published → archived
- An objective's success metric is optional but strongly encouraged — objectives without measurable outcomes are flagged as incomplete in the admin dashboard
- Linking to capabilities and value streams is optional but recommended; unlinked objectives are architecturally orphaned and should surface as a completeness signal
- Admin planning surfaces are authenticated workspace views; visibility across organizations is controlled by federation scope rather than a separate planning-only publication rule

## Implementation Status
Shipped (v1). Strategic Objective CRUD, capability and value-stream linking, goal anchoring, standard `draft / published / archived` workflow, and cross-org federation are in place. Aggregate roll-ups and completeness signals for unlinked objectives are surfaced on the admin dashboard.

## Links
- Depends on: Content Management — Content Workflow, Content Relationships
- Related: Goals, Capabilities, Value Streams, Initiatives, Roadmap
