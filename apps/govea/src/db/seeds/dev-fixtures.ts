// Synthetic data for development and testing.
// All dev users use the password 'dev-password' (hashed at seed time).
// Dev login shortcuts on the login page bypass password entry in development.
//
// Four organizations are seeded here; a fifth (City of Hartfield, TOGAF overlay
// demo) is defined in togaf-demo-fixtures.ts and seeded by run.ts as Org 5.
//
//   - City of Riverdale (primary dev org) — full EA content, admin + contributor shortcuts
//   - GovEA Project — dogfood org: GovEA models its own enterprise architecture
//   - Office of Digital Services (state agency) — second org for multi-org scenario
//   - GovEA Platform (system org, isSystemOrg=true) — operator org for instance admin
//
// An active org connection between City of Riverdale and Office of Digital Services
// and multiple cross-org capability links are created to exercise the federation/visibility use case.
//
// Dev login roster:
//   alice@govea.dev                    — City of Riverdale, Admin
//   carol@govea.dev                    — City of Riverdale, Contributor
//   aria@govea-project.govea.dev       — GovEA Project, Admin
//   sam@state.govea.dev                — Office of Digital Services, Admin
//   maya@hartfield.govea.dev           — City of Hartfield (TOGAF demo), Admin
//   ivan@govea.dev                     — GovEA Platform, Instance Admin (dev tools only)
//   nora@govea.dev                     — GovEA Platform, Instance Admin (dev tools only) — pair partner for break-glass approval workflows
//
// victor@govea.dev remains seeded as a Riverdale Viewer for automated role
// coverage, but is intentionally not shown as a dev login shortcut.

// ─── Orgs ────────────────────────────────────────────────────────────────────

export const DEV_ORG = {
  name: 'City of Riverdale',
  slug: 'city-of-riverdale',
}

export const STATE_ORG = {
  name: 'Office of Digital Services',
  slug: 'office-of-digital-services',
}

export const SYSTEM_ORG = {
  name: 'GovEA Platform',
  slug: 'govea-platform',
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const DEV_USERS = [
  { name: 'Alice Admin',       email: 'alice@govea.dev',  role: 'admin'       as const },
  { name: 'Carol Contributor', email: 'carol@govea.dev',  role: 'contributor' as const },
  { name: 'Victor Viewer',     email: 'victor@govea.dev', role: 'viewer'      as const },
]

export const STATE_USERS = [
  { name: 'Sam StateAdmin',    email: 'sam@state.govea.dev',   role: 'admin'       as const },
]

export const SYSTEM_USERS = [
  { name: 'Ivan InstanceAdmin', email: 'ivan@govea.dev', role: 'admin' as const, instanceRole: 'instance_admin' as const },
  { name: 'Nora InstanceAdmin', email: 'nora@govea.dev', role: 'admin' as const, instanceRole: 'instance_admin' as const },
]

// ─── GovEA Project ────────────────────────────────────────────────────────────
// Dogfood org: GovEA models its own enterprise architecture using the tool.

export const GOVEA_PROJECT_ORG = {
  name: 'GovEA Project',
  slug: 'govea-project',
}

export const GOVEA_PROJECT_USERS = [
  { name: 'Aria Admin', email: 'aria@govea-project.govea.dev', role: 'admin' as const },
]

// ─── Persona types & tags (taxonomy-backed) ──────────────────────────────────
// These are seeded as taxonomy terms under "Persona Type" and "Persona Tag"
// taxonomy types. Management happens in the Taxonomy page, not the Personas page.

export const DEFAULT_PERSONA_TYPES = [
  'Citizen',
  'Staff',
  'Elected Official',
  'External Partner',
]

export const DEFAULT_PERSONA_TAGS = [
  'mobile-first',
  'accessibility',
  'high-volume',
  'low-digital-literacy',
  'multilingual',
]

// Tag assignments for specific personas — seeds the personaTags junction table.
export const DEV_PERSONA_TAG_ASSIGNMENTS = [
  { personaName: 'Resident',             tags: ['mobile-first', 'high-volume', 'low-digital-literacy', 'multilingual'] },
  { personaName: 'Small Business Owner', tags: ['high-volume', 'multilingual'] },
  { personaName: 'Field Inspector',      tags: ['mobile-first', 'accessibility'] },
  { personaName: 'City Council Member',  tags: ['accessibility'] },
]

// ─── Personas (City of Riverdale) ────────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const DEV_PERSONAS = [
  {
    name: 'Resident',
    description: 'A member of the public interacting with city services online or in person. Primary user of public-facing digital services.',
    type: 'Citizen',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Small Business Owner',
    description: 'Local business operator who interacts with the city for permits, licenses, and inspections. High value, time-sensitive needs.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'IT Staff',
    description: 'Internal technology team member responsible for maintaining and supporting city systems.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Department Director',
    description: 'Senior agency leader accountable for a service area and its technology investment. Needs budget and performance visibility.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Field Inspector',
    description: 'City employee conducting inspections in the field, typically on a mobile device with intermittent connectivity.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'City Council Member',
    description: 'Elected official who needs plain-language visibility into technology investment and service performance.',
    type: 'Elected Official',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'State Agency Liaison',
    description: 'Representative from a state agency who exchanges data and coordinates shared services with the city.',
    type: 'External Partner',
    status: 'draft' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'CMS Administrator',
    description: 'The IT staff member responsible for configuring and maintaining GovEA — managing user accounts, roles, SSO integration, org connections, and system-level settings. Not a developer, but technically capable. Accountable for data integrity and access security.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'Legacy System Operator',
    description: 'Staff role responsible for operating and maintaining legacy on-premises systems. Role phased out as systems are decommissioned.',
    type: 'Staff',
    status: 'archived' as const,
    visibility: 'instance' as const,
  },
  // Data Architecture personas (#363 PR-1). Both are owners of data-modelling
  // objects (Entity / Attribute / Link / BusinessKey) in the metamodel.
  {
    name: 'Enterprise Data Architect',
    description: 'Owns the data architecture strategy and modelling standards across the organization. Recommends modelling methodologies, oversees logical and physical model alignment, and approves metadata scorecards.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Data Modeler',
    description: 'Produces conceptual, logical, and physical data models. Maintains the entity-relationship structure of the data layer and works directly with DBAs on Data Vault and dimensional implementations.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
]

// ─── Capabilities (City of Riverdale) ────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const DEV_CAPABILITIES = [
  {
    name: 'Online Permitting',
    description: 'Residents and businesses submit, pay for, and track permit applications without visiting a counter.',
    domain: 'Community Development',
    behaviors: 'Submit a permit application online with required documents and fee payment\nTrack the status of an in-progress application\nReceive automated notifications when application status changes\nSchedule required inspections after permit approval\nDownload an approved permit',
    rules: 'Applications must be scoped to an organization\nOnly published capabilities are visible to external users\nFee collection must occur before an application is accepted for review',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner', 'Field Inspector'],
  },
  {
    name: 'Business License Management',
    description: 'Issue, renew, and revoke business licenses. Notify owners of expiry and compliance requirements.',
    domain: 'Community Development',
    behaviors: 'Issue a new business operating license upon successful application and payment\nSend renewal reminders before license expiry\nSchedule and record compliance inspections\nRevoke or suspend licenses for non-compliance',
    rules: 'A license may only be issued after all required inspections are passed\nRenewal notices must be sent at least 60 days before expiry',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Small Business Owner'],
  },
  {
    name: 'HR Self-Service',
    description: 'Employees view pay stubs, request leave, update personal information, and access benefits.',
    domain: 'Legislative & Executive',
    behaviors: 'View current and historical pay stubs\nUpdate personal information such as address and emergency contacts\nRequest time off and view leave balances\nEnroll in or change benefits during open enrollment',
    rules: 'Employees may only access their own payroll and personal records\nBenefits changes are only permitted during open enrollment windows',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['IT Staff'],
  },
  {
    name: 'GIS Mapping',
    description: 'Geographic information services supporting public-facing maps, field data collection, and internal spatial analysis.',
    domain: 'Information Technology',
    behaviors: 'View and query authoritative city basemap layers\nSearch for addresses, parcels, and points of interest\nExport map views as images or spatial data files\nPublish curated public-facing map applications',
    rules: 'Authoritative spatial data layers are managed by GIS staff only\nPublic-facing maps may only include approved, published layers',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['IT Staff', 'Field Inspector'],
  },
  {
    name: 'Budget Reporting',
    description: 'Directors and elected officials access real-time budget vs. actuals and forecast dashboards.',
    domain: 'Finance & Revenue',
    behaviors: 'View budget vs. actuals comparisons by department and fund\nGenerate forecast dashboards for the current fiscal year\nExport budget reports to PDF or spreadsheet',
    rules: 'Budget data is read-only in this capability — modifications are made in the source financial system\nOnly published budget reports are visible to elected officials',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['Department Director', 'City Council Member'],
  },
  {
    name: 'Service Request Management',
    description: 'Residents submit and track non-emergency service requests such as pothole repairs, graffiti removal, and missed pickups.',
    domain: 'Infrastructure & Public Works',
    behaviors: 'Accept non-emergency service requests via web and mobile\nRoute requests to the responsible department automatically\nSend status updates to the resident at each workflow stage\nAllow residents to track open requests in real time',
    rules: 'Emergency-level requests must be redirected and not accepted through this channel\nService requests must be acknowledged within one business day of submission',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident'],
  },
  {
    name: 'Digital Identity & Authentication',
    description: 'Unified login for residents and staff across city digital services. Supports local accounts and optional SSO.',
    domain: 'Information Technology',
    behaviors: 'Authenticate residents and staff via local credentials or SSO\nIssue and refresh short-lived access tokens\nEnforce multi-factor authentication for privileged roles\nProvide self-service password reset for local accounts',
    rules: 'All resident-facing authentication flows must use OAuth 2.0 with OIDC\nTokens must expire within 8 hours for staff and 24 hours for residents',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['Resident', 'Small Business Owner', 'IT Staff'],
  },
  {
    name: 'Cross-Agency Data Sharing',
    description: 'Structured data exchange between the city and state agencies via secure APIs and agreed data standards.',
    domain: 'Information Technology',
    behaviors: 'Expose approved city data sets to authorised state agency consumers via API\nIngest state agency data into the city data platform on a scheduled basis\nLog all data exchange events with timestamps and consumer identity',
    rules: 'Data sharing agreements must be in place before any exchange is activated\nAll APIs must enforce mutual TLS and token-based authorisation',
    status: 'draft' as const,
    visibility: 'connections' as const,
    personas: ['State Agency Liaison', 'IT Staff'],
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'Print & Mail Services',
    description: 'Printed correspondence and physical mail delivery for city communications. Sunset in favour of digital notifications.',
    domain: 'Administrative Services',
    status: 'archived' as const,
    visibility: 'instance' as const,
    personas: ['IT Staff'],
  },
  // ── IAM / instance-admin capabilities ──────────────────────────────────────
  {
    name: 'User and Role Management',
    description: 'Create, edit, deactivate, and manage user accounts across the organization. Assign and modify roles (Admin, Contributor, Viewer). Control who has access to what without requiring developer involvement.',
    domain: 'Information Technology',
    behaviors: 'Create a new user account with an assigned role and organization binding\nEdit a user\'s name, email, or role assignment\nDeactivate a user account to immediately revoke access\nSearch and filter users by role or status\nView the full user roster for the organization',
    rules: 'Only Admins can create, edit, or deactivate user accounts\nA user must belong to exactly one organization\nDeactivating a user does not delete their audit history\nThe last Admin in an org cannot be deactivated',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator'],
  },
  {
    name: 'Role-Based Access Control',
    description: 'Enforce differentiated access across Admin, Contributor, and Viewer roles. Viewers see only published content; Contributors can create and edit; Admins have full control including user management and settings.',
    domain: 'Information Technology',
    behaviors: 'Gate content creation and editing to Contributor role and above\nRestrict user management and org settings to Admins only\nLimit Viewer sessions to published content across all catalog sections\nEnforce org-scoping so users never see content from other organizations without an explicit connection',
    rules: 'Role checks are enforced server-side on every action — never client-only\nViewers can never access draft or archived content regardless of URL\nRole escalation requires an Admin action; users cannot self-promote',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator'],
  },
  {
    name: 'SSO and Local Authentication',
    description: 'Authenticate staff via Microsoft Entra ID (OIDC/SSO) or local email-and-password credentials. SSO users must be pre-provisioned by an Admin. Local authentication remains available as a fallback even when SSO is configured.',
    domain: 'Information Technology',
    behaviors: 'Sign in via Microsoft Entra ID using an existing agency account\nSign in with a local email and password when SSO is unavailable\nBlock SSO sign-in for any identity not pre-provisioned by an Admin\nEnforce a 24-hour session lifetime with periodic re-validation\nRe-validate active-user status every 5 minutes to honor deactivations without waiting for session expiry',
    rules: 'SSO sign-in is allowed only for active pre-provisioned users with an organization binding\nNew SSO identities with no pre-provisioned record are silently rejected\nLocal authentication is always available regardless of SSO configuration\nAll login and logout events are written to the audit log',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator', 'IT Staff'],
  },
  {
    name: 'IAM Audit Trail',
    description: 'Immutable log of all identity and access events — logins, logouts, failed attempts, user creation, role changes, and deactivations. Enables accountability and supports compliance requirements.',
    domain: 'Information Technology',
    behaviors: 'Record every login success, login failure, and logout with timestamp and user identity\nRecord all user account creation, role changes, and deactivations\nFilter audit log by action type, user, or date range\nExport audit records for compliance reporting',
    rules: 'Audit records are immutable — no user including Admins can edit or delete them\nAll IAM events are logged regardless of whether they succeed or fail\nAudit data is retained for a minimum of 12 months',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator'],
  },
]

// ─── Capability hierarchy (City of Riverdale) ────────────────────────────────
export const DEV_CAPABILITY_RELATIONSHIPS: { parentName: string; childName: string }[] = [
  { parentName: 'Digital Identity & Authentication', childName: 'User and Role Management' },
  { parentName: 'Digital Identity & Authentication', childName: 'Role-Based Access Control' },
  { parentName: 'Digital Identity & Authentication', childName: 'SSO and Local Authentication' },
  { parentName: 'Digital Identity & Authentication', childName: 'IAM Audit Trail' },
]

// ─── TOGAF Architecture Domain mappings (City of Riverdale capabilities) ─────
// Illustrative assignments so the Application Landscape report renders non-empty
// out of the box. These are demonstrative seed data, not authoritative TOGAF
// classification — orgs are expected to assign their own mappings in practice.
// See #582 / #580 (Domain Architect persona walk).
export type TogafDomainLabel =
  | 'Business Architecture'
  | 'Application Architecture'
  | 'Technology Architecture'
  | 'Data Architecture'

export const DEV_CAPABILITY_TOGAF_DOMAINS: Record<string, TogafDomainLabel> = {
  'Online Permitting':                'Application Architecture',
  'Business License Management':      'Business Architecture',
  'HR Self-Service':                  'Business Architecture',
  'GIS Mapping':                      'Application Architecture',
  'Budget Reporting':                 'Application Architecture',
  'Service Request Management':       'Business Architecture',
  'Digital Identity & Authentication':'Application Architecture',
  'Cross-Agency Data Sharing':        'Data Architecture',
  'Print & Mail Services':            'Technology Architecture',
  'User and Role Management':         'Application Architecture',
  'Role-Based Access Control':        'Application Architecture',
  'SSO and Local Authentication':     'Application Architecture',
  'IAM Audit Trail':                  'Data Architecture',
}

// ─── Applications (City of Riverdale) ────────────────────────────────────────
// Coverage: lifecycleStatus = active ✓, sunset ✓, decommissioned ✓, planned ✓
//           hostingModel = saas ✓, on-prem ✓, hybrid ✓
//           status = published ✓, draft ✓
//           version field — non-null example on planned app

