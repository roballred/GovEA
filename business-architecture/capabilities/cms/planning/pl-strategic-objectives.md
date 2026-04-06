# Capability: Strategic Objectives

## What It Does
The system must allow organizations to define strategic business objectives, link them to the capabilities and value streams that deliver on them, and track their status over time. This closes the gap between stated strategy and the architecture that enables it.

## Personas
- **Enterprise Architect (Central IT)** — defines enterprise-level objectives and links them to enterprise capabilities
- **Agency EA Coordinator** — maintains agency-level objectives tied to the agency's capability portfolio
- **Department Director** — views how strategic objectives connect to current capabilities and investment priorities; does not author

## Behaviors
- Create a strategic objective with name, description, success metric, time horizon, and status
- Link a strategic objective to one or more capabilities
- Link a strategic objective to one or more value streams
- View which capabilities and value streams support a given objective
- View which objectives a given capability or value stream contributes to
- Track objective status through a defined lifecycle (draft, active, achieved, on-hold, cancelled)
- Publish objectives so they are visible to non-admin users

## Rules
- A strategic objective must belong to an organization
- Strategic objectives follow the standard content workflow: draft → published → archived
- Only published objectives are visible to Viewer-role users
- An objective's success metric is optional but strongly encouraged — objectives without measurable outcomes are flagged as incomplete in the admin dashboard
- Linking to capabilities and value streams is optional but recommended; unlinked objectives are architecturally orphaned and should surface as a completeness signal

## Links
- Depends on: Content Management — Content Workflow, Content Relationships
- Related: Capabilities, Value Streams, Initiatives, Roadmap
- Personas served: Enterprise Architect, Agency EA Coordinator, Department Director
