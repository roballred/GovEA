# Capability: Risk Tracking

## What It Does

The system must allow architecture teams to record, manage, and explain risks that affect architecture decisions, delivery outcomes, public services, and stakeholder trust. Risks should be linked to the architecture repository so uncertainty is visible in the same place as capabilities, applications, initiatives, services, data, personas, ADRs, and architecture debt.

Risk tracking exists to make uncertainty discussable and actionable. It should help teams decide what to mitigate, what to monitor, what to accept, and what should influence roadmap sequencing.

## Personas

- **Enterprise Architect (Central IT)** - needs to surface architecture risks in plain language and connect them to roadmap, capability, and decision context before leadership makes investment choices
- **Agency EA Coordinator** - needs to document local risks without turning GovEA into an audit mechanism or exposing sensitive agency details by default
- **Department Director** - needs to understand which risks could affect service delivery, funding, or public outcomes
- **Budget & Performance Analyst** - needs to see where risk could drive cost, timing, or performance impacts

> Enterprise Architect, Agency EA Coordinator, Department Director, and Budget & Performance Analyst are **Assumed** personas for this capability. Implementation should treat stakeholder-facing risk summaries as elevated product-fit risk until these personas are validated through direct research.

## Behaviors

- Create a risk with a plain-language statement, category, likelihood, impact, severity, status, owner, mitigation, review date, and optional accepted-risk rationale
- Encourage risk statements in an `If / then` or equivalent structure that describes the uncertain event and its consequence
- Link risks to capabilities, applications, services, value streams, initiatives, goals, objectives, personas, data entities, ADRs, architecture debt, and glossary terms as those object types become supported
- View all risks for the active organization in a list filtered by category, severity, status, owner, and review date
- Show linked risks on object detail pages so users can see uncertainty in context
- Surface executive rollups for top risks by capability, service area, initiative, or application
- Distinguish organization-owned risks from risks shared through federation or connections
- Require rationale and review date when a risk is accepted
- Restrict security-sensitive risk details to Admin and Contributor roles
- Audit accepted-risk rationale, sensitivity classification changes, and classification overrides

## Rules

- Risks belong to an organization and default to organization-only visibility
- Risk creation and editing use the user's active organization and that organization's role
- A person may be an Admin in one organization and a Viewer in another; risk permissions must be evaluated per organization
- Risk is distinct from architecture debt:
  - debt is a known current compromise or weakness
  - risk is possible future harm or uncertainty
- A debt item may create one or more risks, and a risk may exist without a debt item
- Accepted risks require written rationale and a review date
- Closed risks must preserve history rather than disappearing from linked objects
- Viewer-facing risk summaries must avoid precise vulnerability, exploit, or sensitive control details
- Security-sensitive risks remain hidden from Viewer-role users even if their parent object is published
- Federation must not turn risk tracking into central surveillance; other organizations only see risks that the owning organization explicitly shares

## Implementation Status

Proposed. No first-class risk object exists yet. GovEA currently has related but narrower concepts:

- a process risk register for backlog grooming in `docs/risk-register.md`
- application risk portfolio cues in `fd-application-risk-portfolio`
- architecture debt tracking in `rm-architecture-debt`

This capability defines the missing product surface for architecture and delivery risk tracking.

## Links

- Depends on: `rm-end-to-end-traceability`, `rm-architecture-debt`, `po-application-portfolio`, `po-capability-map`, `pl-initiatives`, `mo-content-visibility`
- Enables: stakeholder-friendly executive risk rollups, roadmap risk review, accepted-risk governance, risk-informed architecture decisions
- Related: `fd-application-risk-portfolio`, `rm-repository-completeness`, `po-architecture-decisions`, `iam-audit-trail`
