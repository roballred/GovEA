# Persona: Junior EA / EA Analyst

**Validation Status: Assumed** — derived from cross-tool market research (2026) and patterns observed across EA tool adoption studies. Must not drive implementation until validated through interviews with real junior architects or EA analysts in a state or local government context.

## Role Type
Internal — Agency IT / Central IT (junior contributor)

## Government Equivalent
New IT staff or business analyst assigned part-time to EA repository maintenance. May be the Enterprise Architect's only direct support. Does not yet have a clear model of what a capability map is or why relationship integrity matters — learning on the job.

## Who They Are
The Junior EA Analyst is typically 1–3 years into an architecture role, often having transitioned from business analysis, project management, or application support. They work within an established EA team — often a team of 2–5 led by a more senior architect — and are responsible for the day-to-day maintenance of the EA repository: updating the capability map, adding new applications, recording relationship links, and producing views for stakeholder reviews.

In government, this role is common in medium-to-large agencies and central IT shops that have made an EA practice investment. The analyst handles the operational layer of EA work that senior architects and coordinators do not have time for.

## Goals
- Maintain and update the EA repository accurately without introducing errors or breaking existing relationships
- Produce capability maps, application inventories, and stakeholder views that the lead architect can present without rework
- Understand the EA methodology well enough to apply it independently — not just follow instructions
- Build credibility with delivery teams, who are often sceptical of EA's value and unlikely to engage voluntarily
- Develop skills that move them toward a senior EA or solution architect role

## Pain Points
- There are no guardrails — it is easy to overwrite or misclassify data in ways that are hard to detect until damage is already done in the repository
- It is difficult to know whether a relationship change or status update is correct, or whether it silently breaks a chain elsewhere in the model
- Onboarding documentation and help resources are written for experienced architects, not for analysts learning on the job
- Senior architects review work infrequently; there is no way to self-validate quality before a mistake propagates
- Getting context from delivery teams is slow and awkward — engineers and project managers expect the analyst to come to them, not the other way around
- Contributing to the wrong capability domain or duplicating an existing record is a common error with no warning mechanism

## Critical Insight
The Junior EA Analyst is the fastest-growing segment of EA tool users as practices mature and repository maintenance scales beyond what a single senior architect can manage alone. They are also the group most likely to degrade repository quality if the tool does not provide guidance, validation, and soft guardrails. Designing for this persona is not about simplification — it is about making correct contribution the path of least resistance.

## Relevant Capabilities
- Guided templates and starter patterns — reduces first-contribution errors before the analyst has internalised the methodology
- Content authoring and editing with relationship validation — catches misclassified records, broken chains, and missing required fields at save time, not at the next stakeholder review
- Content workflow (draft → review → publish) as a quality gate
- Repository completeness signals — to know what is missing before being asked
- Relationship navigation and impact visualisation — see downstream effects before changes propagate; replaces the senior architect review as the first line of quality control
- Role-based access with guardrails — limits blast radius without blocking contribution; Contributor role limits delete access, workflow gates require publish confirmation