export const DEV_APPLICATIONS = [
  {
    name: 'Accela',
    description: 'Permitting and licensing platform used by Community Development and Code Enforcement.',
    vendor: 'Accela',
    version: undefined as string | undefined,
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Online Permitting', 'Business License Management'],
  },
  {
    name: 'Workday',
    description: 'HR and payroll system used enterprise-wide for all city employees.',
    vendor: 'Workday',
    version: undefined as string | undefined,
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['HR Self-Service'],
  },
  {
    name: 'ArcGIS Online',
    description: 'Cloud GIS platform for mapping, spatial analysis, and field data collection.',
    vendor: 'Esri',
    version: undefined as string | undefined,
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['GIS Mapping', 'Online Permitting'],
  },
  {
    name: 'OpenGov',
    description: 'Budget transparency and performance management platform used by Finance and department directors.',
    vendor: 'OpenGov',
    version: undefined as string | undefined,
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Budget Reporting'],
  },
  {
    name: 'CityWorks',
    description: 'Work order and asset management system for Public Works. On-prem installation, approaching end of vendor support.',
    vendor: 'Trimble',
    version: undefined as string | undefined,
    hostingModel: 'on-prem',
    lifecycleStatus: 'sunset' as const,
    status: 'published' as const,
    capabilities: ['Service Request Management', 'GIS Mapping'],
  },
  {
    name: 'Microsoft Entra ID',
    description: 'Cloud identity provider used for staff SSO. Residents use a separate local credential store.',
    vendor: 'Microsoft',
    version: undefined as string | undefined,
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Digital Identity & Authentication'],
  },
  {
    name: 'Legacy Permitting System',
    description: 'In-house permitting system built in 2008. Retired in favour of Accela.',
    vendor: 'In-house',
    version: undefined as string | undefined,
    hostingModel: 'on-prem',
    lifecycleStatus: 'decommissioned' as const,
    status: 'published' as const,
    capabilities: ['Online Permitting'],
  },
  // planned + hybrid + version — covers all three missing field values
  {
    name: 'Next-Gen Work Order System',
    description: 'Cloud-native work order and asset management platform selected to replace CityWorks. Implementation begins Q2 FY2026.',
    vendor: 'Cityworks Cloud',
    version: '4.0.0',
    hostingModel: 'hybrid',
    lifecycleStatus: 'planned' as const,
    status: 'draft' as const,
    capabilities: ['Service Request Management', 'GIS Mapping'],
  },
]

// ─── Strategic Objectives (City of Riverdale) ─────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓
//           timeHorizon = multiple values (FY2024, FY2026, FY2027, 3-year)
//           applications and valueStreams arrays — seed objectiveApplications /
//           objectiveValueStreams junction tables

export const DEV_OBJECTIVES = [
  {
    name: 'Improve Digital Service Delivery',
    description: 'Make city services faster and easier to access online, reducing in-person visits and processing times.',
    successMetric: '80% of permit applications submitted online by end of FY2026',
    timeHorizon: 'FY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Online Permitting', 'Service Request Management', 'Digital Identity & Authentication'],
    valueStreams: ['Permit to Certificate', 'Service Request to Resolution'],
  },
  {
    name: 'Modernise Legacy Infrastructure',
    description: 'Replace end-of-life on-prem systems with cloud-based alternatives to reduce operational risk and maintenance cost.',
    successMetric: 'Zero active on-prem systems older than 10 years by FY2027',
    timeHorizon: 'FY2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['GIS Mapping', 'Service Request Management'],
    valueStreams: ['Permit to Certificate'],
  },
  {
    name: 'Enable Cross-Agency Data Sharing',
    description: 'Establish secure, standards-based data exchange with state agencies to reduce duplicate data entry and improve service coordination.',
    successMetric: 'At least 2 active data exchange agreements with state agencies by end of FY2026',
    timeHorizon: 'FY2026',
    status: 'draft' as const,
    visibility: 'connections' as const,
    capabilities: ['Cross-Agency Data Sharing', 'Digital Identity & Authentication'],
    valueStreams: [] as string[],
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'Migrate to Cloud-First Infrastructure',
    description: 'Previous strategic priority to move all infrastructure to cloud by FY2024. Superseded by the more targeted Modernise Legacy Infrastructure objective.',
    successMetric: 'All production workloads cloud-hosted by FY2024',
    timeHorizon: 'FY2024',
    status: 'archived' as const,
    visibility: 'instance' as const,
    capabilities: ['Digital Identity & Authentication'],
    valueStreams: [] as string[],
  },
]

// ─── Goals (City of Riverdale) ───────────────────────────────────────────────
// Coverage: status = published ✓, draft ✓
//           visibility = org ✓, connections ✓
//           many-to-many: each goal links to one or more objectives

export const DEV_GOALS = [
  {
    name: 'Modernise Resident-Facing Services',
    description: 'Transform how residents interact with City of Riverdale by shifting from paper-based, in-person processes to seamless digital services that are accessible, fast, and trustworthy.',
    planningHorizon: '2025–2027',
    owner: 'Office of Digital Services',
    status: 'published' as const,
    visibility: 'org' as const,
    objectives: ['Improve Digital Service Delivery'],
  },
  {
    name: 'Strengthen Technical Infrastructure',
    description: 'Modernise ageing technology systems to improve reliability, security, and the city\'s capacity to adopt new digital capabilities as resident needs evolve.',
    planningHorizon: '2025–2028',
    owner: 'Department of Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
    objectives: ['Modernise Legacy Infrastructure', 'Migrate to Cloud-First Infrastructure'],
  },
  {
    name: 'Enable Joined-Up Government',
    description: 'Break down silos between City departments and state agencies to deliver services that feel seamless to residents regardless of which part of government is responsible.',
    planningHorizon: '2026–2028',
    owner: 'City Manager\'s Office',
    status: 'draft' as const,
    visibility: 'connections' as const,
    objectives: ['Enable Cross-Agency Data Sharing'],
  },
]

// ─── Strategies (City of Riverdale) — course-of-action plans (ADR-0005) ──────
// Coverage: status = active ✓, proposed ✓, achieved ✓ (multiple may be active).
// Each is a chosen approach that pursues goals and maps onto the operating model
// (capabilities + value streams) and the initiatives that deliver it.

export const DEV_STRATEGIES = [
  {
    name: 'Digital-First Resident Experience',
    summary: 'Make digital the default channel for the highest-volume resident interactions, redesigning the permit and service-request journeys end to end and standing up shared identity so residents sign in once.',
    planningHorizon: '2025–2027',
    status: 'active' as const,
    visibility: 'org' as const,
    goals: ['Modernise Resident-Facing Services'],
    capabilities: ['Online Permitting', 'Digital Identity & Authentication'],
    valueStreams: ['Permit to Certificate', 'Service Request to Resolution'],
    initiatives: ['Accela Implementation', 'Resident Portal Redesign'],
  },
  {
    name: 'Cloud & Infrastructure Modernisation',
    summary: 'Retire ageing on-premise systems in favour of a cloud-first platform, prioritising the capabilities that the resident-facing roadmap depends on.',
    planningHorizon: '2025–2028',
    status: 'proposed' as const,
    visibility: 'org' as const,
    goals: ['Strengthen Technical Infrastructure'],
    capabilities: ['GIS Mapping'],
    valueStreams: [],
    initiatives: ['CityWorks Replacement'],
  },
  {
    name: 'Cross-Agency Data Foundation',
    summary: 'Established the data-sharing agreements and exchange pilot that let City departments and state agencies act on a shared view of the resident.',
    planningHorizon: '2024–2025',
    status: 'achieved' as const,
    visibility: 'connections' as const,
    goals: ['Enable Joined-Up Government'],
    capabilities: ['Cross-Agency Data Sharing'],
    valueStreams: [],
    initiatives: ['Cross-Agency Data Exchange Pilot'],
  },
]

// ─── Value Streams (City of Riverdale) ───────────────────────────────────────
// Coverage: status = published ✓, draft ✓
//           visibility = org ✓, connections ✓
//           stakeholderPersonas — seeds valueStreamPersonas junction table

export const DEV_VALUE_STREAMS = [
  {
    name: 'Permit to Certificate',
    description: 'End-to-end journey from a resident or business submitting a permit application through to receiving their certificate of approval.',
    valueItem: 'Permit certificate enabling legal operation or construction',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Resident', 'Small Business Owner'],
    stages: [
      {
        name: 'Application Submission',
        description: 'Applicant submits permit request with required documents and fees.',
        order: 1,
        capabilities: ['Online Permitting', 'Digital Identity & Authentication'],
      },
      {
        name: 'Review & Inspection',
        description: 'Staff review application, schedule and conduct site inspection if required.',
        order: 2,
        capabilities: ['Online Permitting', 'GIS Mapping'],
      },
      {
        name: 'Approval & Issuance',
        description: 'Approved permit is issued and applicant notified.',
        order: 3,
        capabilities: ['Online Permitting', 'Business License Management'],
      },
    ],
  },
  {
    name: 'Service Request to Resolution',
    description: 'Journey from a resident reporting a non-emergency issue through to resolution and confirmation.',
    valueItem: 'Resolved public works issue with confirmation to the resident',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Resident'],
    stages: [
      {
        name: 'Request Submission',
        description: 'Resident submits request via web, mobile, or phone.',
        order: 1,
        capabilities: ['Service Request Management'],
      },
      {
        name: 'Assignment & Dispatch',
        description: 'Request is triaged, assigned to a crew, and dispatched.',
        order: 2,
        capabilities: ['Service Request Management', 'GIS Mapping'],
      },
      {
        name: 'Resolution & Closure',
        description: 'Work is completed and resident is notified of resolution.',
        order: 3,
        capabilities: ['Service Request Management'],
      },
    ],
  },
  // draft + connections — covers missing status and visibility values
  {
    name: 'Business Registration',
    description: 'Journey from a new business registering with the city through to receiving all required approvals to operate.',
    valueItem: 'Approved business registration enabling legal operation',
    status: 'draft' as const,
    visibility: 'connections' as const,
    stakeholderPersonas: ['Small Business Owner'],
    stages: [
      {
        name: 'Initial Registration',
        description: 'Business owner submits registration details and initial documentation.',
        order: 1,
        capabilities: ['Business License Management', 'Digital Identity & Authentication'],
      },
      {
        name: 'Verification & Compliance',
        description: 'Staff verify business details and check zoning and compliance requirements.',
        order: 2,
        capabilities: ['Business License Management', 'GIS Mapping'],
      },
    ],
  },
  // ── Shared reference value streams (instance visibility) ──────────────────
  // Sourced from issue #162: 8 standard government value streams for central IT
  {
    name: 'Regulatory & Policy Environment',
    description: 'Development, adoption, and enforcement of laws, regulations, and policies that govern public and private sector behavior.',
    valueItem: 'Clear, enforceable rules that create a stable operating environment for residents and businesses',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Department Director', 'City Council Member'],
    stages: [
      {
        name: 'Policy Identification & Research',
        description: 'Identify regulatory gaps or mandates and research best practices and peer jurisdiction approaches.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Stakeholder Engagement & Drafting',
        description: 'Facilitate public comment periods, stakeholder workshops, and legal review to shape draft policy language.',
        order: 2,
        capabilities: [] as string[],
      },
      {
        name: 'Adoption & Promulgation',
        description: 'Advance draft through legislative or regulatory approval process and publish in official record.',
        order: 3,
        capabilities: [] as string[],
      },
      {
        name: 'Implementation & Compliance',
        description: 'Operationalize new rules, train staff, and update systems and forms to reflect adopted requirements.',
        order: 4,
        capabilities: [] as string[],
      },
      {
        name: 'Monitoring & Enforcement',
        description: 'Track compliance, investigate violations, and apply remedies to ensure the policy achieves its intent.',
        order: 5,
        capabilities: [] as string[],
      },
    ],
  },
  {
    name: 'Public Safety & Homeland Security',
    description: 'Prevention, response, and recovery services that protect residents from crime, disaster, and threats to public order.',
    valueItem: 'Safe communities with rapid response capability and resilient recovery systems',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Field Inspector', 'Department Director'],
    stages: [
      {
        name: 'Prevention & Community Outreach',
        description: 'Implement crime prevention programs, public education campaigns, and community partnership initiatives.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Incident Detection & Dispatch',
        description: 'Receive emergency and non-emergency reports, classify incidents, and dispatch appropriate resources.',
        order: 2,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Response & Intervention',
        description: 'Deploy personnel and resources to resolve the incident and protect life and property.',
        order: 3,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Recovery & Restoration',
        description: 'Support affected residents and communities in returning to normal conditions after an incident.',
        order: 4,
        capabilities: ['Service Request Management'],
      },
      {
        name: 'After-Action Review & Reporting',
        description: 'Analyze incident outcomes, identify improvements, and report performance to oversight bodies.',
        order: 5,
        capabilities: [] as string[],
      },
    ],
  },
  {
    name: 'Health & Human Services',
    description: 'Delivery of public health programs, social services, and human services that support resident well-being.',
    valueItem: 'Healthy, supported residents with access to services that meet basic needs',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Department Director'],
    stages: [
      {
        name: 'Outreach & Eligibility Screening',
        description: 'Identify eligible residents through targeted outreach and screen applicants against program criteria.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Enrollment & Benefits Determination',
        description: 'Enroll qualified individuals, verify identity, and determine the level and type of benefits or services.',
        order: 2,
        capabilities: ['Digital Identity & Authentication'],
      },
      {
        name: 'Service Delivery & Case Management',
        description: 'Deliver direct services and assign case managers to coordinate care across programs.',
        order: 3,
        capabilities: [] as string[],
      },
      {
        name: 'Follow-Up & Care Coordination',
        description: 'Monitor client progress, adjust service plans, and coordinate referrals to partner agencies.',
        order: 4,
        capabilities: ['Cross-Agency Data Sharing'],
      },
      {
        name: 'Outcome Measurement',
        description: 'Evaluate program effectiveness through client outcome data and adjust service models accordingly.',
        order: 5,
        capabilities: [] as string[],
      },
    ],
  },
  {
    name: 'Education & Workforce Development',
    description: 'Programs that develop human capital through K-12 education, higher education, workforce training, and lifelong learning.',
    valueItem: 'Skilled, employable residents prepared to participate in the economy',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Department Director'],
    stages: [
      {
        name: 'Needs Assessment & Program Design',
        description: 'Analyze labor market data and community needs to design training and education programs.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Enrollment & Intake',
        description: 'Register participants, verify eligibility, and onboard them into programs and learning platforms.',
        order: 2,
        capabilities: ['Digital Identity & Authentication'],
      },
      {
        name: 'Training & Learning Delivery',
        description: 'Deliver instruction, coaching, and experiential learning through in-person and digital channels.',
        order: 3,
        capabilities: [] as string[],
      },
      {
        name: 'Credentialing & Completion',
        description: 'Assess competency, issue certificates or credentials, and record completion in official systems.',
        order: 4,
        capabilities: [] as string[],
      },
      {
        name: 'Employment Placement & Outcomes Tracking',
        description: 'Connect graduates to employers and track employment outcomes to validate program effectiveness.',
        order: 5,
        capabilities: ['Cross-Agency Data Sharing'],
      },
    ],
  },
  {
    name: 'Economic & Community Development',
    description: 'Initiatives that foster business growth, attract investment, support small businesses, and strengthen communities.',
    valueItem: 'Thriving local economy with equitable opportunity across communities',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Small Business Owner', 'Department Director', 'City Council Member'],
    stages: [
      {
        name: 'Business Attraction & Incentive Design',
        description: 'Develop incentive packages, marketing materials, and site-selection resources to attract businesses and investment.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Application & License Processing',
        description: 'Accept and review applications for business licenses, zoning approvals, and development incentives.',
        order: 2,
        capabilities: ['Online Permitting', 'Business License Management'],
      },
      {
        name: 'Inspection & Compliance Review',
        description: 'Conduct site inspections and verify compliance with zoning, building, and health codes.',
        order: 3,
        capabilities: ['Online Permitting', 'GIS Mapping'],
      },
      {
        name: 'Certificate & License Issuance',
        description: 'Issue occupancy certificates, business licenses, and grant disbursements to qualifying businesses.',
        order: 4,
        capabilities: ['Business License Management'],
      },
      {
        name: 'Performance & Reporting',
        description: 'Track economic indicators, report program outcomes, and present findings to elected officials.',
        order: 5,
        capabilities: ['Budget Reporting'],
      },
    ],
  },
  {
    name: 'Transportation & Infrastructure',
    description: 'Planning, construction, and maintenance of roads, bridges, transit, utilities, and other public infrastructure.',
    valueItem: 'Reliable, safe infrastructure that enables mobility and supports economic activity',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Field Inspector', 'Department Director'],
    stages: [
      {
        name: 'Planning & Environmental Review',
        description: 'Conduct needs analysis, environmental impact assessment, and community engagement to prioritize projects.',
        order: 1,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Design & Engineering',
        description: 'Produce engineering designs, cost estimates, and construction documents.',
        order: 2,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Procurement & Construction',
        description: 'Solicit bids, award contracts, and manage construction or installation activities.',
        order: 3,
        capabilities: [] as string[],
      },
      {
        name: 'Inspection & Acceptance',
        description: 'Inspect completed work against design specifications and formally accept the asset into service.',
        order: 4,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Operations & Maintenance',
        description: 'Operate the asset, respond to maintenance requests, and manage the asset lifecycle.',
        order: 5,
        capabilities: ['Service Request Management'],
      },
    ],
  },
  {
    name: 'Environment & Natural Resources Management',
    description: 'Stewardship of land, water, air, and natural resources to protect public health and ecological sustainability.',
    valueItem: 'Clean environment and sustainable use of natural resources for current and future generations',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Field Inspector', 'Department Director'],
    stages: [
      {
        name: 'Assessment & Environmental Monitoring',
        description: 'Collect and analyze environmental data — air quality, water quality, land condition — to establish baseline and detect changes.',
        order: 1,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Permitting & Resource Authorization',
        description: 'Review and issue permits for activities affecting natural resources such as land use, water withdrawal, and emissions.',
        order: 2,
        capabilities: ['Online Permitting'],
      },
      {
        name: 'Stewardship & Conservation Programs',
        description: 'Administer grants, conservation easements, and restoration programs to protect ecological assets.',
        order: 3,
        capabilities: [] as string[],
      },
      {
        name: 'Enforcement & Compliance',
        description: 'Investigate complaints and violations, conduct inspections, and apply remedies to restore environmental compliance.',
        order: 4,
        capabilities: ['GIS Mapping'],
      },
      {
        name: 'Public Disclosure & Reporting',
        description: 'Publish environmental data, program results, and compliance findings for public accountability.',
        order: 5,
        capabilities: [] as string[],
      },
    ],
  },
  {
    name: 'Constituent-Centric Digital Services Delivery & Accessibility',
    description: 'Design and delivery of government services through digital channels that are accessible, equitable, and resident-centered.',
    valueItem: 'Seamless, inclusive digital experiences that reduce friction for all residents',
    status: 'published' as const,
    visibility: 'instance' as const,
    stakeholderPersonas: ['Resident', 'Small Business Owner', 'IT Staff', 'Department Director'],
    stages: [
      {
        name: 'Discovery & Needs Assessment',
        description: 'Conduct user research, journey mapping, and accessibility audits to understand resident needs and pain points.',
        order: 1,
        capabilities: [] as string[],
      },
      {
        name: 'Service Design & Accessibility Review',
        description: 'Design service flows and interfaces against WCAG standards and plain-language requirements.',
        order: 2,
        capabilities: [] as string[],
      },
      {
        name: 'Development & Testing',
        description: 'Build, integrate, and test the digital service with real users including those with disabilities.',
        order: 3,
        capabilities: ['Digital Identity & Authentication'],
      },
      {
        name: 'Deployment & Launch',
        description: 'Release the service, communicate availability to residents, and provide staff training and support resources.',
        order: 4,
        capabilities: ['Digital Identity & Authentication'],
      },
      {
        name: 'Continuous Improvement',
        description: 'Monitor usage analytics, collect resident feedback, and iterate on the service to improve outcomes.',
        order: 5,
        capabilities: ['Service Request Management'],
      },
    ],
  },
]

