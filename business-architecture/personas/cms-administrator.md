# Persona: CMS Administrator

**Validation Status: Assumed** — drafted without direct user research. Pain points and goals are plausible but generic. Must not drive implementation beyond what is already built until validated through interviews with real government IT administrators in a state or local government context (1–3 person IT shop).

## Role Type
Internal — Back-end administrator

## Who They Are
The CMS Administrator is the person responsible for setting up, configuring, and maintaining the content management system. In a government context this is typically a senior IT staff member or system owner — not a developer, but technically capable. They manage who has access, what content types exist, and how the system behaves. They are accountable for data integrity and system security.

## Goals
- Configure and maintain content types, taxonomies, and workflows without writing code
- Manage user accounts, roles, and permissions from a single interface
- Connect the system to the agency's identity provider (e.g. Microsoft Entra ID / SSO) without custom development
- Audit who changed what and when, and be able to roll back or review changes
- Keep the system running predictably with minimal ongoing maintenance

## Pain Points
- Current tools require developer involvement for routine configuration changes
- No clear audit trail — hard to answer "who changed this and when"
- User provisioning is manual and error-prone, especially when staff turn over
- SSO integration is either unavailable or requires expensive professional services
- Role and permission models are too coarse (all or nothing) or too complex to manage

## Critical Insight
The CMS Administrator is not a developer and should never need to be. If administrative functions require code changes or CLI access, the system has failed this persona. Every configuration action they need to perform must be available through the UI, and every access decision must be auditable.

## Relevant Capabilities
- Back-end content administration
- User and role management
- Identity and access management (SSO integration)
- Audit trail and change history
