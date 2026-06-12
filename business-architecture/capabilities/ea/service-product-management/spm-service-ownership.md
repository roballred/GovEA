# Capability: Service Ownership

## What It Does

Gives every service a structured, accountable owner instead of a free-text name. "Who owns this service?" is the most basic question in the product model and today has no reliable answer: the shipped `serviceOwner` field is free text — a name that goes stale the day someone changes roles, with no link to a real user, no notification path, and no way to list a person's services when they leave.

## Personas

- **Service Owner** — is the answer to the question; sees the services they own as a first-class list
- **CMS Administrator** — assigns and transfers ownership; sees ownerless services during onboarding/offboarding
- **Department Director** — knows who to ask about any service in their portfolio

## Behaviors

- Assign an accountable owner to a service as a structured reference (user, or named role/team where a person reference is premature)
- List all services owned by a person — the succession view: what must be handed over when they leave
- Surface ownerless services (no owner, or owner deactivated) as an explicit portfolio signal rather than silent staleness
- Preserve the free-text field's flexibility for orgs that track ownership outside GovEA (an external-owner label), without weakening the structured path

## Rules

- Ownership is accountability for the service, not authorship of the record — it grants no extra content permissions by itself
- Deactivating a user must not silently orphan their services: offboarding surfaces them for reassignment
- One accountable owner per service (deputies/teams are a display concern, not a second accountable party)
- Ownership changes are audit-logged like other settings-grade changes

## Implementation Status

**Not implemented.** `serviceOwner` ships today as free text on the services table. The structured-owner design (user vs role reference, succession flow, interaction with user deactivation) is a design question recorded in the group doc, gated on persona validation (#668).

## Links

- Depends on: Portfolio — Services (po-services), IAM — User Management, IAM — Audit Trail
- Enables: Service Portfolio Health (spm-service-portfolio-health), Outcome Measurement (spm-outcome-measurement)
- Related: domain-owner attribution patterns elsewhere in the repository