// ─── Initiatives (City of Riverdale) ─────────────────────────────────────────
// Coverage: status = proposed ✓, active ✓, on-hold ✓, complete ✓, cancelled ✓
//           capability impact = improve ✓, build ✓, retire ✓
//           application impact = build ✓, retire ✓, improve ✓, migrate ✓

export const DEV_INITIATIVES = [
  {
    name: 'Accela Implementation',
    description: 'Implement Accela as the new permitting and licensing platform, replacing the legacy in-house system.',
    status: 'active' as const,
    startDate: 'Q1 FY2026',
    endDate: 'Q4 FY2026',
    capabilities: [
      { name: 'Online Permitting',           impact: 'improve' },
      { name: 'Business License Management', impact: 'improve' },
    ],
    applications: [
      { name: 'Accela',                   impact: 'build'  },
      { name: 'Legacy Permitting System', impact: 'retire' },
    ],
    objectives: ['Improve Digital Service Delivery'],
  },
  {
    name: 'CityWorks Replacement',
    description: 'Evaluate and replace CityWorks with a modern cloud-based work order and asset management system.',
    status: 'proposed' as const,
    startDate: 'Q2 FY2026',
    endDate: 'Q2 FY2027',
    capabilities: [
      { name: 'Service Request Management', impact: 'improve' },
      { name: 'GIS Mapping',               impact: 'improve' },
    ],
    applications: [
      { name: 'CityWorks',                  impact: 'retire' },
      { name: 'Next-Gen Work Order System', impact: 'build'  },
    ],
    objectives: ['Modernise Legacy Infrastructure'],
  },
  // on-hold — covers missing status; application impact 'improve'
  {
    name: 'Cross-Agency Data Exchange Pilot',
    description: 'Pilot structured data exchange with two state agencies to validate the technical approach before full rollout. Currently on hold pending legal review of data sharing agreements.',
    status: 'on-hold' as const,
    startDate: 'Q3 FY2026',
    endDate: 'Q1 FY2027',
    capabilities: [
      { name: 'Cross-Agency Data Sharing',        impact: 'build'   },
      { name: 'Digital Identity & Authentication', impact: 'improve' },
    ],
    applications: [
      { name: 'Microsoft Entra ID', impact: 'improve' },
    ],
    objectives: ['Enable Cross-Agency Data Sharing'],
  },
  // complete — covers missing status
  {
    name: 'Resident Portal Redesign',
    description: 'Redesign of the public-facing resident portal to improve mobile accessibility and reduce call volume to the service centre. Completed Q4 FY2025.',
    status: 'complete' as const,
    startDate: 'Q1 FY2025',
    endDate: 'Q4 FY2025',
    capabilities: [
      { name: 'Digital Identity & Authentication', impact: 'improve' },
      { name: 'Service Request Management',        impact: 'improve' },
    ],
    applications: [
      { name: 'Microsoft Entra ID', impact: 'improve' },
    ],
    objectives: ['Improve Digital Service Delivery'],
  },
  // cancelled — covers missing status; application impact 'migrate'
  {
    name: 'ERP Consolidation Evaluation',
    description: 'Evaluation of enterprise resource planning platforms to consolidate HR, Finance, and procurement. Cancelled Q3 FY2025 due to budget constraints and vendor market reassessment.',
    status: 'cancelled' as const,
    startDate: 'Q2 FY2025',
    endDate: null as string | null,
    capabilities: [
      { name: 'HR Self-Service',  impact: 'retire' },
      { name: 'Budget Reporting', impact: 'retire' },
    ],
    applications: [
      { name: 'Workday',  impact: 'migrate' },
      { name: 'OpenGov',  impact: 'migrate' },
    ],
    objectives: ['Modernise Legacy Infrastructure'],
  },
]

// ─── ADRs (City of Riverdale) ─────────────────────────────────────────────────
// Coverage: status = accepted ✓, proposed ✓, deprecated ✓, superseded ✓
//           supersededByNumber — self-reference chain resolved in run.ts
//           all four junction tables: capabilities, applications, initiatives, objectives

export const DEV_ADRS = [
  {
    number: 'ADR-001',
    title: 'Adopt SaaS-first hosting for new application acquisitions',
    context: 'The city operates several aging on-premises systems that require dedicated infrastructure, patching, and specialist staff. Two systems (CityWorks, Legacy Permitting) are approaching end of vendor support.',
    decision: 'All new application acquisitions will default to SaaS hosting unless a documented security, compliance, or integration requirement mandates on-premises deployment. On-prem exceptions require Director-level approval and an exit plan.',
    consequences: 'Reduces infrastructure maintenance burden and improves vendor-managed update cadence. Increases reliance on internet connectivity and vendor SLAs. Requires updated procurement templates and vendor risk assessment processes.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Digital Identity & Authentication', 'Cross-Agency Data Sharing'],
    applications: ['Accela', 'ArcGIS Online', 'OpenGov'],
    initiatives: ['Accela Implementation'],
    objectives: ['Modernise Legacy Infrastructure'],
  },
  // proposed — covers missing status
  {
    number: 'ADR-002',
    title: 'Use OAuth 2.0 / OIDC for all resident-facing authentication flows',
    context: 'The city currently has fragmented authentication across citizen-facing services, with some using legacy username/password forms and others using ad-hoc SSO integrations. This creates security risk and a poor user experience.',
    decision: 'All resident-facing authentication flows will implement OAuth 2.0 with OIDC. Microsoft Entra ID is the designated identity provider for staff. A separate resident credential store will be maintained for services not requiring SSO.',
    consequences: 'Improves security posture and enables single sign-on for residents. Increases dependency on Microsoft Entra ID availability. Requires migration of existing legacy authentication implementations.',
    status: 'proposed' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Digital Identity & Authentication'],
    applications: ['Microsoft Entra ID'],
    initiatives: ['Cross-Agency Data Exchange Pilot'],
    objectives: ['Improve Digital Service Delivery'],
  },
  // deprecated — covers missing status; no application or initiative links (null examples)
  {
    number: 'ADR-003',
    title: 'Require on-premises deployment for all financial systems',
    context: 'An earlier security policy required all financial systems to be deployed on-premises to comply with city data residency requirements. Documented as an architectural constraint in the 2019 technology strategy.',
    decision: 'All financial management and budget systems must be deployed on-premises within city-owned infrastructure.',
    consequences: 'Provided data residency assurance under the 2019 policy. Created significant infrastructure and maintenance overhead. Superseded by updated cloud security posture and the SaaS-first direction (ADR-001).',
    status: 'deprecated' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Budget Reporting'],
    applications: [] as string[],
    initiatives: [] as string[],
    objectives: [] as string[],
  },
  // superseded — covers missing status; supersededByNumber resolved in run.ts
  {
    number: 'ADR-004',
    title: 'Use legacy XML/SOAP gateway for cross-agency data exchange',
    context: "At the time this decision was made, the city's integration with the state used a legacy XML/SOAP-based API gateway that was the only approved integration pattern for state agency data exchange.",
    decision: 'All cross-agency data exchange will use the state-provided XML/SOAP gateway and its associated authentication mechanism.',
    consequences: 'Enabled initial data exchange with the state. Gateway has since been decommissioned by the state. This decision is formally superseded by ADR-005, which adopts REST/JSON with OAuth 2.0.',
    status: 'superseded' as const,
    supersededByNumber: 'ADR-005',
    capabilities: ['Cross-Agency Data Sharing'],
    applications: [] as string[],
    initiatives: [] as string[],
    objectives: [] as string[],
  },
  // accepted (second instance) — supersedes ADR-004
  {
    number: 'ADR-005',
    title: 'Adopt REST/JSON APIs with OAuth 2.0 for all cross-agency integrations',
    context: 'The legacy XML/SOAP gateway (governed by ADR-004) has been decommissioned by the state. New state integration APIs use REST/JSON. The city needs a current integration pattern for all future cross-agency data exchange.',
    decision: 'All new and migrated cross-agency integrations will use REST/JSON APIs authenticated via OAuth 2.0. API contracts will be documented using OpenAPI specifications and reviewed by the Architecture Review Board.',
    consequences: 'Aligns with state and industry direction. Reduces integration complexity versus SOAP. Requires updating existing integrations. Supersedes ADR-004.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Cross-Agency Data Sharing', 'Digital Identity & Authentication'],
    applications: ['Microsoft Entra ID'],
    initiatives: ['Cross-Agency Data Exchange Pilot'],
    objectives: ['Enable Cross-Agency Data Sharing'],
  },
]

// ─── State Org Fixtures ───────────────────────────────────────────────────────

export const STATE_PERSONAS = [
  {
    name: 'Local Government Partner',
    description: 'Representative from a city or county agency that exchanges data or shares services with the state.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
]

export const STATE_CAPABILITIES = [
  {
    name: 'Statewide Identity Verification',
    description: 'State-managed identity verification service available to local government agencies for resident authentication.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['Local Government Partner'],
  },
  {
    name: 'Open Data Platform',
    description: 'Centralised platform for publishing and consuming government datasets in open, machine-readable formats.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['Local Government Partner'],
  },
  {
    name: 'State Grants Management',
    description: 'System for local agencies to apply for, track, and report on state grants.',
    domain: 'Finance & Revenue',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Local Government Partner'],
  },
]

export const STATE_APPLICATIONS = [
  {
    name: 'State Identity Hub',
    description: 'Statewide identity and authentication broker for government services.',
    vendor: 'State OIT',
    hostingModel: 'on-prem',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Statewide Identity Verification'],
  },
  {
    name: 'CKAN Open Data Portal',
    description: 'Open source data portal used for the state open data platform.',
    vendor: 'Open Knowledge Foundation',
    hostingModel: 'on-prem',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Open Data Platform'],
  },
]

// ─── Multi-org cross-org links ────────────────────────────────────────────────
// Coverage: linkType = implements ✓, extends ✓, maps_to ✓
//
// Note: 'State Grants Management' has 'org' visibility; in runtime federation
// traversal City of Riverdale cannot follow that link. The row is seeded to
// exercise the data model regardless of visibility enforcement.

// ─── Principles (City of Riverdale) ─────────────────────────────────────────

export const DEV_PRINCIPLES = [
  {
    name: 'SaaS First',
    description: 'Default to vendor-hosted SaaS for all new application acquisitions unless a documented constraint requires otherwise.',
    title: 'SaaS first for new application acquisitions',
    rationale: 'On-premises infrastructure creates disproportionate maintenance overhead for a city IT team. Vendor-managed SaaS keeps the city on current releases and shifts patching and availability responsibility to the vendor.',
    implications: 'All new application procurements default to SaaS. On-premises deployment requires Director-level approval, a documented technical justification, and a documented exit plan.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Online Permitting', 'Business License Management', 'Digital Identity & Authentication'],
    adrs: [] as string[], // resolved from ADR numbers at seed time
  },
  {
    name: 'Open Standards Auth',
    description: 'All resident-facing authentication flows use OAuth 2.0 with OIDC for a consistent, auditable identity layer.',
    title: 'Open standards for resident-facing authentication',
    rationale: 'Fragmented authentication across resident-facing services creates inconsistent security posture and poor user experience. Standardising on OAuth 2.0 / OIDC provides a well-understood, auditable identity layer.',
    implications: 'New resident-facing services must implement OAuth 2.0 with OIDC. Legacy authentication implementations are migrated as part of system upgrades. Staff authentication continues through the existing enterprise SSO pathway.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Digital Identity & Authentication', 'Online Permitting', 'Service Request Management'],
    adrs: [] as string[],
  },
  {
    name: 'Accessibility First',
    description: 'Design resident-facing services for low digital literacy and mobile use — services that work for the hardest cases work for everyone.',
    title: 'Design for low digital literacy first',
    rationale: 'A significant portion of residents have low digital literacy, use mobile devices as their primary internet access, or are non-native English speakers. Services designed for these users work for everyone.',
    implications: 'All resident-facing services must be tested against low-literacy and mobile-first criteria before launch. Plain-language summaries are required for all public-facing content.',
    principleType: 'architecture' as const,
    status: 'draft' as const,
    visibility: 'connections' as const,
    capabilities: ['Online Permitting', 'Service Request Management'],
    adrs: [] as string[],
  },
  {
    name: 'Resident Privacy by Default',
    description: 'Collect only the minimum personal data necessary to deliver the requested service, and retain it only as long as required.',
    title: 'Collect the minimum personal data necessary, retain only as long as required',
    rationale: 'Collecting excessive personal data creates legal, reputational, and security exposure. Residents trust the city with their information; that trust is best honoured by collecting less, not more, and by being transparent about what is collected and why.',
    implications: 'All new services must complete a data minimisation review before launch. Data retention schedules are required for every data collection point. Resident data must not be shared with third parties except where required by law or explicitly consented to.',
    principleType: 'data' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Digital Identity & Authentication', 'Service Request Management'],
    adrs: [] as string[],
  },
  {
    name: 'Data Quality at Source',
    description: 'Each system that creates or modifies data owns the quality of that data. Quality is not corrected downstream — it is enforced at the point of entry.',
    title: 'The creating system owns data quality; enforce quality at the point of entry',
    rationale: 'Downstream data quality work — deduplication, correction, reconciliation — is expensive and error-prone. The most effective quality control is validation at the point of creation, where the context is fully understood and correction is cheapest.',
    implications: 'All new systems must define data quality rules for the data they produce. Integration pipelines may not silently transform or discard data to compensate for source quality issues — failures are surfaced to the source system owner. Data quality metrics are tracked per system.',
    principleType: 'data' as const,
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Service Request Management', 'Business License Management'],
    adrs: [] as string[],
  },
]

// ─── Glossary (City of Riverdale) ────────────────────────────────────────────

