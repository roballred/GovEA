# Persona: Programme Director

**Validation Status: Assumed** — drafted from the 2026 EA market research and patterns observed in government IT transformation programmes. Must not drive implementation until validated through interviews with real IT programme managers or senior project leads in a state or local government context.

## Role Type
Internal — Senior Delivery Leadership (cross-agency or central IT)

## Government Equivalent
IT Programme Manager or Senior Project Lead responsible for delivering a transformation programme across multiple agencies, systems, or capability domains. In government this role may carry titles such as Programme Director, ICT Programme Manager, Senior Responsible Owner (SRO), or Transformation Lead.

## Who They Are
The Programme Director is accountable for delivering a complex, in-flight technology programme — typically spanning multiple applications, agencies, or capability domains. They need to understand dependency chains, decommission timelines, and the downstream impact of sequencing decisions before those decisions become delivery incidents.

They are not architects. They are not interested in EA methodology. They need architecture data that answers specific delivery questions: what breaks if we decommission this system before the replacement is live? Which applications share a dependency that creates a sequencing constraint? What does the EA team's roadmap say about the platform their programme depends on?

Unlike the Department Director, who asks strategic investment questions over a 3–5 year horizon, the Programme Director needs dependency-level detail for decisions being made this sprint or this quarter.

## Goals
- Understand application dependencies before committing to a delivery sequence — so sequencing decisions are based on actual dependency data, not assumptions
- Know what technology is being decommissioned and when, so programme plans can accommodate those timelines without last-minute surprises
- See the impact of programme changes on other parts of the organisation before they become incidents — proactive dependency checking, not post-incident discovery
- Engage with architecture reviews without feeling like a gate — the EA team should be a resource, not a bottleneck
- Access architecture outputs self-service, without submitting a ticket or waiting for a meeting to get a straightforward dependency answer

## Pain Points
- EA outputs are too technical or incomplete to support delivery decisions — diagrams and framework documents rather than queryable, filtered views
- Architecture views are in tools the Programme Director cannot access — they receive PDFs or slide decks, not live information they can explore
- The EA team is a bottleneck — every dependency question requires a ticket or a calendar invite, delaying decisions that should take minutes
- EA roadmaps and programme roadmaps rarely match — the EA team's planned decommission dates and the programme's actual delivery dates are maintained in separate systems with no synchronisation
- When the EA team does produce architecture outputs, they are scoped to the whole portfolio rather than filtered to what is relevant to a specific programme

## Critical Insight
The Programme Director will engage with GovEA only if dependency lookups and impact analysis are self-service, filtered to their scope, and written in plain language. If the EA team is still required as an interpreter between the architecture repository and delivery decision-making, this persona will default to asking colleagues or making assumptions. The value of EA to programme delivery is unlocked exactly at the point where the Programme Director can answer their own questions.

## Distinction from Department Director

| | Department Director | Programme Director |
|---|---|---|
| Decision type | Investment and strategy | Delivery sequencing |
| Primary EA question | "What does technology X enable?" | "What breaks if I decommission Y?" |
| Time horizon | 3–5 years | Current sprint or next quarter |
| Access need | Published summary views | Dependency-level detail filtered to programme scope |
| EA relationship | Reads outputs to inform investment decisions | Needs self-service access to answer specific delivery questions |

## Relevant Capabilities
- Self-service dependency lookup and impact analysis
- Application portfolio filtered views (lifecycle status, dependencies, decommission timeline)
- Traceability views (capability-to-application chains relevant to programme scope)
- Plain-language EA summaries
- Technology lifecycle tracking and decommission signal surfacing
- Change notifications when programme-relevant content changes
