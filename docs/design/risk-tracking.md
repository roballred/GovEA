# Risk Tracking Capability

**Related issue:** [#500](https://github.com/roballred/GovEA/issues/500)  
**Capability:** `rm-risk-tracking`  
**Status:** Proposed

---

## Summary

GovEA should track architecture and delivery risks that affect government enterprise architecture decisions. This should be a lightweight product capability, not a full governance, risk, and compliance platform.

The core purpose is to help users explain uncertainty in plain language:

- what could go wrong
- what would be affected
- who owns the response
- what mitigation is underway
- which decisions, initiatives, or architecture objects depend on the outcome

## Product Boundary

Risk tracking should stay close to GovEA's architecture repository and EasyEA workflow.

GovEA should track:

- risks to capabilities, services, initiatives, applications, data, personas, and decisions
- risks created by architecture debt or incomplete repository knowledge
- risks that should influence roadmap sequencing or leadership discussion
- accepted risks that need a visible rationale and review date

GovEA should not try to replace:

- enterprise risk management systems
- audit case management
- compliance evidence repositories
- cybersecurity vulnerability management tools
- incident response platforms

The design center is practical architecture decision support for state and local government teams.

## Risk Versus Architecture Debt

Risk and architecture debt are related, but they are not the same object.

| Concept | Meaning | Example |
|---|---|---|
| Architecture Debt | A known compromise, weakness, or constraint that exists today | The permitting application is past vendor support |
| Risk | A possible future harm or uncertainty that may affect outcomes | If the unsupported permitting application fails during renewal season, service requests may be delayed |

Rules:

- A debt item may create one or more risks.
- A risk may exist without a debt item.
- A risk can be mitigated, monitored, accepted, transferred, or closed.
- Accepted risks require rationale and review date.
- Security-sensitive risk details must be protected even when summary information is useful to leadership.

## Core Fields

The initial Risk object should include:

| Field | Purpose |
|---|---|
| Risk statement | Plain-language `If / then` or equivalent statement |
| Category | Architecture, delivery, operational, data, security, adoption, funding, compliance, or custom org category |
| Likelihood | Low, medium, high |
| Impact | Low, medium, high |
| Severity | Derived or selected priority signal, aligned with existing severity language where practical |
| Status | Open, monitoring, mitigating, accepted, transferred, closed |
| Owner | Person or role responsible for monitoring and response |
| Mitigation | What is being done or planned |
| Review date | When the risk must be revisited |
| Accepted rationale | Required when status is accepted |
| Security-sensitive flag | Restricts details when disclosure would expose exploitable information |

## Relationships

Risks should link to the architecture objects they affect.

Candidate links:

- capabilities
- applications
- services
- value streams
- initiatives
- goals and objectives
- personas
- data entities
- ADRs
- architecture debt items
- glossary terms

Risk links should support two questions:

1. From this object, what risks should I know about?
2. From this risk, what architecture or delivery work is affected?

## User Experience

Risk tracking should feel like normal architecture work, not a compliance ceremony.

Expected surfaces:

- a Risk list page with filters for category, severity, status, owner, and review date
- an object detail section showing linked risks
- a create/edit form that encourages plain-language risk statements
- executive rollups for top risks by capability, initiative, service area, or application
- dashboard signals for overdue reviews and high-severity open risks

The UI should distinguish:

- risk owned by the active organization
- risk shared through federation or connections
- system-derived risk signals, if added later

## Federation and Multi-Organization Behavior

Risks belong to the organization that creates them.

Default visibility should be organization-only. Sharing risk records across organizations should require explicit visibility or federation rules.

If GovEA later supports one person belonging to multiple organizations, risk creation and editing should use the active organization and that organization's role. A person may be able to view a shared risk from another organization without being allowed to edit it.

## Viewer-Facing Behavior

Risk information can be valuable to viewers, but raw risk details can also be politically or operationally sensitive.

Viewer-facing surfaces should:

- use plain-language summaries
- hide implementation details marked security-sensitive
- avoid precise vulnerability or exploit information
- show accepted risks only when the owning organization has chosen to publish them
- make uncertainty explicit instead of implying false precision

## Security Classification

Risk records should include a `security_sensitive` control similar to architecture debt.

Sensitive examples:

- references to specific unpatched vulnerabilities
- details about exploitable configuration weaknesses
- internal control gaps not already public
- accepted-risk rationale explaining why a known vulnerability remains unresolved

Generally safe examples:

- public end-of-support dates
- general funding or adoption uncertainty
- broad dependency risk without exploitable details
- plain-language operational impact summaries

When in doubt, details should remain restricted to Admin and Contributor roles.

## Example Risks

| Risk | Category | Linked object |
|---|---|---|
| If the permitting system is not modernized before vendor support ends, permit processing may be disrupted during peak renewal periods | Operational | Application, Initiative |
| If the licensing capability has no named owner, roadmap decisions may be delayed or made without clear accountability | Governance | Capability |
| If agency coordinators do not trust repository completeness scores, leadership may ignore the executive dashboard | Adoption | Dashboard, Persona |
| If an accepted architecture debt item is not reviewed before budget planning, mitigation work may miss the next funding cycle | Funding | Architecture Debt, Initiative |

## Implementation Slices

### Slice 1: Documentation and model agreement

- Create the issue and supporting capability documentation.
- Confirm Risk versus Architecture Debt language.
- Decide whether Risk belongs in Repository & Modelling navigation or a broader planning/decision-support area.

### Slice 2: Risk object foundation

- Add schema and server actions for organization-owned risks.
- Add list, create, edit, and detail surfaces.
- Support basic links to at least one core object type.

### Slice 3: Cross-object surfacing

- Show linked risks on object detail pages.
- Add dashboard signals for top risks and overdue reviews.
- Add executive-friendly rollups.

### Slice 4: Federation and sensitive disclosure hardening

- Apply cross-org visibility rules.
- Enforce `security_sensitive` restrictions.
- Add audit logging for accepted risk rationale and classification overrides.

## Open Questions

- Should severity be user-selected, derived from likelihood and impact, or both?
- Should Risk have its own navigation item, or live under Architecture Repository / Decision Support?
- Which object type should be the first link target: application, capability, initiative, or architecture debt?
- Should accepted risk require approval by an Admin, or is Contributor ownership enough?
- Should risk categories be fixed system terms, organization taxonomy, or a hybrid?

## Related Work

- [#219](https://github.com/roballred/GovEA/issues/219) - application risk portfolio view
- [#381](https://github.com/roballred/GovEA/issues/381) - architecture debt tracking and ADR decision support
- [#463](https://github.com/roballred/GovEA/issues/463) - process risk register for backlog grooming
- [Architecture Debt Tracking](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md)
- [Application Risk Portfolio View](../../business-architecture/capabilities/cms/frontend-display/fd-application-risk-portfolio.md)