export const DEV_GLOSSARY = [
  {
    term: 'Capability',
    definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
    domain: 'Information Technology',
    notes: 'Capabilities are technology-agnostic. The same capability can be supported by different applications over time.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Persona',
    definition: 'A named, representative user or stakeholder type that interacts with city services. Personas capture goals, context, and pain points to guide service and system design.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Architecture Decision Record (ADR)',
    definition: 'A documented record of a significant architecture or technology decision — what was decided, why, and what the consequences are.',
    domain: 'Information Technology',
    notes: 'ADRs are immutable by convention. Superseded decisions are marked as such and linked to the newer decision, preserving the history.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Value Stream',
    definition: 'The sequence of activities that deliver a specific outcome of value to a stakeholder. Value streams cross departmental boundaries and end with a concrete result for the recipient.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'SaaS (Software as a Service)',
    definition: 'A software delivery model in which the vendor hosts and operates the application on behalf of the customer. The customer accesses it over the internet and pays on a subscription basis.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'instance' as const,
  },
  {
    term: 'OAuth 2.0',
    definition: 'An open authorization framework that enables applications to obtain limited access to user accounts on another service. Used as the foundation for modern single sign-on and API authorization.',
    domain: 'Information Technology',
    notes: 'Often paired with OIDC (OpenID Connect) for authentication. OAuth 2.0 alone covers authorization; OIDC adds identity.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'OIDC (OpenID Connect)',
    definition: 'An identity layer built on top of OAuth 2.0 that allows applications to verify the identity of a user based on authentication performed by an authorization server.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Lifecycle Status',
    definition: 'The stage of a system or application in its operational life: planned, active, sunset, or decommissioned. Used to assess portfolio health and plan transitions.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Sunset',
    definition: 'The status of a system that is still operational but is no longer receiving new investment and is scheduled for decommissioning. Sunset systems represent known technical risk.',
    domain: 'Information Technology',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Data Residency',
    definition: 'The requirement that data be stored and processed within a specific geographic or jurisdictional boundary. Often a constraint in public sector procurement.',
    domain: 'Information Technology',
    status: 'draft' as const,
    visibility: 'connections' as const,
  },
  {
    term: 'Retention Schedule',
    definition: 'A documented policy that specifies how long different categories of records must be kept before they may be destroyed or archived.',
    domain: 'Administrative Services',
    notes: 'Retention schedules are typically set by state law and must be followed during any records system migration.',
    status: 'published' as const,
    visibility: 'org' as const,
  },

  // ── EA terms with multiple sources — authoritative source already selected ──

  {
    term: 'Enterprise Architecture',
    definition: 'A strategic information asset base that defines the mission; the information necessary to perform the mission; the technologies necessary to perform the mission; and the transitional processes for implementing new technologies in response to changing mission needs.',
    definitionSource: 'FEAF v2 (Federal Enterprise Architecture Framework)',
    definitionSourceUrl: 'https://www.cio.gov/policies-and-instructions/federal-enterprise-architecture-framework/',
    domain: 'Enterprise Architecture',
    notes: 'City adopted the FEAF v2 definition in 2023 as it aligns with federal reporting requirements and the state CIO guidance. TOGAF and Gartner definitions are retained as reference sources.',
    status: 'published' as const,
    visibility: 'instance' as const,
    sources: [
      {
        name: 'FEAF v2 (Federal Enterprise Architecture Framework)',
        url: 'https://www.cio.gov/policies-and-instructions/federal-enterprise-architecture-framework/',
        definition: 'A strategic information asset base that defines the mission; the information necessary to perform the mission; the technologies necessary to perform the mission; and the transitional processes for implementing new technologies in response to changing mission needs.',
      },
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A coherent whole of principles, methods, and models that are used in the design and realization of an enterprise\'s organizational structure, business processes, information systems, and infrastructure.',
      },
      {
        name: 'Gartner Glossary',
        url: 'https://www.gartner.com/en/information-technology/glossary/enterprise-architecture-ea',
        definition: 'A discipline for proactively and holistically leading enterprise responses to disruptive forces by identifying and analyzing the execution of change toward desired business vision and outcomes.',
      },
    ],
  },

  {
    term: 'Zero Trust Architecture',
    definition: 'An enterprise cybersecurity plan that utilizes zero trust concepts and encompasses component relationships, workflow planning, and access policies — treating every request as untrusted regardless of network location.',
    definitionSource: 'NIST SP 800-207',
    definitionSourceUrl: 'https://doi.org/10.6028/NIST.SP.800-207',
    domain: 'Information Security',
    notes: 'NIST SP 800-207 is the federal standard adopted by the city\'s cybersecurity policy. The CISA maturity model is used for implementation assessment; the Gartner definition is vendor-neutral and useful for executive briefings.',
    status: 'published' as const,
    visibility: 'connections' as const,
    sources: [
      {
        name: 'NIST SP 800-207',
        url: 'https://doi.org/10.6028/NIST.SP.800-207',
        definition: 'A zero trust architecture (ZTA) is an enterprise\'s cybersecurity plan that utilizes zero trust concepts and encompasses component relationships, workflow planning, and access policies. Therefore, a zero trust enterprise is the network infrastructure (physical and virtual) and operational policies that are in place for an enterprise as a product of a zero trust architecture plan.',
      },
      {
        name: 'CISA Zero Trust Maturity Model',
        url: 'https://www.cisa.gov/zero-trust-maturity-model',
        definition: 'Zero trust is a security model, a set of system design principles, and a coordinated cybersecurity and system management strategy based on an acknowledgement that threats exist both inside and outside traditional network boundaries.',
      },
      {
        name: 'Gartner Glossary',
        url: 'https://www.gartner.com/en/information-technology/glossary/zero-trust-network-access-ztna',
        definition: 'Zero trust is a security paradigm that explicitly identifies users and devices and grants them just-enough access to minimize risk while enabling productivity.',
      },
    ],
  },

  // ── EA terms with multiple sources — authoritative source not yet selected ──

  {
    term: 'Technical Debt',
    definition: 'The implied cost of future rework caused by choosing an expedient solution now instead of a better approach that would take longer. Like financial debt, it accumulates interest over time.',
    domain: 'Information Technology',
    notes: 'Three communities define this term with different scopes: Ward Cunningham\'s original metaphor focuses on code quality decisions, Martin Fowler broadened it to any knowingly deferred best practice, and CISQ provides a quantitative measurement lens. Authoritative source not yet selected — review against state CIO standards before publishing.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'Ward Cunningham (original metaphor, 1992)',
        url: 'https://wiki.c2.com/?WardExplainsDebtMetaphor',
        definition: 'Shipping first-time code is like going into debt. A little debt speeds development so long as it is paid back promptly with a rewrite. The danger occurs when the debt is not repaid — every minute spent on not-quite-right code counts as interest on that debt.',
      },
      {
        name: 'Martin Fowler — Refactoring (2009)',
        url: 'https://martinfowler.com/bliki/TechnicalDebt.html',
        definition: 'Technical Debt is a metaphor for the work we avoid doing now that makes things more difficult in the future. Like financial debt, technical debt is not necessarily a bad thing, but it should be managed carefully. Reckless debt is the kind to avoid; prudent debt taken on deliberately and repaid promptly can accelerate delivery.',
      },
      {
        name: 'CISQ — Technical Debt Report',
        url: 'https://www.it-cisq.org/the-cost-of-poor-quality-software-in-the-us-a-2022-report/',
        definition: 'Technical debt is the cost of additional rework caused by choosing an easy, limited solution now instead of using a better approach that would take longer. It accumulates when development teams take shortcuts or skip best practices to meet deadlines, and is measurable in hours of remediation effort.',
      },
    ],
  },

  {
    term: 'Digital Transformation',
    definition: 'The integration of digital technology into all areas of an organization, fundamentally changing how it operates and delivers value to stakeholders.',
    domain: 'Enterprise Architecture',
    notes: 'Definitions vary significantly by source. Gartner emphasizes business model change; MIT CISR emphasizes operating model and ecosystem shifts; TOGAF 10 provides the most implementable definition for architecture practice. Pending alignment with the state Digital Strategy before selecting an authoritative source.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'Gartner Glossary',
        url: 'https://www.gartner.com/en/information-technology/glossary/digitalization',
        definition: 'Digital transformation can refer to anything from IT modernization (for example, cloud computing), to digital optimization, to the invention of new digital business models. The term is widely used in public-sector organizations to mean migrating to cloud or modernizing legacy applications.',
      },
      {
        name: 'MIT CISR (Center for Information Systems Research)',
        url: 'https://cisr.mit.edu/publication/2018_0101_DigitalTransformation_WeillWoerner',
        definition: 'Digital transformation requires changes to operating model, enterprise architecture, and technology capabilities. It is not just a technology challenge — it demands simultaneous shifts in strategy, structure, processes, people, and culture in response to digital and physical integration.',
      },
      {
        name: 'TOGAF 10',
        url: 'https://www.opengroup.org/togaf',
        definition: 'The use of digital technology to create or modify business processes, culture, and customer experiences to meet changing business and market requirements. This digital transformation journey begins with the customer experience and works backward to the technology.',
      },
    ],
  },

  {
    term: 'Reference Architecture',
    definition: 'A template architecture for a class of systems that captures reusable design decisions and constraints. Used to accelerate solution design and ensure consistency across projects.',
    domain: 'Enterprise Architecture',
    status: 'draft' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A template architecture that can be used to solve a class of problems. It captures architectural experience in a form that can be reused across projects and organizations, providing a common vocabulary and set of patterns.',
      },
      {
        name: 'NIST SP 500-292 (Cloud Computing Reference Architecture)',
        url: 'https://doi.org/10.6028/NIST.SP.500-292',
        definition: 'A reference architecture in the context of IT is an authoritative source of information about a specific subject area that guides and constrains the instantiations of multiple architectures and solutions. Reference architectures represent proven architectures based on documented experience.',
      },
    ],
  },

  {
    term: 'Business Architecture',
    definition: 'A blueprint of the enterprise that provides a common understanding of the organization and is used to align strategic objectives and tactical demands.',
    domain: 'Enterprise Architecture',
    notes: 'The TOGAF and OMG definitions are substantively similar but use different taxonomies. The OMG BIZBOK is more widely used in standalone business architecture practices; TOGAF is more common in integrated EA programs.',
    status: 'published' as const,
    visibility: 'connections' as const,
    sources: [
      {
        name: 'TOGAF 10',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A representation of holistic, multi-dimensional business views of capabilities, end-to-end value delivery, information, and organizational structure; and the relationships among these business views and strategies, products, policies, initiatives, and stakeholders.',
      },
      {
        name: 'OMG Business Architecture Working Group (BIZBOK)',
        url: 'https://www.businessarchitectureguild.org/',
        definition: 'Business architecture defines the structure of an enterprise in terms of its governance structure, business processes, and business information. It defines the nature of the enterprise through measures that are independent of how the enterprise implements itself.',
      },
    ],
  },
]

// ─── Services (City of Riverdale) ────────────────────────────────────────────

