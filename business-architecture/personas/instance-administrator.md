# Persona: Instance Administrator

**Validation Status: Assumed** — drafted from the current platform-operations model in GovEA, not from direct user interviews. Must be validated with a real operator responsible for hosting or administering a shared GovEA instance before it drives major new implementation.

## Role Type
Internal — Platform operations / shared service administration

## Who They Are
The Instance Administrator operates GovEA as a shared platform across multiple organizations. This person may sit in central IT, a shared services team, or the hosting provider. They are responsible for tenant governance, platform access, and operational controls that span the whole instance. They are not the day-to-day owner of any one agency's EA content.

## Goals
- Add, suspend, and oversee organizations on the instance without database access
- Grant and remove platform-level admin rights intentionally and with auditability
- Investigate cross-tenant incidents safely without becoming a permanent editor inside every org
- Distinguish platform governance from agency-owned EA administration
- Keep the hosted or shared GovEA environment stable, supportable, and low-friction for participating organizations

## Pain Points
- Multi-tenant products often blur tenant admin and platform admin responsibilities
- Investigating support issues can require unsafe broad access or direct database work
- It is hard to answer which changes were platform actions versus agency actions
- Shared-service operators need guardrails so they do not accidentally take ownership of local agency content
- Provisioning and suspension are often scattered across scripts, infrastructure tools, and the app UI

## Critical Insight
The Instance Administrator needs platform-wide authority without platform-wide authorship. They should be able to govern the instance, manage tenants, and respond to incidents, but normal organization content and configuration should remain with the organization's own admins unless a clearly bounded break-glass path is used.

## Relevant Capabilities
- Instance administration
- Platform-level audit trail
- Organization lifecycle governance
- Break-glass access with expiry and audit
- Instance-admin promotion and demotion
