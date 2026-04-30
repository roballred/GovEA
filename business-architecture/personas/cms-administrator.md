# Persona: CMS Administrator

**Validation Status: Assumed** — drafted without direct user research. Pain points and goals are plausible but generic. Must not drive implementation beyond what is already built until validated through interviews with real government IT administrators in a state or local government context (1–3 person IT shop).

## Role Type
Internal — Back-end administrator

## Who They Are
The CMS Administrator is the person responsible for setting up, configuring, and maintaining GovEA for a single organization. In a government context this is typically a senior IT staff member or system owner — not a developer, but technically capable. They manage who has access, what content types exist, and how the organization's workspace behaves. They are accountable for data integrity and system security inside their own tenant, not for platform-wide operations across every org on the instance.

## Goals
- Configure and maintain content types, taxonomies, and workflows without writing code
- Manage user accounts, roles, and permissions from a single interface
- Configure organization-scoped settings such as themes, enabled modules, and similar workspace behavior without platform-operator help
- Connect the system to the agency's identity provider (e.g. Microsoft Entra ID / SSO) without custom development
- Audit who changed what and when, and be able to roll back or review changes
- Keep the system running predictably with minimal ongoing maintenance

## Pain Points
- Current tools require developer involvement for routine configuration changes
- No clear audit trail — hard to answer "who changed this and when"
- User provisioning is manual and error-prone, especially when staff turn over
- It is often unclear which settings belong to the agency versus the platform operator
- SSO integration is either unavailable or requires expensive professional services
- Role and permission models are too coarse (all or nothing) or too complex to manage

## Critical Insight
The CMS Administrator is not a developer and should never need to be. If ordinary organization administration requires code changes, CLI access, or filing a platform-operator ticket for routine workspace settings, the system has failed this persona. Every org-scoped configuration action they need must be available through the UI, and every access decision must be auditable.

## Data Stored About This Persona

GovEA stores the following personal data about CMS Administrator accounts:

| Data | Purpose | Retention |
|---|---|---|
| Full name | Display in audit log and UI | Retained for the life of the account |
| Email address | Authentication, notifications, audit log | Retained for the life of the account |
| Hashed password | Local authentication (if not SSO-only) | Retained until account is deleted |
| Role assignment | Access control | Retained for the life of the account |
| Login timestamps | Audit trail | Subject to audit log retention policy (default: 12 months) |
| Action history | Audit trail — records all content and IAM changes | Subject to audit log retention policy |

**Authority:** Data is collected under the agency's IT system administration authority. No data is shared with third parties. No data is used for purposes other than operating the system.

**Access and deletion:** An Admin can deactivate their own account or have another Admin do so. Deactivation prevents login but does not delete audit trail entries — those are immutable by design. To fully remove personal data, a database-level deletion is required; this is a manual process documented in the deployment guide.

## Relevant Capabilities
- Back-end content administration
- Organization-scoped configuration and settings
- User and role management
- Identity and access management (SSO integration)
- Audit trail and change history