export const DEV_SERVICES = [
  {
    name: 'Online Permit Application',
    description: 'Residents and businesses apply for building, electrical, and plumbing permits online without visiting City Hall. Applications are routed for review, inspection scheduling, and digital issuance.',
    serviceOwner: 'Community Development',
    channels: ['online', 'in-person'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Online Permitting'],
    personas: ['Resident', 'Small Business Owner', 'Field Inspector'],
    valueStreams: ['Permit to Certificate'],
  },
  {
    name: 'Business License & Registration',
    description: 'New and renewing businesses register with the city, pay fees, and receive a digital license. Includes zoning verification and compliance checks.',
    serviceOwner: 'Finance & Revenue',
    channels: ['online', 'in-person', 'phone'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Business License Management', 'Online Permitting'],
    personas: ['Small Business Owner', 'Department Director'],
    valueStreams: ['Business Registration'],
  },
  {
    name: '311 Resident Request',
    description: 'Residents report non-emergency issues — potholes, graffiti, missed collections — via web or mobile. Requests are triaged, dispatched, and tracked to resolution.',
    serviceOwner: 'Office of Citizen Engagement',
    channels: ['online', 'mobile', 'phone'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Service Request Management'],
    personas: ['Resident'],
    valueStreams: ['Service Request to Resolution'],
  },
  {
    name: 'City Maps & GIS Portal',
    description: 'Public-facing mapping portal providing parcel information, zoning layers, utility infrastructure, and neighbourhood planning data.',
    serviceOwner: 'GIS Division',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'instance' as const,
    capabilities: ['GIS Mapping'],
    personas: ['Resident', 'Small Business Owner', 'Field Inspector'],
    valueStreams: [],
  },
  {
    name: 'Staff Self-Service Portal',
    description: 'Internal portal for city employees to manage HR, payroll, leave requests, and benefits without involving HR staff for routine transactions.',
    serviceOwner: 'Human Resources',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['HR Self-Service'],
    personas: ['IT Staff', 'Department Director'],
    valueStreams: [],
  },
  {
    name: 'Budget & Performance Dashboard',
    description: 'Executive and council-facing dashboard showing department budgets, expenditure tracking, and performance metrics against strategic objectives.',
    serviceOwner: 'Office of Budget & Management',
    channels: ['online'],
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Budget Reporting'],
    personas: ['Department Director', 'City Council Member'],
    valueStreams: [],
  },
  {
    name: 'Resident Identity & Login',
    description: 'Single sign-on for residents accessing any city digital service. Supports local password accounts and optional SSO. Required before online permitting, 311, and license applications.',
    serviceOwner: 'Office of Digital Services',
    channels: ['online', 'mobile'],
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Digital Identity & Authentication'],
    personas: ['Resident', 'Small Business Owner'],
    valueStreams: [],
  },
]

// ─── Data Architecture metamodel (City of Riverdale) ─────────────────────────
// Fixtures for the Data Architecture stream (#363 / #481).
// Covers all physical attribute types, both link types, and all four cross-object
// relationship kinds. Product + its children are 'draft' so the Viewer role-gate
// is exercisable (Victor cannot see them; Alice/Carol can).

export const DEV_DATA_ENTITIES = [
  {
    name: 'Customer',
    description: 'Represents a resident or business with a registered relationship with the City. Source of truth for identity and contact data across source systems.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalHubTableName: 'h_customer',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    owners: ['Enterprise Data Architect'],
  },
  {
    name: 'Order',
    description: 'A transactional request submitted by a Customer — permit application, service request, license renewal, or similar.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalHubTableName: 'h_order',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    owners: ['Enterprise Data Architect'],
  },
  {
    name: 'Product',
    description: 'A service or permit type offered by the City. Draft — pending data governance approval to publish.',
    status: 'draft' as const,
    visibility: 'org' as const,
    physicalHubTableName: 'h_product',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    owners: ['Enterprise Data Architect'],
  },
]

export const DEV_DATA_ATTRIBUTES = [
  {
    name: 'Customer Profile Details',
    description: 'Core demographic and contact attributes for a Customer. Tracked with effectivity dates to capture historical changes.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalSatelliteTableName: 's_customer_profile',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalAttributeType: 'effectivity' as const,
    owners: ['Data Modeler'],
    entityLinks: ['Customer'],
  },
  {
    name: 'Customer Contact Preferences',
    description: 'Multi-active list of communication channels a Customer has opted into. One row per active channel per load date.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalSatelliteTableName: 's_customer_contact',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalAttributeType: 'multi-active' as const,
    owners: ['Data Modeler'],
    entityLinks: ['Customer'],
  },
  {
    name: 'Order Status Tracking',
    description: 'Lifecycle states for an Order (submitted, under review, approved, rejected). Status-tracking satellite with current-state projection.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalSatelliteTableName: 's_order_status',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalAttributeType: 'status-tracking' as const,
    owners: ['Data Modeler'],
    entityLinks: ['Order'],
  },
  {
    name: 'Order Record Details',
    description: 'Descriptive attributes of an Order captured at submission time with full record-tracking audit columns.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalSatelliteTableName: 's_order_record',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalAttributeType: 'record-tracking' as const,
    owners: ['Data Modeler'],
    entityLinks: ['Order'],
  },
  {
    name: 'Product Details',
    description: 'Descriptive attributes for a City service or permit type. Draft — not yet approved for publication.',
    status: 'draft' as const,
    visibility: 'org' as const,
    physicalSatelliteTableName: 's_product_details',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalAttributeType: 'effectivity' as const,
    owners: ['Data Modeler'],
    entityLinks: ['Product'],
  },
]

export const DEV_DATA_LINKS = [
  {
    name: 'Customer-Order Association',
    description: 'Relates a Customer to the Orders they have submitted. Same-As link used to resolve potential duplicate Customer references across source systems.',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalLinkTableName: 'l_customer_order',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalLinkType: 'same-as' as const,
    owners: ['Enterprise Data Architect'],
  },
  {
    name: 'Product Hierarchy',
    description: 'Hierarchical link capturing parent-child relationships between City service product types (e.g. Electrical Permit is a child of Building Permit).',
    status: 'published' as const,
    visibility: 'org' as const,
    physicalLinkTableName: 'l_product_hierarchy',
    serverName: 'dw01',
    databaseName: 'riverdale_dv',
    schemaName: 'raw_vault',
    physicalLinkType: 'hierarchical' as const,
    owners: ['Enterprise Data Architect'],
  },
]

export const DEV_DATA_BUSINESS_KEYS = [
  {
    name: 'Customer ID',
    description: 'Primary business key for a Customer — the city-assigned resident or business identifier.',
    status: 'published' as const,
    visibility: 'org' as const,
    dataType: 'VARCHAR(50)',
    entityName: 'Customer',
    owners: ['Data Modeler'],
  },
  {
    name: 'Customer Email',
    description: 'Secondary business key sourced from the identity provider registration record.',
    status: 'published' as const,
    visibility: 'org' as const,
    dataType: 'VARCHAR(255)',
    entityName: 'Customer',
    owners: ['Data Modeler'],
  },
  {
    name: 'Order Number',
    description: 'Unique permit or service request reference number assigned at submission time.',
    status: 'published' as const,
    visibility: 'org' as const,
    dataType: 'CHAR(10)',
    entityName: 'Order',
    owners: ['Data Modeler'],
  },
  {
    name: 'Product SKU',
    description: 'Internal code identifying a City service or permit product type. Draft — pending approval.',
    status: 'draft' as const,
    visibility: 'org' as const,
    dataType: 'VARCHAR(20)',
    entityName: 'Product',
    owners: ['Data Modeler'],
  },
]

// Entity ↔ Entity "is related" — canonical ordering enforced at seed time (smaller UUID as left)
export const DEV_DATA_ENTITY_RELATIONS = [
  { leftEntityName: 'Customer', rightEntityName: 'Order' },
]

// Attribute ↔ Attribute "shares" — canonical ordering enforced at seed time
export const DEV_DATA_ATTRIBUTE_SHARES = [
  { leftAttributeName: 'Customer Profile Details', rightAttributeName: 'Product Details' },
]

// ─── Cross-org links ──────────────────────────────────────────────────────────

// Riverdale (source) → ODS (target). Exercises the OUTBOUND request and
// awaiting-target-approval flow from the source persona's perspective
// (Riverdale's Agency EA Coordinator sees "pending the target org's approval"
// in the federation activity panel).
export const DEV_CROSS_ORG_LINKS = [
  {
    sourceCapabilityName: 'Digital Identity & Authentication',
    targetCapabilityName: 'Statewide Identity Verification',
    linkType: 'implements' as const,
  },
  {
    sourceCapabilityName: 'Cross-Agency Data Sharing',
    targetCapabilityName: 'Open Data Platform',
    linkType: 'extends' as const,
  },
  {
    sourceCapabilityName: 'Budget Reporting',
    targetCapabilityName: 'State Grants Management',
    linkType: 'maps_to' as const,
  },
]

// ODS (source) → Riverdale (target). #543 — adds the reverse direction so
// the Agency EA Coordinator persona at Riverdale (Alice) can exercise the
// INBOUND-approval flow that mo-connection-approval.md describes. Without
// these, the "Awaiting your approval" branch in cross-org-links-panel.tsx
// is unreachable in the dev seed.
//
// Picked believable scenarios: the state's identity service implements a
// city-level entitlement check (state extends down into city's licensing
// flow), and the state's open-data feed pulls service-request data from the
// city. Both target Riverdale capabilities Alice owns and lands as
// `status: 'pending'` so they appear in her approval queue.
export const STATE_INBOUND_CROSS_ORG_LINKS = [
  {
    sourceCapabilityName: 'Statewide Identity Verification', // ODS
    targetCapabilityName: 'Business License Management',     // Riverdale
    linkType: 'implements' as const,
  },
  {
    sourceCapabilityName: 'Open Data Platform',              // ODS
    targetCapabilityName: 'Service Request Management',      // Riverdale
    linkType: 'extends' as const,
  },
]

// ─── Personas (GovEA Project) ─────────────────────────────────────────────────
// All 16 personas from `business-architecture/personas/` are seeded so the
// GovEA Project org models the actual product's persona thesis. Validation
// status carried forward as `description` — all are still Assumed pending the
// #384 Tier-1 interview push.

export const GOVEA_PROJECT_PERSONAS = [
  {
    name: 'Enterprise Architect',
    description: 'The lead EA practitioner in central IT. Authors the capability map, applications portfolio, and ADRs. Validation Status: Assumed. Pain points: capability-application linkage rots between releases; debt visibility is hard to surface to leadership; ARB inputs are scattered across docs.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Agency EA Coordinator',
    description: 'Maintains an agency\'s slice of a shared architecture repository and liaises with central EA. Validation Status: Assumed. Critical insight: recognition of their agency\'s work in the central catalogue gates engagement with federation features.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'Department Director',
    description: 'Senior leader consuming roadmaps, capability assessments, and executive summaries. Validation Status: Assumed. Wants the big picture without reading EA jargon; tracks investment-to-outcome.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Junior EA Analyst',
    description: 'Early-career analyst contributing capability, application, and principle records under guidance. Validation Status: Assumed. Needs guardrails for duplicate-name, unsaved-changes, and required-field guidance.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Elected Official',
    description: 'Council member or board member who reviews published executive summaries. Validation Status: Assumed; flagged P1 in stakeholder-assumption-register.md (GA-1 staff-proxy hypothesis). Recommended first Tier-1 interview per validation-plan.md.',
    type: 'Elected Official',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'Budget & Performance Analyst',
    description: 'Connects financial signals back to the portfolio. Validation Status: Assumed; GA-3 risk is high — budget-analyst questions about cost centres, FTEs, and contract vehicles may not map to GovEA entity types.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Programme Director',
    description: 'Accountable for strategic initiatives and capability adoption across the portfolio. Validation Status: Assumed. Uses GovEA to track initiative progress, capability impacts, and linkage to strategic objectives.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Domain Architect',
    description: 'Owns a slice of the repository — data, security, integration, or other domain. Validation Status: Assumed. Pain point: domain ownership defaults back to central EA, leaving coverage shallow.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Data Modeler',
    description: 'Works in the data-architecture module on entities, attributes, and links. Validation Status: Assumed; SME-grounded but uncorroborated against other practitioners.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Enterprise Data Architect',
    description: 'Senior data architect responsible for data architecture across the organisation. Validation Status: Assumed; SME-grounded via extended design conversation, awaiting corroboration.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Business Stakeholder',
    description: 'Programme or project manager who consumes EA outputs without authoring content. Validation Status: Assumed; derived from cross-tool market research.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Consultant / Systems Integrator',
    description: 'Implements or supports EA tools in state and local government engagements. Validation Status: Assumed. Needs reusable starter libraries and handoff exports.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'Early-Maturity Practice Lead',
    description: 'Standing up an EA practice for the first time. Validation Status: Assumed. Needs starter content, tours, and confidence cues that lower the practice-startup cost.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Content Viewer',
    description: 'Non-authoring reader of published EA content. Validation Status: Assumed; broad category covering external stakeholders.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'CMS Administrator',
    description: 'Manages GovEA instance settings, module availability, user roles, taxonomy. Validation Status: Assumed.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Instance Administrator',
    description: 'Platform-scoped operating role for a shared GovEA instance — runs the platform across organisations, not the content. Validation Status: Assumed; drafted from current platform-operations model, not user interviews.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'instance' as const,
  },
]

// ─── Capabilities (GovEA Project) ─────────────────────────────────────────────
// One record per top-level capability group from `business-architecture/capabilities/`,
// using the labels shipped in `capabilities.md`. Sub-capabilities live in the
// canonical docs; here we keep the group cardinality manageable for the demo.

export const GOVEA_PROJECT_CAPABILITIES = [
  {
    name: 'Identity & Access Management',
    description: 'Authenticate users, enforce role-based access, manage SSO and pre-provisioning, and record every authentication and authorisation event. Includes OIDC, local-auth fallback, break-glass sessions, and act-as impersonation.',
    domain: 'Platform',
    behaviors: 'OIDC SSO with admin-managed pre-provisioning\nAdmin / Contributor / Viewer role enforcement\nBreak-glass session for cross-tenant operations\nImmutable audit trail of every access event',
    rules: 'New SSO users default to Viewer until promoted by an admin\nOne active admin is always required per organisation\nBreak-glass sessions have an enforced TTL',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator', 'Instance Administrator', 'Enterprise Architect'],
  },
  {
    name: 'Content Management',
    description: 'Author, publish, archive, and version EA content across all entity types (capabilities, personas, applications, ADRs, principles, value streams). Includes content workflow status, visibility scopes, and shared taxonomy.',
    domain: 'Platform',
    behaviors: 'Draft / Published / Archived workflow on every authored entity\nOrg / Connections / Instance visibility scopes\nTaxonomy-backed reference fields\nDirty-tracker + duplicate-name guard in authoring forms',
    rules: 'Content in draft is only visible to authenticated authors in the same organisation\nArchived content is read-only\nVisibility beyond org requires admin approval',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Junior EA Analyst', 'Content Viewer', 'CMS Administrator'],
  },
  {
    name: 'Portfolio Management',
    description: 'Catalogue applications, ADRs, architecture debt, and capability-application linkage. Track lifecycle status, hosting model, and ownership; surface lifecycle risk as auto-detected debt.',
    domain: 'Enterprise Architecture',
    behaviors: 'Application records with lifecycle, vendor, hosting model\nADR create / edit / supersession chain\nManual + auto-detected architecture debt with severity and resolution path\nCustom fields on applications via taxonomy',
    rules: 'Applications must link to at least one capability before they appear in capability views\nDecommissioned applications are read-only except by admins',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Programme Director', 'Department Director'],
  },
  {
    name: 'Planning & Roadmap',
    description: 'Connect strategic intent to delivery — goals, strategic objectives, initiatives, and the executive roadmap timeline. Cross-link initiatives to capabilities they build or improve.',
    domain: 'Enterprise Architecture',
    behaviors: 'Goal -> Objective -> Initiative -> Capability traceability\nInitiative lifecycle (proposed / active / on-hold / complete / cancelled)\nRoadmap grid + executive timeline views\nObjective and initiative status filters',
    rules: 'Initiatives link to at least one capability they affect\nObjectives cascade up to goals; goals cascade up to mission',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Programme Director', 'Department Director', 'Elected Official'],
  },
  {
    name: 'Frontend Display',
    description: 'Stakeholder-facing views: Executive Summary, Heatmap Analysis, Application Landscape, Roadmap Timeline, Impact Analysis, Guided Answers, the in-product Overview page, and read-only Traceability hubs.',
    domain: 'Enterprise Architecture',
    behaviors: 'Plain-language outputs from existing repository content\nGuided answer view from natural-language repository search\nRole-aware visibility on dashboards and reports\nPrint / export-ready output on executive, roadmap, traceability, answers',
    rules: 'Viewer-visible content respects status + visibility rules\nNo admin-only configuration content surfaces in stakeholder reports',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Department Director', 'Elected Official', 'Budget & Performance Analyst', 'Programme Director', 'Content Viewer'],
  },
  {
    name: 'Admin Configuration',
    description: 'Organisation-level configuration: themes, module enablement, email configuration, taxonomy management, security settings, and admin notices.',
    domain: 'Platform',
    behaviors: 'Per-org theme + enabled-modules settings\nEncrypted SMTP configuration UI + delivery log\nOrg-scoped taxonomy administration\nOrg-wide and instance-wide admin notices',
    rules: 'Module disablement redirects routes to /dashboard for affected modules\nSMTP credentials are encrypted at rest',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator', 'Instance Administrator'],
  },
  {
    name: 'Multi-Organization Federation',
    description: 'Connect organisations, share content at agreed visibility levels, approve cross-org capability links, and view federated remote detail pages. Write-protection enforces cross-org guardrails.',
    domain: 'Platform',
    behaviors: 'Connection request + approval workflow\nCross-org capability link with typed relationships\nRead-only remote detail pages with provenance\nReverse-direction seed links exercise source-side personas',
    rules: 'Both organisations accept a connection before content is shared\nCross-org link writes require target-org admin approval',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['CMS Administrator', 'Agency EA Coordinator', 'Enterprise Architect'],
  },
  {
    name: 'Repository & Modelling',
    description: 'Capability mapping, persona modelling, repository completeness, capability relationship maps, end-to-end traceability views, and architecture debt tracking.',
    domain: 'Enterprise Architecture',
    behaviors: 'Capability map + Mermaid + focused-SVG diagrams\nRepository completeness scoring per capability domain\nDaily completeness snapshots + trend history\nLifecycle-based system-detected debt\nDebt severity (low -> critical) and resolution workflow',
    rules: 'Capabilities must link to at least one persona before publish\nSystem-detected debt cannot be manually deleted',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Junior EA Analyst', 'Programme Director'],
  },
  {
    name: 'Data Architecture',
    description: 'Entities, attributes, semantic links, business keys, and a Chen-notation diagram for data-architecture work. Naming-standard hints on physical-table fields.',
    domain: 'Enterprise Architecture',
    behaviors: 'Entity / attribute / link / business-key CRUD\nChen-notation diagram visualisation\nData Vault naming hints on physical-table fields\nGraph-style traversal across entity types',
    rules: 'Quality cues and a roll-up scorecard remain in design (#573)',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Data Modeler', 'Enterprise Data Architect', 'Enterprise Architect'],
  },
  {
    name: 'Framework Alignment',
    description: 'Optional TOGAF and SAFe overlays that map GovEA content to external framework artefacts. Overlays are explicitly optional — they do not replace the core GovEA model.',
    domain: 'Enterprise Architecture',
    behaviors: 'TOGAF Application Landscape generated report\nFramework mapping tables (taxonomy-backed)\nADR-002 records the EasyEA-first decision with TOGAF as overlay',
    rules: 'No GovEA capability depends on a TOGAF or SAFe mapping being present',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Domain Architect'],
  },
  {
    name: 'Deployment & Operations',
    description: 'Self-host install path, containerised deployment, traceable release pipeline (CI-chained build + smoke + rollback), and operational documentation.',
    domain: 'Platform',
    behaviors: 'Containerised build via container-runtime-agnostic compose helper\nTraceable release pipeline with commit / image / digest / revision in run summary\nManual rollback workflow targeting prior revision\nOperator-owned deploy automation outside the public repo',
    rules: 'Operator-specific deployment topology is not stored in the public repository (R-002)\nMain-branch merges produce immutable SHA-tagged images',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator', 'Instance Administrator', 'Enterprise Architect'],
  },
]

// ─── Applications (GovEA Project) ─────────────────────────────────────────────
// Generic / portable application names — no operator-specific cloud-vendor
// or resource names appear here (R-002). The GovEA Project models the
// software stack as a pattern, not as a deployment-specific instance.

export const GOVEA_PROJECT_APPLICATIONS = [
  {
    name: 'GovEA Web Application',
    description: 'The GovEA Next.js application — primary UI for EA authoring, repository browsing, reporting, and administration. Open source; runs containerised on any cloud or on-prem container platform.',
    vendor: 'GovEA Project (open source, MIT)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Identity & Access Management', 'Content Management', 'Portfolio Management', 'Planning & Roadmap', 'Frontend Display', 'Admin Configuration', 'Multi-Organization Federation', 'Repository & Modelling', 'Data Architecture', 'Framework Alignment', 'Deployment & Operations'],
  },
  {
    name: 'PostgreSQL Database',
    description: 'Primary persistence layer for all EA content, taxonomy, audit log, notifications, and federation state. Append-only audit_log enforced at the database via Postgres trigger.',
    vendor: 'PostgreSQL Global Development Group',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Content Management', 'Portfolio Management', 'Repository & Modelling', 'Identity & Access Management'],
  },
  {
    name: 'Container Runtime',
    description: 'Runtime-agnostic container platform (Podman or Docker) used for local development and as the deployment target. The compose helper (`scripts/container-compose.sh`) detects the available runtime automatically.',
    vendor: 'Podman / Docker (vendor-neutral)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Deployment & Operations'],
  },
  {
    name: 'GitHub',
    description: 'Source control, issue tracking, pull-request review, and CI orchestration. CI runs type-check, lint, integration tests, and E2E smoke + overview specs on every PR.',
    vendor: 'GitHub (Microsoft)',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Deployment & Operations', 'Content Management'],
  },
  {
    name: '@govea/core package',
    description: 'Reusable internal package providing CMS-pattern primitives: RBAC, audit, taxonomy, workflow, content type, and recipe-based seeding. Consumed by the GovEA Web Application and intended for downstream reuse.',
    vendor: 'GovEA Project (internal)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Content Management', 'Identity & Access Management', 'Portfolio Management'],
  },
  {
    name: 'EasyEA Framework',
    description: 'The methodology that governs GovEA design and product direction: people-centred, lightweight, designed for everyday work. Referenced from Standards.md; principles modelled below.',
    vendor: 'EasyEA (open source, MIT)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Repository & Modelling', 'Content Management', 'Framework Alignment'],
  },
  {
    name: 'Playwright',
    description: 'End-to-end browser testing framework. Runs the smoke + overview specs against a real Postgres-backed Next.js server in CI. Headless Chromium only.',
    vendor: 'Microsoft (open source)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Deployment & Operations', 'Identity & Access Management'],
  },
  {
    name: 'Drizzle ORM + drizzle-kit',
    description: 'Schema definition and database migration tooling. Pre-production uses `db:push --force` directly to the schema; will switch to `db:migrate` when the first real tenant exists.',
    vendor: 'Drizzle Team (open source)',
    hostingModel: 'self-hosted',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Content Management', 'Portfolio Management'],
  },
]

