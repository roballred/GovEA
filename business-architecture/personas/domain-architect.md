# Persona: Domain Architect

**Validation Status: Assumed** — derived from cross-tool market research (2026) and patterns observed across EA tool adoption studies. Must not drive implementation until validated through interviews with real domain architects (data, security, network, integration) in a state or local government context.

## Role Type
Internal — Agency IT or Central IT (specialist contributor)

## Government Equivalent
Solution Architect, Data Architect, Security Architect, or Network Architect at a specific agency or central IT division. Deep technical expertise in one domain. Contributes to the EA repository as a specialist, not as its owner or administrator.

## Who They Are
The Domain Architect is a specialist — a Data Architect, Security Architect, Network Architect, or Integration Architect — who contributes to the EA repository for their specific domain. They are not the owner of the overall EA practice; that responsibility belongs to the Enterprise Architect or Agency EA Coordinator. They are a domain expert contributing accurate, current records for their slice of the architecture.

In government, this role is most common in large agencies, central IT shops, or shared services organisations where the EA team has enough depth to assign domain ownership. A Security Architect documenting security capabilities and their application dependencies, or a Data Architect maintaining a record of data flows and ownership, fits this profile.

## Goals
- Keep the domain layer of the EA repository current and accurate without requiring constant coordination with the lead architect
- Connect domain artefacts (security controls, data flows, network boundaries) to applications and business capabilities maintained by other architects
- Ensure that delivery teams consult the EA repository before making design decisions that affect their domain — reducing the number of post-hoc surprises
- Surface domain risks (unowned data, ungoverned integrations, obsolete security controls) through the EA model rather than through ad-hoc escalation
- Reduce the time spent re-explaining the same architectural constraints to different delivery teams independently

## Pain Points
- The EA model is structured around application and business capability architecture; specialist domains (data, security, network) are secondary citizens with no clear home
- Connecting domain objects to application and capability objects requires manual effort that quickly becomes stale as the rest of the model evolves
- Delivery teams do not check the EA repository before starting work in the domain — by the time the domain architect finds out a new data store or integration has been created, it is already in production
- Changes in adjacent domains (a new application, a capability retirement) do not notify the domain architect whose records are now inaccurate
- Other contributors can inadvertently overwrite or misclassify domain records, with no notification to the domain owner

## Critical Insight
Domain architects are the primary contributors to EA repository data quality in established practices, but they are rarely the primary audience in product design or vendor sales. Building contribution workflows, change notifications, and cross-domain relationship navigation for this persona is the most direct path to a repository that stays accurate and useful as the practice matures.

## Distinction from Agency EA Coordinator

| | Agency EA Coordinator | Domain Architect |
|---|---|---|
| Role type | Liaison / coordinator | Technical specialist |
| Contribution type | General EA content for an agency | Deep domain-specific content (data, security, network, integration) |
| Access need | Contributor access to agency content | Domain-scoped contribution; concerned with preventing inadvertent overwrites by others |
| EA knowledge | Moderate — learns EasyEA methodology | Deep — brings existing architectural expertise to the repository |
| Primary driver | Maintain the agency's full EA picture | Keep one domain layer accurate and consulted by delivery teams |

## Relevant Capabilities
- Content authoring and editing within a defined domain scope
- Cross-domain relationship navigation and traceability
- Content workflow (ensuring domain records go through review before publication)
- Repository completeness signals scoped to domain
- Role-based access control with domain-level contribution rights