// Retired applications — explicitly removed from any GovEA Project org on
// the next seed run. The cleanup runs before the upsert so the old rows
// don't linger after this dogfood refresh (#518).
export const RETIRED_GOVEA_PROJECT_APPLICATIONS = [
  'Vercel',
  'PostgreSQL (Neon)',
] as const

// ─── Value Streams (GovEA Project) ────────────────────────────────────────────
// Retained from the prior dogfood; the "Deployment & Seeding" stage in
// "Open Source Adoption" updated to remove operator-specific cloud refs.

export const GOVEA_PROJECT_VALUE_STREAMS = [
  {
    name: 'Feature Idea to Production',
    description: 'End-to-end flow from a user need or contributor idea through design, development, review, and deployment to production. Every step traces back to a capability ID and persona.',
    valueItem: 'A merged, released improvement to GovEA that is available to all users',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Programme Director', 'Enterprise Architect'],
    stages: [
      {
        name: 'Issue & Capability Traceability',
        description: 'A feature idea is raised as a GitHub issue. Capability ID and persona are confirmed before any code is written. Acceptance criteria are agreed.',
        order: 1,
        capabilities: ['Repository & Modelling', 'Content Management'],
      },
      {
        name: 'Design & Build',
        description: 'The feature is designed and implemented in a git branch. Architectural decisions are recorded as ADRs where appropriate. Tests are written alongside code.',
        order: 2,
        capabilities: ['Content Management', 'Portfolio Management'],
      },
      {
        name: 'Review & Merge',
        description: 'A pull request is reviewed against acceptance criteria. CI gates (type-check, lint, integration, smoke) must pass before merge. Humans merge.',
        order: 3,
        capabilities: ['Deployment & Operations', 'Content Management'],
      },
      {
        name: 'Release to Demo',
        description: 'Main-branch merge triggers the release pipeline. An immutable SHA-tagged image is built, deployed, smoke-checked. Commit / image / digest / revision are recorded in the run summary.',
        order: 4,
        capabilities: ['Deployment & Operations'],
      },
    ],
  },
  {
    name: 'EA Gap to Published Architecture',
    description: 'Journey from identifying a gap in the EA repository through to a reviewed, published architecture record.',
    valueItem: 'Published, linked EA content that accurately reflects current state',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Junior EA Analyst'],
    stages: [
      {
        name: 'Gap Identification',
        description: 'Repository completeness dashboard, persona-journey audit, or peer review surfaces a gap, stale record, or missing linkage.',
        order: 1,
        capabilities: ['Repository & Modelling', 'Frontend Display'],
      },
      {
        name: 'Content Authoring',
        description: 'The architect or analyst creates or updates the record in draft status, filling all required fields and adding initial cross-links.',
        order: 2,
        capabilities: ['Content Management', 'Portfolio Management', 'Data Architecture'],
      },
      {
        name: 'Cross-Link & Enrich',
        description: 'The draft is linked to related capabilities, personas, applications, initiatives, and value streams. Traceability from strategic objective to data entity is verified.',
        order: 3,
        capabilities: ['Repository & Modelling', 'Portfolio Management'],
      },
      {
        name: 'Review & Publish',
        description: 'The enriched draft is reviewed for accuracy and completeness, debt items linked to the gap are resolved, and the record is published at the appropriate visibility scope.',
        order: 4,
        capabilities: ['Content Management', 'Repository & Modelling'],
      },
    ],
  },
  {
    name: 'Open Source Adoption',
    description: 'Journey a government organisation takes from first discovering GovEA through self-hosted or hosted deployment, initial seeding, and an active EA practice.',
    valueItem: 'A government organisation running an active EA practice in GovEA',
    status: 'published' as const,
    visibility: 'connections' as const,
    stakeholderPersonas: ['Enterprise Architect', 'CMS Administrator', 'Consultant / Systems Integrator'],
    stages: [
      {
        name: 'Discovery',
        description: 'The organisation becomes aware of GovEA — through a peer referral, conference, or GitHub — and reviews the project documentation and live demo environment.',
        order: 1,
        capabilities: ['Frontend Display', 'Repository & Modelling'],
      },
      {
        name: 'Evaluation',
        description: 'The EA team evaluates GovEA against their capability and persona requirements, reviewing EasyEA methodology alignment and comparing to incumbent tools.',
        order: 2,
        capabilities: ['Frontend Display', 'Repository & Modelling'],
      },
      {
        name: 'Deployment & Seeding',
        description: 'GovEA is deployed as a container on the organisation\'s chosen platform. Admin and contributor accounts are created, modules are enabled, and starter content is loaded.',
        order: 3,
        capabilities: ['Deployment & Operations', 'Identity & Access Management', 'Admin Configuration'],
      },
      {
        name: 'Active EA Practice',
        description: 'The organisation maintains a live repository: capabilities, applications, ADRs, and value streams are regularly updated; completeness scores are monitored; debt items are actioned.',
        order: 4,
        capabilities: ['Repository & Modelling', 'Portfolio Management', 'Content Management'],
      },
    ],
  },
  {
    name: 'Architecture Decision Governance',
    description: 'The path from an identified architectural issue or choice through structured deliberation to a published, linked ADR.',
    valueItem: 'A published ADR documenting context, rationale, and consequences — linked to affected capabilities and initiatives',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Programme Director', 'Domain Architect'],
    stages: [
      {
        name: 'Issue Surfaced',
        description: 'An architectural issue or pending decision is identified — from a debt item, initiative design session, or ARB review.',
        order: 1,
        capabilities: ['Portfolio Management', 'Repository & Modelling'],
      },
      {
        name: 'Context Captured',
        description: 'The decision context is documented: problem statement, constraints, options considered. Relevant capabilities and initiatives are linked.',
        order: 2,
        capabilities: ['Portfolio Management', 'Content Management'],
      },
      {
        name: 'Decision Drafted',
        description: 'The preferred option is recorded in a draft ADR with full rationale and consequences. Supersession chain links a superseded ADR if applicable.',
        order: 3,
        capabilities: ['Portfolio Management', 'Content Management'],
      },
      {
        name: 'Stakeholder Review',
        description: 'The draft ADR is circulated to affected teams and initiative owners. Feedback is incorporated and the decision is confirmed or revised.',
        order: 4,
        capabilities: ['Portfolio Management'],
      },
      {
        name: 'Published & Linked',
        description: 'The ADR is published, linked to all affected capabilities, initiatives, and objectives, and any resolved debt items are closed.',
        order: 5,
        capabilities: ['Portfolio Management', 'Repository & Modelling'],
      },
    ],
  },
  {
    name: 'Persona Validation Cycle',
    description: 'How an Assumed persona moves to Validated: interview planning, conversation, capture, and propagation back into product priorities. Anchors the #384 work.',
    valueItem: 'A persona whose claims are confirmed by at least one real practitioner — or disconfirmed and corrected',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Programme Director'],
    stages: [
      {
        name: 'Plan',
        description: 'Identify Tier-1 personas and the riskiest assumption per persona using the stakeholder-assumption-register. Pick the next conversation and the interview guide variant.',
        order: 1,
        capabilities: ['Repository & Modelling'],
      },
      {
        name: 'Interview',
        description: 'Conduct a 30–45 minute structured conversation. Take notes on surprises — disconfirming an assumption is more valuable than confirming one.',
        order: 2,
        capabilities: ['Repository & Modelling'],
      },
      {
        name: 'Capture',
        description: 'Update the persona file with Validated or Disconfirmed status and a one-line note. Log a feedback-log.md row for each disconfirmed claim.',
        order: 3,
        capabilities: ['Content Management', 'Repository & Modelling'],
      },
      {
        name: 'Propagate',
        description: 'File backlog issues for any Disconfirmed P1 assumption whose feature is shipped or in flight. Re-rank product-priorities.md if findings change the next move.',
        order: 4,
        capabilities: ['Planning & Roadmap', 'Repository & Modelling'],
      },
    ],
  },
  {
    name: 'ARB Review Cycle',
    description: 'How an Architecture Review Board finding moves from logged to resolved. Tied directly to Standards.md §"ARB Finding Issue Format" and the High-severity finding rule.',
    valueItem: 'A resolved or accepted ARB finding whose decision is recorded in the repository as a closed issue + ADR + debt item state change',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Domain Architect'],
    stages: [
      {
        name: 'Finding Logged',
        description: 'A reviewer logs an ARB finding using the Standards.md template: severity, mode, problem, gap, recommended action, affected files. Filed as a GitHub issue with arb-finding + severity:* + design labels.',
        order: 1,
        capabilities: ['Repository & Modelling', 'Portfolio Management'],
      },
      {
        name: 'Severity Triage',
        description: 'Severity is confirmed or contested. High-severity findings block implementation on affected capabilities per Standards.md. Medium and below are scheduled into the next backlog cycle.',
        order: 2,
        capabilities: ['Portfolio Management', 'Planning & Roadmap'],
      },
      {
        name: 'Remediation',
        description: 'A PR addresses the finding. The PR description references the finding issue and the capability it touches. ADRs are written where a finding produces a design decision.',
        order: 3,
        capabilities: ['Portfolio Management', 'Content Management'],
      },
      {
        name: 'Closed or Accepted',
        description: 'Finding is closed with the PR that resolved it, or formally accepted (status: accepted) with documented rationale. Severity ages tracked at grooming.',
        order: 4,
        capabilities: ['Portfolio Management', 'Repository & Modelling'],
      },
    ],
  },
]

// ─── Goals (GovEA Project) ───────────────────────────────────────────────────
// New for #518. The mission-aligned strategic goals that sit above the
// milestone-shaped objectives. Each goal links to one or more objectives via
// run.ts wiring.

export const GOVEA_PROJECT_GOALS = [
  {
    name: 'Open-source EA tooling fit for state and local government',
    description: 'Make a high-quality, free, open-source enterprise-architecture tool available to state and local government IT teams who would otherwise be priced out of commercial EA tooling or stuck with bespoke spreadsheets. The bar is not "feature parity"; it is "would a real EA team in a real agency adopt this on a Monday and still be using it on Friday."',
    planningHorizon: '2026–2028',
    owner: 'GovEA Maintainer Team',
    status: 'published' as const,
    visibility: 'org' as const,
    objectives: ['Reach Practice-Ready (v1.0)', 'Validate adoption with real practitioners (v1.5)'],
  },
  {
    name: 'AI-enabled EA development, end to end',
    description: 'Demonstrate that AI-assisted authoring is a first-class workflow for EA — not a bolt-on at the end. Every persona, capability, ADR, and decision is reviewable, traceable, and producible with AI assistance, while humans remain solely responsible for merge.',
    planningHorizon: '2026–2028',
    owner: 'GovEA Maintainer Team',
    status: 'published' as const,
    visibility: 'org' as const,
    objectives: ['Pay down foundation debt (v0.9)', 'Reach Practice-Ready (v1.0)'],
  },
  {
    name: 'Persona-validated product direction',
    description: 'Move from a backlog driven by Assumed personas to one driven by Validated personas. Every persona file currently carries "Validation Status: Assumed"; the goal is at least Tier-1 personas with real conversations recorded by end of v1.5.',
    planningHorizon: '2026',
    owner: 'GovEA Maintainer Team',
    status: 'published' as const,
    visibility: 'org' as const,
    objectives: ['Validate adoption with real practitioners (v1.5)'],
  },
  {
    name: 'Portable, multi-organisation architecture practice',
    description: 'Support federation between government organisations as a first-class concern, so an agency can publish its capabilities to a peer, link cross-org records, and run a real practice without being locked into a single-tenant deployment.',
    planningHorizon: '2026–2027',
    owner: 'GovEA Maintainer Team',
    status: 'published' as const,
    visibility: 'connections' as const,
    objectives: ['Reach platform-and-integration scale (v2.0)'],
  },
]

// ─── Strategic Objectives (GovEA Project) ─────────────────────────────────────
// One objective per release milestone (v0.9 / v1.0 / v1.5 / v2.0). The milestone
// descriptions on GitHub are the source of truth; these are the in-product
// reflection used for the executive summary view.

export const GOVEA_PROJECT_OBJECTIVES = [
  {
    name: 'Pay down foundation debt (v0.9)',
    description: 'Close v0.9 Foundation Cleanup. Resolve open ARB findings, consolidate RBAC into a single source of truth, add visual-regression coverage on critical paths, make local bootstrap reproducible, and ensure docs match shipped reality.',
    successMetric: 'All 6 open v0.9 issues closed (#10, #34, #35, #119, #120, #482); High-severity ARB findings = 0',
    timeHorizon: 'Q2-Q3 2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Identity & Access Management', 'Deployment & Operations'],
    valueStreams: ['ARB Review Cycle'],
  },
  {
    name: 'Reach Practice-Ready (v1.0)',
    description: 'Close v1.0 Practice-Ready. A single Agency EA Coordinator or Enterprise Architect at a real state/local government org can install GovEA, populate it, and use it for real EA work without external workarounds.',
    successMetric: 'Self-host install guide verified by an external user; ADR authoring + Data Export shipped; Phase 1 feedback log collecting signal',
    timeHorizon: 'Q3-Q4 2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Content Management', 'Portfolio Management', 'Planning & Roadmap', 'Frontend Display', 'Admin Configuration'],
    valueStreams: ['Open Source Adoption', 'EA Gap to Published Architecture'],
  },
  {
    name: 'Validate adoption with real practitioners (v1.5)',
    description: 'Close v1.5 Adoption-Validated. Tier-1 personas have at least one real interview; in-product feedback widget shipped; assumption register rows marked Validated or Disconfirmed; persona files updated.',
    successMetric: '4+ Tier-1 interviews recorded; ≥1 persona moved to Validated; feedback widget shipped (#103 Phase 2)',
    timeHorizon: 'Q4 2026 – Q1 2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Frontend Display'],
    valueStreams: ['Persona Validation Cycle'],
  },
  {
    name: 'Reach platform-and-integration scale (v2.0)',
    description: 'Close v2.0 Platform & Integration. GovEA can be hosted as a multi-tenant platform and connected to external systems of record. REST API + Tier-1 sync; ADR + debt first-class; change notifications working; TOGAF redesign decision applied.',
    successMetric: 'First Tier-1 integration target chosen and shipped; multi-tenant lifecycle governance complete',
    timeHorizon: '2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Multi-Organization Federation', 'Admin Configuration', 'Framework Alignment'],
    valueStreams: [] as string[],
  },
]

// ─── Initiatives (GovEA Project) ──────────────────────────────────────────────
// Replaces the prior 4-initiative seed with the actual current GovEA work.
// Status mix: complete (recently shipped), active (in flight), proposed
// (queued), on-hold (waiting on external blocker).

export const GOVEA_PROJECT_INITIATIVES = [
  // Recently shipped (complete)
  {
    name: 'In-app Stakeholder Product Overview (#614)',
    description: 'Static /overview route explaining what GovEA is, what is shipped vs maturing, who it is for, and what is coming next. Sliced A/B/C: page, role-aware CTAs, Coming-next priorities tile.',
    status: 'complete' as const,
    startDate: '2026-05-22',
    endDate: '2026-05-26',
    capabilities: [
      { name: 'Frontend Display', impact: 'build' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
    ],
    objectives: ['Reach Practice-Ready (v1.0)'],
  },
  {
    name: 'Traceable Release Pipeline (#504)',
    description: 'CI-chained deploy workflow that builds SHA-tagged immutable images, captures commit / image / digest / revision in the run summary, smoke-tests the live URL, and exposes a one-click rollback workflow. Public-repo portion shipped; operator-specific automation now lives in a private repo per R-002.',
    status: 'complete' as const,
    startDate: '2026-05-25',
    endDate: '2026-05-26',
    capabilities: [
      { name: 'Deployment & Operations', impact: 'build' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
      { name: 'GitHub', impact: 'improve' },
    ],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    name: 'Persona Validation — Documentation Infrastructure (#384 prep)',
    description: 'Validation plan, assumption-register extension (Repository Modelling + Integration sections), and Phase 1 feedback log scoped to recently shipped analysis/reporting surfaces. The actual interviews remain the human task.',
    status: 'complete' as const,
    startDate: '2026-05-26',
    endDate: '2026-05-26',
    capabilities: [
      { name: 'Repository & Modelling', impact: 'improve' },
      { name: 'Content Management', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
    ],
    objectives: ['Validate adoption with real practitioners (v1.5)'],
  },
  // Active
  {
    name: 'Persona Validation — Tier-1 Interviews (#384 follow-through)',
    description: 'Run the first Tier-1 interview per the validation plan. Recommended first conversation: Elected Official or chief of staff (GA-1 staff-proxy hypothesis). One conversation moves a persona to Validated and unlocks ranks 4–5 of the prior priorities list.',
    status: 'active' as const,
    startDate: '2026-05-26',
    endDate: null as string | null,
    capabilities: [
      { name: 'Repository & Modelling', impact: 'improve' },
    ],
    applications: [] as { name: string; impact: string }[],
    objectives: ['Validate adoption with real practitioners (v1.5)'],
  },
  {
    name: 'GovEA Project Dogfood Refresh (#518)',
    description: 'Maintain the seeded GovEA Project organisation as continuous product documentation: 16 personas, 11 capability groups, generic application stack, goals, milestone-shaped objectives, current initiatives, ADRs, glossary, services, and architecture debt all reflect the actual current state of the project. Recurring habit, not a one-shot — re-run with each grooming pass.',
    status: 'active' as const,
    startDate: '2026-05-26',
    endDate: null as string | null,
    capabilities: [
      { name: 'Repository & Modelling', impact: 'improve' },
      { name: 'Content Management', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
    ],
    objectives: ['Reach Practice-Ready (v1.0)'],
  },
  // Proposed (queued)
  {
    name: 'Close Only Open High-Severity ARB Finding (#10)',
    description: 'Close the residual v1/v2 scope-signal work on capability files. The deployment-operations group ship closed half of #10; the remaining capability scope-signal work is doc-shaped and gates further capability-doc work per Standards.md.',
    status: 'proposed' as const,
    startDate: null as string | null,
    endDate: null as string | null,
    capabilities: [
      { name: 'Repository & Modelling', impact: 'improve' },
    ],
    applications: [] as { name: string; impact: string }[],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    name: 'Consolidate RBAC into a Single Source of Truth (#34)',
    description: 'Choose `@govea/core` as the canonical RBAC source. Remove the parallel app-level RBAC definitions in `apps/govea/src/lib/rbac.ts`. Centralise role/permission helpers. Add a regression test that fails if both sources define the same role.',
    status: 'proposed' as const,
    startDate: null as string | null,
    endDate: null as string | null,
    capabilities: [
      { name: 'Identity & Access Management', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
      { name: '@govea/core package', impact: 'improve' },
    ],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    name: 'AI Session Bootstrap Doc (#482)',
    description: 'Author `docs/AI-SESSION-START.md` and tighten `CLAUDE.md` so the per-session AI context blob can shrink to ~10 lines pointing at canonical docs.',
    status: 'proposed' as const,
    startDate: null as string | null,
    endDate: null as string | null,
    capabilities: [
      { name: 'Deployment & Operations', impact: 'improve' },
    ],
    applications: [] as { name: string; impact: string }[],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  // On hold
  {
    name: 'SMTP Transport (#528 follow-up)',
    description: 'Real outbound email send path behind the shipped Email Configuration UI. Held until an outbound mail account is available. Change-notification email delivery (#581, #87) is gated on this.',
    status: 'on-hold' as const,
    startDate: null as string | null,
    endDate: null as string | null,
    capabilities: [
      { name: 'Admin Configuration', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web Application', impact: 'improve' },
    ],
    objectives: ['Reach Practice-Ready (v1.0)'],
  },
]

// ─── ADRs (GovEA Project) ─────────────────────────────────────────────────────
// ADR-001 → ADR-002 supersession chain retained. Added ADR-004 .. ADR-008 to
// reflect decisions actually made during the build-out.

export const GOVEA_PROJECT_ADRS = [
  {
    number: 'ADR-001',
    title: 'Adopt TOGAF as the canonical EA framework',
    context: 'At project inception GovEA needed a recognised EA framework to structure its metamodel and terminology. TOGAF is the most widely adopted framework in government EA contexts.',
    decision: 'GovEA will adopt TOGAF as its canonical framework. The content metamodel, terminology, and capability groupings will align with TOGAF ADM phases and the TOGAF Content Framework.',
    consequences: 'Provided an established vocabulary and reduced time-to-first-model. Created significant friction for non-specialist government staff unfamiliar with TOGAF jargon. Superseded by ADR-002 when user research confirmed TOGAF terminology was a barrier to adoption.',
    status: 'superseded' as const,
    supersededByNumber: 'ADR-002',
    capabilities: ['Content Management', 'Framework Alignment'],
    applications: [] as string[],
    initiatives: [] as string[],
    objectives: [] as string[],
  },
  {
    number: 'ADR-002',
    title: 'Adopt EasyEA as the canonical framework with optional TOGAF overlay',
    context: 'User research across multiple state and local government teams found that TOGAF terminology (ADM phases, BDAT layers, architecture building blocks) was consistently cited as a barrier to adoption. Non-specialist staff could not map day-to-day work onto TOGAF vocabulary without expert facilitation. EasyEA is lightweight, people-centred, and designed for government teams without dedicated EA staff.',
    decision: 'GovEA adopts EasyEA as its canonical framework. The core metamodel uses plain-language terms (capabilities, personas, value streams, principles). TOGAF-aligned terminology is available as an optional overlay for organisations that require it.',
    consequences: 'Significantly improved adoption signal in early pilots. TOGAF overlay maintained but not actively developed. Supersedes ADR-001.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Content Management', 'Framework Alignment', 'Repository & Modelling'],
    applications: ['GovEA Web Application', 'EasyEA Framework'],
    initiatives: [] as string[],
    objectives: ['Reach Practice-Ready (v1.0)'],
  },
  {
    number: 'ADR-003',
    title: 'Use raw SQL with indexed CTEs for traversal and completeness queries',
    context: 'GovEA\'s completeness scoring and cross-entity traversal queries must traverse capability → application → personas → value streams → objectives in a single request. Drizzle ORM query builder generates N+1 patterns for these traversals. Under load with 500 capabilities, ORM-generated queries exceeded the 200ms dashboard budget.',
    decision: 'Completeness and traversal queries are implemented as raw SQL using indexed CTEs rather than the Drizzle query builder. Drizzle is retained for all CRUD operations. A 200ms query budget is enforced for dashboard queries.',
    consequences: 'Dashboard load times stayed under budget. Raw SQL requires explicit injection-safety review. Query complexity is centralised in a small number of files, reducing the surface area for performance regressions.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Repository & Modelling', 'Frontend Display'],
    applications: ['PostgreSQL Database', 'GovEA Web Application', 'Drizzle ORM + drizzle-kit'],
    initiatives: [] as string[],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    number: 'ADR-004',
    title: 'Ship a Postgres-trigger-enforced append-only audit_log',
    context: 'GovEA\'s audit_log is the system of record for who changed what. ORM-level "do not update" enforcement is bypassable from any code path that holds a DB connection. Standards.md treats the audit trail as evidence; the integrity guarantee must hold even against a compromised admin role.',
    decision: 'Enforce audit-log immutability at the database via Postgres triggers that block UPDATE and DELETE on `audit_log`. SQL lives in `apps/govea/src/db/sql/audit-immutable.sql`; idempotent re-apply via `db:apply-triggers`.',
    consequences: 'Operators cannot retroactively edit audit history, including by themselves. CI applies the trigger automatically. The same `db:apply-triggers` script is the future home for any new DB-level constraint that drizzle-kit can\'t manage.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Identity & Access Management', 'Repository & Modelling'],
    applications: ['PostgreSQL Database', 'GovEA Web Application'],
    initiatives: [] as string[],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    number: 'ADR-005',
    title: 'Keep operator-specific deploy automation out of the public repository',
    context: 'PR #504 demonstrated the desired release-pipeline behaviour: CI-chained build, SHA-tagged image, immutable digest, post-deploy smoke, one-click rollback. Implementing it in `.github/workflows/deploy-azure-dev.yml` in the public repo exposed operator-specific cloud account, resource group, and registry topology to anyone reading the source.',
    decision: 'The desired release-pipeline shape is preserved (commit / image / digest / revision recorded, post-deploy smoke, rollback workflow). The implementation moves to a private operator-owned repository or another private deployment system. The public `scripts/azure-dev.sh` parameterises operator-specific names via `GOVEA_AZURE_*` environment variables and contains no hard-coded resource identifiers.',
    consequences: 'Public repo remains operator-neutral. Risk R-002 stays "Open" until the private-repo migration is complete, then moves to "Mitigated". Operators self-host the deploy automation; the documentation links describe the shape, not the implementation.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Deployment & Operations'],
    applications: ['GovEA Web Application', 'Container Runtime', 'GitHub'],
    initiatives: ['Traceable Release Pipeline (#504)'],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    number: 'ADR-006',
    title: 'Gate persona-validation-sensitive features on real interviews, not assumptions',
    context: 'Standards.md §"Persona Validation Status" requires that "Implementation work that depends solely on assumed personas carries elevated risk and should be noted in the relevant issues." In practice several near-term differentiator items (#547, #573, #563, #88) depended on personas none of which had been validated. Without a gating rule, polished features were at risk of shipping against assumed stakeholder behaviour.',
    decision: 'Persona-validation-sensitive features are formally gated on a Tier-1 interview per `docs/research/validation-plan.md`. Features that depend on a specific persona\'s claims do not start implementation until that persona has at least one real conversation recorded. Issues for gated features carry a "validation prerequisite" note linking to the relevant assumption-register row.',
    consequences: 'Some features delay until the interview push lands; the cost is real but smaller than the cost of shipping into unvalidated personas. Backlog grooming applies the gate explicitly. The validation plan defines the exit criteria.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Repository & Modelling', 'Frontend Display', 'Planning & Roadmap'],
    applications: ['GovEA Web Application'],
    initiatives: ['Persona Validation — Documentation Infrastructure (#384 prep)', 'Persona Validation — Tier-1 Interviews (#384 follow-through)'],
    objectives: ['Validate adoption with real practitioners (v1.5)'],
  },
  {
    number: 'ADR-007',
    title: 'Use OIDC federated credentials, not long-lived service-principal secrets, for cloud-deploy workflows',
    context: 'The release pipeline\'s deploy step needed Azure credentials. Two patterns are conventional: (a) a service principal client secret stored as a GitHub secret, or (b) OIDC federated credentials where Actions exchanges a GitHub-issued token for a short-lived cloud token. (a) requires rotating a long-lived secret. (b) requires one-time AD app + federated-credential setup but no rotating secret in the repo.',
    decision: 'Cloud-deploy workflows use OIDC federated credentials. The repo stores only the identifying triple (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) — not a credential. Federated-credential subjects are scoped to `refs/heads/main` and `environment:azure-dev`.',
    consequences: 'No long-lived deployment secret in the repo. One-time AD app setup is documented in `docs/release-pipeline.md`. Local CLI deploys use `az login` rather than the federated path.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Deployment & Operations', 'Identity & Access Management'],
    applications: ['GitHub', 'GovEA Web Application'],
    initiatives: ['Traceable Release Pipeline (#504)'],
    objectives: ['Pay down foundation debt (v0.9)'],
  },
  {
    number: 'ADR-008',
    title: 'Pre-production schema uses db:push; switch to db:migrate when first real tenant exists',
    context: 'GovEA is pre-production. No persistent tenant data exists yet. Maintaining a migration sequence during fast schema iteration is overhead with no payoff — every migration is a throwaway. drizzle-kit\'s `push` syncs schema directly without generating files.',
    decision: 'Pre-production uses `pnpm --filter govea db:push` to sync schema changes. CI uses `db:push --force` on a fresh database. Migration files are not committed during pre-production. When the first real tenant lands, squash the current schema into `0000_initial_schema.sql`, fold in the trigger SQL, switch CI from `db:push` to `db:migrate`, and use `db:generate + db:migrate` from then on.',
    consequences: 'Schema iteration is fast; no throwaway migration files in git. The switch to migrations is a known one-time task and is documented in `CLAUDE.md`. Until the switch, accidental destructive schema changes are easier — review schema diffs in PRs the same way you would review migrations.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Content Management', 'Portfolio Management'],
    applications: ['PostgreSQL Database', 'Drizzle ORM + drizzle-kit', 'GovEA Web Application'],
    initiatives: [] as string[],
    objectives: ['Reach Practice-Ready (v1.0)'],
  },
]

// ─── Principles (GovEA Project) ───────────────────────────────────────────────
// The ten EasyEA principles that govern every EasyEA engagement.
// Source: https://github.com/roballred/EasyEA/blob/main/framework/principles.md

export const GOVEA_PROJECT_PRINCIPLES = [
  {
    name: 'Business First',
    description: 'All architecture work must begin with business goals, priorities, and desired outcomes. Technology serves the business — never the reverse.',
    title: 'Begin with business goals; technology serves the business',
    rationale: 'Architecture that starts with technology creates solutions in search of problems. Starting with business goals ensures every capability, application, and decision can be traced back to an outcome the organisation is trying to achieve.',
    implications: 'Every GovEA issue must reference a capability ID and a business goal before implementation begins. Features that cannot be traced to a business outcome are descoped. Architecture reviews start with objectives, not systems.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Portfolio Management'],
    adrs: [] as string[],
  },
  {
    name: 'Value at Every Step',
    description: 'Every artifact, decision, and recommendation must create meaningful business or customer value. If something does not deliver value, it does not belong.',
    title: 'Every artifact must deliver measurable value',
    rationale: 'EA practices fail when they produce documentation nobody reads or governance nobody follows. Requiring every artifact to deliver value forces the team to ask "who will use this and how?" before creating it.',
    implications: 'Capabilities, ADRs, and principles that are not actively referenced or maintained are flagged as stale. Repository completeness scoring surfaces low-value content for review. Debt items without a linked initiative are escalated in severity.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Portfolio Management'],
    adrs: [] as string[],
  },
  {
    name: 'People-Centered by Design',
    description: 'Architecture work begins with understanding people — their needs, pain points, tasks, and experiences. Every capability, process, and system decision must trace back to a real person\'s real problem.',
    title: 'Begin with personas; let systems follow',
    rationale: 'Government EA fails when it models technology in isolation from the people who use and are affected by it. Starting with personas forces architects to ground capability design in real human needs rather than system boundaries. It also produces outputs that elected officials and non-technical stakeholders can read without translation.',
    implications: 'Every capability record must be linked to at least one persona before it can be published. Value streams must name their stakeholder personas. Architecture reviews begin with a persona impact assessment, not a technology inventory.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Content Management', 'Frontend Display'],
    adrs: ['ADR-002', 'ADR-006'],
  },
  {
    name: 'AI-Enabled from the Beginning',
    description: 'AI is not an add-on. It is built into how EasyEA works. Use AI to accelerate insight, reduce manual effort, and strengthen decision-making across all steps.',
    title: 'Use AI throughout — not as a bolt-on at the end',
    rationale: 'EA practitioners face significant cognitive load — synthesising large bodies of documentation, identifying patterns, and maintaining consistent terminology across dozens of artefacts. AI assistance reduces that burden and allows practitioners to focus on judgment rather than drafting.',
    implications: 'GovEA features are designed to work with AI-assisted authoring tools. The data model produces clean, structured output that AI tools can read and augment. Where AI is used to draft content, the source is noted and human review is required before publication.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Content Management', 'Repository & Modelling'],
    adrs: [] as string[],
  },
  {
    name: 'Human in the Lead',
    description: 'AI may structure the work, draft artifacts, simulate review perspectives, and surface options. Humans make the decisions. No EasyEA engagement may move from discovery to recommendation, or from recommendation to implementation, without explicit human confirmation.',
    title: 'AI structures the work; humans make the decisions',
    rationale: 'AI can accelerate EA work dramatically but introduces risks if its outputs are accepted without review. AI-generated content can be plausible but wrong; AI-simulated stakeholder perspectives can miss political or contextual nuance; AI recommendations can optimise for the wrong objective. Human confirmation at each decision point is non-negotiable.',
    implications: 'GovEA does not automate architecture decisions. Auto-detected debt items surface recommendations but require human review before remediation is logged. All published content reflects a human authoring decision, not an automated one. Humans merge pull requests.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Content Management', 'Portfolio Management'],
    adrs: [] as string[],
  },
  {
    name: 'Solve Real Problems',
    description: 'Every method, artifact, and recommendation must address genuine organizational challenges — alignment gaps, delivery friction, legacy complexity, customer experience failures, siloed teams. No academic models, no theoretical constructs.',
    title: 'Address problems organisations actually have',
    rationale: 'EA frameworks have a tendency toward theoretical completeness over practical utility. TOGAF\'s ADM phases, Zachman\'s framework cells, and FEAF capability domains are intellectually coherent but often disconnected from the actual problems government teams face day-to-day. EasyEA starts with the problem, not the framework.',
    implications: 'GovEA features are prioritised by documented user problems, not framework completeness. Every capability in the repository must link to at least one real organisational problem or pain point. Architecture debt tracking starts with problems that affect delivery, not abstract technical quality metrics.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Portfolio Management'],
    adrs: ['ADR-002'],
  },
  {
    name: 'Simplicity Over Completeness',
    description: 'EasyEA prioritizes clarity, usability, and speed. If something cannot be explained quickly or used easily, simplify it or remove it. A clear, incomplete artifact is more useful than a comprehensive, unreadable one.',
    title: 'A clear, incomplete artifact beats a comprehensive, unreadable one',
    rationale: 'Comprehensive documentation that nobody reads has negative value — it consumes effort and creates a false sense of coverage. GovEA is designed for government staff who have a day job alongside their EA responsibilities. Every field, every screen, and every report must justify its complexity.',
    implications: 'GovEA modules are scoped to the minimum set of fields needed for informed decision-making. Optional fields are truly optional. Repository completeness scoring rewards completion of core fields, not exhaustive documentation. The data model does not add fields speculatively.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository & Modelling', 'Content Management'],
    adrs: [] as string[],
  },
  {
    name: 'Lightweight and Built for Everyday Work',
    description: 'The framework must fit naturally into business, product, and delivery workflows. Minimal artifacts. Lean governance. Just enough structure to support good decisions — nothing more.',
    title: 'Fit into existing workflows; do not create new ones',
    rationale: 'EA tools that require a dedicated EA team to operate are not sustainable in most government organisations. GovEA is designed to be used by department directors, programme managers, and analysts alongside their primary responsibilities — not only by dedicated architects.',
    implications: 'GovEA workflows are measured against time-to-first-value for non-specialist users. Features that require more effort to maintain than the value they produce are candidates for removal. The seed data and onboarding flow are designed to demonstrate value within the first ten minutes of use.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Content Management', 'Frontend Display'],
    adrs: [] as string[],
  },
  {
    name: 'Collaborative by Default',
    description: 'Architecture is created with business, product, and technology teams — not delivered to them. The framework supports shared understanding, joint decision-making, and co-creation.',
    title: 'Create architecture with teams, not for them',
    rationale: 'EA artefacts created in isolation and then distributed rarely influence decisions. Architecture that is built collaboratively is understood, trusted, and used. GovEA supports cross-team and cross-organisation collaboration as a first-class concern — shared visibility, federated content, and contributor roles are core to the model.',
    implications: 'GovEA supports multiple visibility levels (org, connections, instance) so content can be shared appropriately across teams and organisations. The contributor role allows non-admin staff to author EA content. Multi-org federation enables cross-agency architecture collaboration without requiring a single shared instance.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Multi-Organization Federation', 'Content Management'],
    adrs: [] as string[],
  },
  {
    name: 'Designed to Evolve',
    description: 'EasyEA is a continuous, learning-focused framework. It supports experimentation, feedback loops, and incremental improvement. When real work reveals gaps, log them. When the framework is wrong, change it.',
    title: 'Log gaps; change the framework when it is wrong',
    rationale: 'No framework survives first contact with a real organisation unchanged. EasyEA is explicitly designed to be modified based on real experience.',
    implications: 'Deprecated approaches are archived, not deleted. ADRs that are no longer current are marked superseded with a reference to the decision that replaced them. GovEA collects structured feedback through GitHub issues and the Phase 1 feedback log; that feedback evolves the platform.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Portfolio Management', 'Repository & Modelling'],
    adrs: [] as string[],
  },
]

// ─── Glossary (GovEA Project) ─────────────────────────────────────────────────
// Expanded for #518. Covers core EA terms + GovEA-specific operating
// vocabulary (validation status, ARB, capability ID, milestones, federation,
// break-glass, OIDC, etc.).

export const GOVEA_PROJECT_GLOSSARY = [
  {
    term: 'Enterprise Architecture',
    definition: 'A discipline for proactively and holistically leading enterprise responses to disruptive forces by identifying and analysing the execution of change toward desired business outcomes. In GovEA, EA is treated as a practical, people-centred discipline rather than a compliance framework.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Capability',
    definition: 'Something an organisation must be able to do to deliver its mission — independent of the systems, processes, or people used to deliver it. Capabilities describe what is needed, not how it is done.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Sub-capability',
    definition: 'A specific capability within a capability group. One file per sub-capability under `business-architecture/capabilities/<module>/<group>/<prefix>-<sub-capability>.md`. The file stem is the capability ID used in commits and PRs.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Capability ID',
    definition: 'The stable identifier for a sub-capability, defined as the file stem of the relevant capability doc (e.g. `iam-user-management`). Used in commit messages, PR descriptions, and issue bodies for traceability.',
    domain: 'Enterprise Architecture',
    notes: 'Capability IDs are stable as long as the file is not renamed. Renaming is rare; if needed, both the file and every referencing issue/commit are updated.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Persona',
    definition: 'A named, representative user or stakeholder type that interacts with GovEA or its outputs. Personas capture goals, pain points, system role, and a critical insight that shapes feature design.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Validation Status',
    definition: 'A required field on every persona file. `Assumed` — drafted from research and context but not confirmed by a real practitioner. `Validated` — confirmed via at least one structured interview or direct observation in a real state or local government context.',
    domain: 'Enterprise Architecture',
    notes: 'Persona validation gate per Standards.md: implementation work that depends solely on Assumed personas carries elevated risk and is flagged in the relevant issues.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Architecture Decision Record',
    definition: 'A document that captures a significant architectural decision: its context, the decision itself, and its consequences. ADRs are immutable by convention — superseded decisions are marked as such rather than deleted.',
    definitionSource: 'Nygard, M. (2011). Documenting Architecture Decisions.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Value Stream',
    definition: 'The sequence of activities an organisation performs to deliver a specific outcome of value to a stakeholder. Value streams cross organisational boundaries and capability domains.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Repository Completeness',
    definition: 'A measure of how thoroughly the EA repository reflects current state. Assessed per capability domain; considers presence of descriptions, persona links, application links, and content freshness.',
    domain: 'Enterprise Architecture',
    notes: 'GovEA calculates completeness scores automatically and surfaces ranked cleanup actions in the dashboard.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Architecture Debt',
    definition: 'A logged, categorised item representing a known shortfall in the architecture — a lifecycle risk, capability gap, decision drift, or known shortcut. Tracked with severity (low / medium / high / critical) and a workflow status from draft through resolved or accepted.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Federation',
    definition: 'The ability for two or more GovEA organisations to establish a trusted connection and share EA content across organisational boundaries. Federated content retains its source organisation\'s visibility rules.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    term: 'Visibility Scope',
    definition: 'A field on most EA entities controlling who can see published content: `org` — only members of the owning organisation; `connections` — members of organisations with an approved connection; `instance` — visible across every organisation on the GovEA instance.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Module',
    definition: 'A toggleable product surface within GovEA (e.g. Capabilities, Applications, Data Architecture, Initiatives). Modules can be enabled or disabled per organisation; disabling redirects requests to the dashboard. "Module" is the canonical user-facing term — not "Tool".',
    domain: 'Platform',
    notes: 'Decision recorded 2026-05-22 in #512: "Tools" is rejected for the product-area concept.',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Break-glass Session',
    definition: 'A time-limited elevation of an Instance Administrator\'s privileges to perform cross-tenant operations (impersonation, cross-org PII read). Sessions are audited end-to-end and automatically expire.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Act-as Session',
    definition: 'An auditable, scoped impersonation flow where an Instance Administrator operates as another user (typically for support). Distinct from break-glass: act-as is for user-shaped support actions; break-glass is for direct cross-tenant data access.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'OIDC (OpenID Connect)',
    definition: 'The single-sign-on standard GovEA supports for authenticating users via an external identity provider (Microsoft Entra ID, Okta, Auth0, etc.). SSO users default to Viewer until promoted by an Admin.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Federated Credential',
    definition: 'A trust relationship between GitHub Actions and a cloud identity provider that lets a workflow exchange its GitHub-issued OIDC token for a short-lived cloud access token — avoiding any long-lived secret in the repository.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'ARB',
    definition: 'Architecture Review Board. Reviewers surface gaps, risks, and blind spots across the capability set before implementation begins. In GovEA, ARB findings are captured as GitHub issues with the `arb-finding` label and a severity (severity:high / severity:medium).',
    definitionSource: 'Standards.md §"ARB Finding Issue Format"',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'ARB Finding',
    definition: 'A logged item from an ARB review identifying a specific gap, risk, or blind spot. Carries severity and recommended action. High-severity findings must be resolved before implementation begins on the affected capabilities per Standards.md.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Milestone',
    definition: 'A scoped release goal in the GovEA backlog. Current milestones: v0.9 (Foundation Cleanup), v1.0 (Practice-Ready), v1.5 (Adoption-Validated), v2.0 (Platform & Integration). Every open issue is assigned to exactly one milestone.',
    domain: 'Process',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Track Label',
    definition: 'A required label on every open issue grouping work by intent: `track:core` (capability or feature for v1), `track:differentiator` (GovEA-specific capability that sets it apart), `track:foundation` (infra/governance/process work).',
    definitionSource: 'Standards.md §Backlog Tracks',
    domain: 'Process',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Persona Journey',
    definition: 'An end-to-end walk-through of GovEA from one persona\'s point of view, used to surface friction and gaps. Issues filed during a persona journey carry the `journey:<persona-id>` label and link back to the audit doc under `docs/persona-journeys/`.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Feedback Log (Phase 1)',
    definition: 'A manually-maintained markdown table under `business-architecture/feedback-log.md` capturing practice-fit issues heard from real users. Phase 1 of #103; superseded by the in-app feedback widget (Phase 2) once that ships.',
    domain: 'Process',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Confidence Summary',
    definition: 'A stakeholder-facing label and percentage indicating how trustworthy the repository content is at a glance. Drives the "actively maintained / under development / getting started" cues on the dashboard. Assumptions about how stakeholders interpret these labels are tracked in `stakeholder-assumption-register.md` rows RC-1..RC-5.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Impact Analysis',
    definition: 'A read-only view on Application and Capability detail pages that surfaces the consequences of changing or retiring an entity, computed from existing relationships. Designed to make decommission consequences visible without manual cross-referencing.',
    domain: 'Enterprise Architecture',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Recipe',
    definition: 'A reproducible bundle of GovEA content — capabilities, personas, taxonomy, applications — that can be installed to seed an organisation with a starting baseline. Recipe-based seeding is one of the primitives in `@govea/core`.',
    domain: 'Platform',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
]

// ─── Services (GovEA Project) ─────────────────────────────────────────────────

export const GOVEA_PROJECT_SERVICES = [
  {
    name: 'Open Source Distribution',
    description: 'The GovEA codebase published on GitHub under the MIT licence. Government organisations clone, fork, and self-host the application on their own container platform. The canonical entry point for the project.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Deployment & Operations', 'Content Management', 'Identity & Access Management'],
    personas: ['CMS Administrator', 'Enterprise Architect', 'Consultant / Systems Integrator'],
    valueStreams: ['Open Source Adoption', 'Feature Idea to Production'],
  },
  {
    name: 'EA Repository Authoring',
    description: 'The core authoring workspace — capabilities, applications, personas, value streams, principles, decisions, goals, objectives, initiatives, data architecture — used by EA practitioners to build and maintain their architecture repository.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Content Management', 'Portfolio Management', 'Planning & Roadmap', 'Repository & Modelling', 'Data Architecture'],
    personas: ['Enterprise Architect', 'Junior EA Analyst', 'Domain Architect', 'Data Modeler'],
    valueStreams: ['EA Gap to Published Architecture'],
  },
  {
    name: 'Stakeholder Reporting',
    description: 'Plain-language outputs for non-EA audiences: Executive Summary, Heatmap Analysis, Application Landscape, Roadmap Timeline, Impact Analysis, Guided Answers, the in-product Overview page, and read-only Traceability hubs.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Frontend Display', 'Planning & Roadmap', 'Portfolio Management'],
    personas: ['Department Director', 'Elected Official', 'Budget & Performance Analyst', 'Programme Director', 'Content Viewer'],
    valueStreams: ['EA Gap to Published Architecture'],
  },
  {
    name: 'Multi-Organisation Federation',
    description: 'Federated EA sharing that allows connected government organisations to publish capabilities and cross-link their architecture at agreed visibility levels. Prototype quality; named conversations and #547 public-read are next.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Multi-Organization Federation', 'Identity & Access Management'],
    personas: ['Agency EA Coordinator', 'Enterprise Architect', 'CMS Administrator'],
    valueStreams: [] as string[],
  },
  {
    name: 'Demo Environment as Documentation',
    description: 'The publicly-reachable GovEA demo populated with the GovEA Project organisation as a worked example. First-time reviewers see how the product would model itself; the same data structures back the in-product Overview page.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Frontend Display', 'Deployment & Operations'],
    personas: ['Enterprise Architect', 'Consultant / Systems Integrator', 'Department Director', 'Content Viewer'],
    valueStreams: ['Open Source Adoption'],
  },
]

// ─── Architecture Debt (GovEA Project) ────────────────────────────────────────
// New for #518. Mirrors open ARB findings and active risk-register items.
// Severity follows debtSeverityEnum; type follows debtTypeEnum.

export const GOVEA_PROJECT_DEBT = [
  {
    title: 'High-severity ARB v1/v2 scope-signals work residual (#10)',
    summary: 'Director-persona reading of "what do I get day one vs later" is opaque without v1/v2 scope signals on capability files. The deployment-operations group ship closed half of #10; the residual capability scope-signal work remains. High-severity ARB findings should not age past two grooming cycles.',
    debtType: 'capability-gap' as const,
    severity: 'high' as const,
    status: 'published' as const,
    capabilities: ['Repository & Modelling', 'Content Management'],
    applications: [] as string[],
    initiatives: ['Close Only Open High-Severity ARB Finding (#10)'],
    securitySensitive: false,
  },
  {
    title: 'RBAC duplicated between app and @govea/core (#34)',
    summary: 'Role/permission definitions exist in both `apps/govea/src/lib/rbac.ts` and `packages/core/src/rbac/index.ts`. Behaviour-drift risk is silent and security-adjacent; grows monotonically with every new route. Medium severity per the ARB finding.',
    debtType: 'decision-drift' as const,
    severity: 'medium' as const,
    status: 'published' as const,
    capabilities: ['Identity & Access Management'],
    applications: ['GovEA Web Application', '@govea/core package'],
    initiatives: ['Consolidate RBAC into a Single Source of Truth (#34)'],
    securitySensitive: true,
  },
  {
    title: 'Local bootstrap and verification not reproducible (#35)',
    summary: 'A new developer setting up GovEA locally hits undocumented steps and environment assumptions. Medium-severity ARB finding. Closing this is part of v0.9 Foundation Cleanup.',
    debtType: 'known-shortcut' as const,
    severity: 'medium' as const,
    status: 'published' as const,
    capabilities: ['Deployment & Operations'],
    applications: ['GovEA Web Application', 'Container Runtime'],
    initiatives: [] as string[],
    securitySensitive: false,
  },
  {
    title: 'SMTP transport stubbed; downstream notifications inert (R-001, #528)',
    summary: 'Email Configuration UI shipped and the notification substrate is wired up, but the actual SMTP send returns the stub failure. Change-notification email delivery (#581, #87) is gated on this. Held until an outbound mail account is available.',
    debtType: 'known-shortcut' as const,
    severity: 'medium' as const,
    status: 'in-progress' as const,
    capabilities: ['Admin Configuration'],
    applications: ['GovEA Web Application'],
    initiatives: ['SMTP Transport (#528 follow-up)'],
    securitySensitive: false,
  },
  {
    title: 'Stakeholder-facing analytics still rest on assumed personas (R-004, #384)',
    summary: 'Repository confidence, roadmap, guided answers, debt, and the new Overview page all assume specific stakeholder behaviour that has not been validated through interviews. Risk register R-004 (Impact High, Likelihood High). Phase 1 feedback log activated as Plan-Tier-1-interview mitigation.',
    debtType: 'unreviewed' as const,
    severity: 'high' as const,
    status: 'in-progress' as const,
    capabilities: ['Frontend Display', 'Repository & Modelling'],
    applications: ['GovEA Web Application'],
    initiatives: ['Persona Validation — Tier-1 Interviews (#384 follow-through)', 'Persona Validation — Documentation Infrastructure (#384 prep)'],
    securitySensitive: false,
  },
  {
    title: 'Public-repo release pipeline exposed operator topology (R-002, #504)',
    summary: 'PR #504 demonstrated the desired release-pipeline shape but committed operator-specific Azure resource topology into a public GitHub Actions workflow. Mitigation: scripts/azure-dev.sh parameterised via GOVEA_AZURE_* env vars; deploy automation moves to a private operator-owned repository. R-002 remains Open until the private-repo migration is complete.',
    debtType: 'known-shortcut' as const,
    severity: 'medium' as const,
    status: 'in-progress' as const,
    capabilities: ['Deployment & Operations'],
    applications: ['GovEA Web Application', 'GitHub'],
    initiatives: ['Traceable Release Pipeline (#504)'],
    securitySensitive: true,
  },
]

