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

// ─── Personas (GovEA Project) ─────────────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const GOVEA_PROJECT_PERSONAS = [
  {
    name: 'Enterprise Architect',
    description: 'The lead EA practitioner responsible for modelling the organisation\'s capabilities, applications, and strategic architecture. Primary author of EA content and the main GovEA user.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Agency EA Coordinator',
    description: 'A coordinator within a participating agency who maintains that agency\'s portion of the shared architecture repository and liaises with the lead EA team.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'Department Director',
    description: 'A senior leader who consumes EA outputs — roadmaps, capability assessments, and executive summaries — to inform budget and investment decisions.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Junior EA Analyst',
    description: 'An early-career analyst who contributes EA content under the guidance of the Enterprise Architect. Creates and updates capability, application, and principle records.',
    type: 'Staff',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Elected Official',
    description: 'An elected representative who reviews published executive summaries and strategic roadmaps. Read-only access to high-level architecture outputs.',
    type: 'Elected Official',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'CMS Administrator',
    description: 'A platform administrator who manages GovEA instance settings, module availability, user roles, and taxonomy configuration.',
    type: 'Staff',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Programme Director',
    description: 'Accountable for one or more strategic initiatives. Uses GovEA to track initiative progress, capability impacts, and linkage to strategic objectives.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'TOGAF Practitioner',
    description: 'A former persona representing users who preferred TOGAF-aligned taxonomy. Retired when GovEA adopted EasyEA methodology as its canonical framework and the TOGAF overlay was made optional.',
    type: 'Staff',
    status: 'archived' as const,
    visibility: 'instance' as const,
  },
]

// ─── Capabilities (GovEA Project) ─────────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const GOVEA_PROJECT_CAPABILITIES = [
  {
    name: 'Capability Mapping',
    description: 'Define, structure, and maintain the organisation\'s capability map — the hierarchy of things the organisation must be able to do to deliver its mission.',
    domain: 'Enterprise Architecture',
    behaviors: 'Create and edit capability records with name, description, domain, behaviors, and rules\nLink capabilities to personas, applications, principles, and objectives\nOrganise capabilities into a domain hierarchy\nPublish capabilities with org, connections, or instance visibility\nArchive retired capabilities without deleting their historical links',
    rules: 'A capability must have a domain before it can be published\nCapability names must be unique within an organisation\nArchived capabilities remain visible in historical linkage reports',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Junior EA Analyst'],
  },
  {
    name: 'Application Portfolio',
    description: 'Catalogue and manage the organisation\'s application portfolio — the systems that enable capabilities — including lifecycle status, hosting model, and vendor details.',
    domain: 'Enterprise Architecture',
    behaviors: 'Create and edit application records with vendor, hosting model, and lifecycle status\nLink applications to the capabilities they support\nTrack lifecycle status from planned through to decommissioned\nGenerate portfolio views filtered by status, domain, or capability\nAutomatic debt flagging when an application moves to sunset or decommissioned lifecycle status',
    rules: 'Applications must be linked to at least one capability to appear in capability portfolio views\nDecommissioned applications are read-only except by admins',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Department Director'],
  },
  {
    name: 'Architecture Decision Records',
    description: 'Capture, link, and publish Architecture Decision Records (ADRs) that document significant technical and architectural decisions, their context, and their consequences.',
    domain: 'Enterprise Architecture',
    behaviors: 'Create ADRs with context, decision, and consequences fields\nAssign status: proposed, accepted, deprecated, superseded\nLink ADRs to capabilities, applications, initiatives, and objectives\nRecord supersession chains between related ADRs\nPublish ADRs with appropriate visibility',
    rules: 'A superseded ADR must reference the ADR that superseded it\nADR numbers must be unique within an organisation',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Programme Director'],
  },
  {
    name: 'Content Authoring & Workflow',
    description: 'Manage the authoring lifecycle for all EA content — draft, publish, and archive records across capabilities, personas, principles, and value streams.',
    domain: 'Platform',
    behaviors: 'Set and transition content status between draft, published, and archived\nControl visibility at org, connections, or instance scope\nFilter repository views by status and visibility\nPrevent accidental publication of incomplete or unapproved content',
    rules: 'Content in draft status is visible only to authenticated users within the organisation\nArchived content is read-only\nVisibility cannot be set to connections or instance without admin approval',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Junior EA Analyst', 'CMS Administrator'],
  },
  {
    name: 'User & Role Management',
    description: 'Manage users within an organisation, assign roles (admin, contributor, viewer), and control access to EA content.',
    domain: 'Platform',
    behaviors: 'Invite and onboard users via email\nAssign and change user roles\nSuspend and reactivate user accounts\nView user activity and last login\nSSO users default to viewer until promoted by an admin',
    rules: 'Only admins can change user roles\nAn organisation must retain at least one active admin at all times\nSuspended users cannot log in but their authored content is retained',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator', 'Enterprise Architect'],
  },
  {
    name: 'Repository Completeness',
    description: 'Measure and surface the completeness of the EA repository — identifying gaps in capability coverage, stale content, and missing linkages.',
    domain: 'Enterprise Architecture',
    behaviors: 'Calculate completeness scores per capability domain\nFlag stale content based on configurable staleness thresholds\nHighlight capabilities with no linked applications or personas\nRank capabilities by completeness for prioritised remediation\nDisplay a dashboard summary of repository health',
    rules: 'Staleness thresholds are configurable per organisation\nCompleteness scores are recalculated on each repository save',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Department Director'],
  },
  {
    name: 'Architecture Debt Tracking',
    description: 'Log, categorise, and track architecture debt items — including lifecycle risks, capability gaps, and principle violations — to drive remediation planning.',
    domain: 'Enterprise Architecture',
    behaviors: 'Create debt items with type, severity, description, and linked capabilities or applications\nAuto-flag lifecycle risk debt when an application reaches sunset or decommissioned status\nLink debt items to initiatives for remediation tracking\nFilter and sort debt by severity, type, and status\nClose debt items with a resolution note',
    rules: 'System-detected debt items cannot be manually deleted — they are resolved when the underlying condition changes\nDebt severity follows: low → medium → high → critical',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Programme Director'],
  },
  {
    name: 'Feature Management',
    description: 'Enable or disable GovEA modules at the organisation level and control which modules are available across the instance.',
    domain: 'Platform',
    status: 'draft' as const,
    visibility: 'org' as const,
    personas: ['CMS Administrator'],
  },
  {
    name: 'Multi-Org Federation',
    description: 'Establish connections between organisations to share and link EA content across organisational boundaries with configurable visibility.',
    domain: 'Platform',
    behaviors: 'Request and accept org-to-org connections\nShare capabilities, personas, and value streams at connections visibility\nCreate cross-org capability links with typed relationships\nView federated content from connected organisations',
    rules: 'Both organisations must accept a connection before content can be shared\nCross-org links require approval from the target organisation\'s admin',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['CMS Administrator', 'Agency EA Coordinator'],
  },
  {
    name: 'Data Architecture',
    description: 'Model and document the organisation\'s data architecture — entities, attributes, links, business keys, and their semantic relationships — in a structured metamodel.',
    domain: 'Enterprise Architecture',
    status: 'draft' as const,
    visibility: 'org' as const,
    personas: ['Enterprise Architect', 'Junior EA Analyst'],
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'End-to-End Traceability',
    description: 'Trace architecture decisions through capabilities, applications, principles, value streams, and strategic objectives to demonstrate coherent alignment. Superseded by the cross-entity linking model shipped in v2.',
    domain: 'Enterprise Architecture',
    status: 'archived' as const,
    visibility: 'instance' as const,
    personas: [] as string[],
  },
]

// ─── Applications (GovEA Project) ─────────────────────────────────────────────

export const GOVEA_PROJECT_APPLICATIONS = [
  {
    name: 'GovEA Web App',
    description: 'The GovEA Next.js application — the primary interface for EA authoring, repository browsing, and administration. Deployed on Vercel.',
    vendor: 'GovEA Project (open source)',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records', 'Content Authoring & Workflow', 'User & Role Management', 'Repository Completeness', 'Architecture Debt Tracking', 'Feature Management', 'Multi-Org Federation', 'Data Architecture'],
  },
  {
    name: 'PostgreSQL (Neon)',
    description: 'Serverless PostgreSQL database hosted on Neon. Stores all EA content, user data, audit logs, and configuration.',
    vendor: 'Neon',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records', 'Repository Completeness', 'Architecture Debt Tracking'],
  },
  {
    name: 'GitHub',
    description: 'Source control, issue tracking, and CI/CD orchestration for the GovEA codebase. Also used to publish the open source distribution.',
    vendor: 'GitHub (Microsoft)',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Feature Management', 'Architecture Decision Records'],
  },
  {
    name: 'Vercel',
    description: 'Cloud deployment platform for the GovEA Next.js application. Handles builds, preview deployments, and production hosting.',
    vendor: 'Vercel',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Feature Management'],
  },
]

// ─── Value Streams (GovEA Project) ────────────────────────────────────────────

export const GOVEA_PROJECT_VALUE_STREAMS = [
  {
    name: 'Feature Idea to Production',
    description: 'End-to-end flow from a user need or contributor idea through design, development, review, and deployment to production.',
    valueItem: 'Deployed feature available to all GovEA users',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Programme Director', 'Enterprise Architect'],
    stages: [
      {
        name: 'Idea & Issue',
        description: 'A feature idea is raised as a GitHub issue, linked to a capability and persona, and acceptance criteria are agreed. Capability traceability is established before any code is written.',
        order: 1,
        capabilities: ['Feature Management', 'Capability Mapping'],
      },
      {
        name: 'Design & Build',
        description: 'The feature is designed, implemented in a git worktree branch, and tested against acceptance criteria. Architectural decisions are recorded as ADRs where appropriate.',
        order: 2,
        capabilities: ['Content Authoring & Workflow', 'Feature Management', 'Architecture Decision Records'],
      },
      {
        name: 'Review & Merge',
        description: 'A pull request is reviewed against acceptance criteria, CI checks pass (lint, type check, integration tests), and the branch is merged to main.',
        order: 3,
        capabilities: ['Feature Management', 'Architecture Decision Records'],
      },
      {
        name: 'Deploy',
        description: 'Vercel builds and deploys the merged change to production. Repository completeness scores update to reflect any new capabilities or applications added.',
        order: 4,
        capabilities: ['Feature Management', 'Repository Completeness'],
      },
    ],
  },
  {
    name: 'EA Gap to Published Architecture',
    description: 'Journey from identifying a gap in the EA repository — a missing capability, stale application record, or undocumented decision — through to a reviewed, published architecture record.',
    valueItem: 'Published, linked EA content that accurately reflects the current state of the organisation\'s architecture',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Junior EA Analyst'],
    stages: [
      {
        name: 'Gap Identification',
        description: 'Repository completeness dashboard or a peer review surfaces a gap, stale record, or missing linkage. The gap is categorised as a capability, application, decision, or principle gap.',
        order: 1,
        capabilities: ['Repository Completeness', 'Architecture Debt Tracking'],
      },
      {
        name: 'Content Authoring',
        description: 'The architect or analyst creates or updates the relevant record in draft status, filling all required fields and adding initial cross-links.',
        order: 2,
        capabilities: ['Capability Mapping', 'Application Portfolio', 'Content Authoring & Workflow', 'Data Architecture'],
      },
      {
        name: 'Cross-Link & Enrich',
        description: 'The draft record is linked to related capabilities, personas, applications, initiatives, and value streams. Traceability from strategic objective to data entity is verified.',
        order: 3,
        capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records'],
      },
      {
        name: 'Review & Publish',
        description: 'The enriched draft is reviewed for accuracy and completeness, debt items linked to the gap are resolved, and the record is published at the appropriate visibility scope.',
        order: 4,
        capabilities: ['Content Authoring & Workflow', 'Architecture Debt Tracking', 'Repository Completeness'],
      },
    ],
  },
  {
    name: 'Open Source Adoption',
    description: 'Journey a government organisation takes from first discovering GovEA through evaluation, self-hosted or SaaS deployment, initial seeding, and an active, maintained EA practice.',
    valueItem: 'A government organisation running an active EA practice in GovEA with a populated, linked repository',
    status: 'published' as const,
    visibility: 'connections' as const,
    stakeholderPersonas: ['Enterprise Architect', 'CMS Administrator'],
    stages: [
      {
        name: 'Discovery',
        description: 'The organisation becomes aware of GovEA — through a peer referral, conference, or GitHub — and reviews the project documentation and live demo environment.',
        order: 1,
        capabilities: ['Capability Mapping', 'Application Portfolio'],
      },
      {
        name: 'Evaluation',
        description: 'The EA team evaluates GovEA against their capability and persona requirements, reviewing the EasyEA methodology alignment and comparing to incumbent tools.',
        order: 2,
        capabilities: ['Capability Mapping', 'Content Authoring & Workflow', 'Feature Management'],
      },
      {
        name: 'Deployment & Seeding',
        description: 'GovEA is deployed (Vercel + Neon or self-hosted). Admin and contributor accounts are created, modules are enabled, and initial taxonomy, personas, and capabilities are seeded.',
        order: 3,
        capabilities: ['User & Role Management', 'Feature Management', 'Content Authoring & Workflow'],
      },
      {
        name: 'Active EA Practice',
        description: 'The organisation maintains a live repository: capabilities, applications, ADRs, and value streams are regularly updated; completeness scores are monitored; debt items are actioned.',
        order: 4,
        capabilities: ['Repository Completeness', 'Architecture Debt Tracking', 'Capability Mapping', 'Application Portfolio'],
      },
    ],
  },
  {
    name: 'Architecture Decision Governance',
    description: 'The path from an identified architectural issue or choice — a technology selection, pattern adoption, or constraint — through structured deliberation to a published, linked ADR.',
    valueItem: 'A published ADR that documents the decision context, rationale, and consequences — linked to the capabilities and initiatives it affects',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Enterprise Architect', 'Programme Director'],
    stages: [
      {
        name: 'Issue Surfaced',
        description: 'An architectural issue or pending decision is identified — from a debt item, initiative design session, or capability gap — and logged with initial context.',
        order: 1,
        capabilities: ['Architecture Debt Tracking', 'Capability Mapping'],
      },
      {
        name: 'Context Captured',
        description: 'The decision context is documented: the problem statement, constraints, and options considered. Relevant capabilities and initiatives are linked.',
        order: 2,
        capabilities: ['Architecture Decision Records', 'Capability Mapping', 'Application Portfolio'],
      },
      {
        name: 'Decision Drafted',
        description: 'The preferred option is recorded in a draft ADR with full rationale and consequences. Where the decision supersedes a prior ADR, the supersession chain is linked.',
        order: 3,
        capabilities: ['Architecture Decision Records', 'Content Authoring & Workflow'],
      },
      {
        name: 'Stakeholder Review',
        description: 'The draft ADR is circulated to affected teams and initiative owners. Feedback is incorporated and the decision is confirmed or revised.',
        order: 4,
        capabilities: ['Architecture Decision Records', 'Content Authoring & Workflow'],
      },
      {
        name: 'Published & Linked',
        description: 'The ADR is published, linked to all affected capabilities, initiatives, and objectives, and any resolved debt items are closed.',
        order: 5,
        capabilities: ['Architecture Decision Records', 'Architecture Debt Tracking', 'Repository Completeness'],
      },
    ],
  },
  {
    name: 'Community Contribution',
    description: 'The path an external contributor takes from identifying an improvement opportunity — a bug, a missing capability, or a methodology enhancement — through to a merged and released change.',
    valueItem: 'A merged, released improvement to GovEA that is available to all users',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Junior EA Analyst', 'Enterprise Architect'],
    stages: [
      {
        name: 'Issue & Discussion',
        description: 'The contributor opens a GitHub issue describing the problem or improvement. The maintainer team links the issue to the relevant capability and confirms scope.',
        order: 1,
        capabilities: ['Feature Management', 'Capability Mapping'],
      },
      {
        name: 'Implementation',
        description: 'The contributor forks the repository, implements the change in a branch, and submits a pull request with a description referencing the issue and capability traceability.',
        order: 2,
        capabilities: ['Content Authoring & Workflow', 'Feature Management'],
      },
      {
        name: 'Code Review',
        description: 'Maintainers review the pull request for correctness, test coverage, and adherence to project standards. CI must pass.',
        order: 3,
        capabilities: ['Feature Management', 'Architecture Decision Records'],
      },
      {
        name: 'Methodology Alignment',
        description: 'For contributions that add or change EA concepts, alignment with the EasyEA methodology is verified. If needed, a supporting ADR is drafted.',
        order: 4,
        capabilities: ['Architecture Decision Records', 'Capability Mapping'],
      },
      {
        name: 'Merged & Released',
        description: 'The pull request is merged to main, the release is tagged, and the contributor is credited. Repository completeness scores reflect any new capabilities shipped.',
        order: 5,
        capabilities: ['Feature Management', 'Repository Completeness'],
      },
    ],
  },
]

// ─── Strategic Objectives (GovEA Project) ─────────────────────────────────────

export const GOVEA_PROJECT_OBJECTIVES = [
  {
    name: 'Deliver a complete EA repository for state and local government',
    description: 'Build and maintain a comprehensive, people-centred EA repository that covers all core architecture domains and is usable by non-specialist government staff without formal EA training.',
    successMetric: 'All core modules (capabilities, applications, decisions, strategy, data architecture) at production quality with 95%+ test coverage by end of CY2026',
    timeHorizon: 'CY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records', 'Content Authoring & Workflow', 'Data Architecture'],
    valueStreams: ['Feature Idea to Production'],
  },
  {
    name: 'Enable multi-organisation architecture sharing',
    description: 'Allow state and local government organisations to establish trusted connections and share EA content across boundaries, supporting regional and whole-of-government architecture collaboration.',
    successMetric: 'At least three active inter-org connections in production use by Q2 CY2026',
    timeHorizon: 'CY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Multi-Org Federation', 'User & Role Management'],
    valueStreams: [] as string[],
  },
  {
    name: 'Make architecture debt visible and actionable',
    description: 'Surface architecture debt — lifecycle risks, capability gaps, and principle violations — automatically and link it to the initiatives and decisions that will resolve it.',
    successMetric: 'Auto-detected debt covers 100% of lifecycle risk scenarios with no manual triage required',
    timeHorizon: 'CY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Architecture Debt Tracking', 'Repository Completeness'],
    valueStreams: ['EA Gap to Published Architecture'],
  },
]

// ─── Initiatives (GovEA Project) ──────────────────────────────────────────────
// Coverage: status = active ✓, proposed ✓, on-hold ✓, complete ✓

export const GOVEA_PROJECT_INITIATIVES = [
  {
    name: 'Data Architecture Metamodel',
    description: 'Build the data architecture module — entities, attributes, links, business keys, semantic relationships, and the Chen Notation diagram — to extend GovEA into the data domain.',
    status: 'active' as const,
    startDate: 'Q1 CY2026',
    endDate: 'Q2 CY2026',
    capabilities: [
      { name: 'Data Architecture', impact: 'build' },
      { name: 'Capability Mapping', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web App', impact: 'improve' },
      { name: 'PostgreSQL (Neon)', impact: 'improve' },
    ],
    objectives: ['Deliver a complete EA repository for state and local government'],
  },
  {
    name: 'Architecture Debt Tracking',
    description: 'Implement the architecture debt module including manual debt logging, auto-detection of lifecycle risks, severity classification, and initiative-linked remediation tracking.',
    status: 'complete' as const,
    startDate: 'Q1 CY2026',
    endDate: 'Q2 CY2026',
    capabilities: [
      { name: 'Architecture Debt Tracking', impact: 'build' },
    ],
    applications: [
      { name: 'GovEA Web App', impact: 'improve' },
    ],
    objectives: ['Make architecture debt visible and actionable'],
  },
  {
    name: 'Repository Completeness Dashboard',
    description: 'Build the completeness scoring engine, staleness detection, domain-level targets, and the dashboard view that surfaces repository health to the EA team.',
    status: 'complete' as const,
    startDate: 'Q3 CY2025',
    endDate: 'Q4 CY2025',
    capabilities: [
      { name: 'Repository Completeness', impact: 'build' },
    ],
    applications: [
      { name: 'GovEA Web App', impact: 'improve' },
    ],
    objectives: ['Deliver a complete EA repository for state and local government', 'Make architecture debt visible and actionable'],
  },
  {
    name: 'Multi-Org Federation',
    description: 'Implement org-to-org connections, cross-org capability links, and federated content visibility to support multi-organisation EA collaboration.',
    status: 'complete' as const,
    startDate: 'Q4 CY2025',
    endDate: 'Q1 CY2026',
    capabilities: [
      { name: 'Multi-Org Federation', impact: 'build' },
      { name: 'User & Role Management', impact: 'improve' },
    ],
    applications: [
      { name: 'GovEA Web App', impact: 'improve' },
    ],
    objectives: ['Enable multi-organisation architecture sharing'],
  },
]

// ─── ADRs (GovEA Project) ─────────────────────────────────────────────────────
// Coverage: status = accepted ✓, superseded ✓ (ADR-001 → ADR-002)
//           supersededByNumber — self-reference chain resolved in run.ts
// ADR-003 is based on the real GovEA query performance decision.

export const GOVEA_PROJECT_ADRS = [
  {
    number: 'ADR-001',
    title: 'Adopt TOGAF as the canonical EA framework',
    context: 'At project inception GovEA needed a recognised EA framework to structure its metamodel and terminology. TOGAF is the most widely adopted framework in government EA contexts and offered a well-documented content metamodel.',
    decision: 'GovEA will adopt TOGAF as its canonical framework. The content metamodel, terminology, and capability groupings will align with TOGAF ADM phases and the TOGAF Content Framework.',
    consequences: 'Provided an established vocabulary and reduced time-to-first-model. Created significant friction for non-specialist government staff unfamiliar with TOGAF jargon. Later superseded when user research consistently showed that TOGAF terminology was a barrier to adoption.',
    status: 'superseded' as const,
    supersededByNumber: 'ADR-002',
    capabilities: ['Capability Mapping', 'Content Authoring & Workflow'],
    applications: [] as string[],
    initiatives: [] as string[],
    objectives: [] as string[],
  },
  {
    number: 'ADR-002',
    title: 'Adopt EasyEA as the canonical framework with optional TOGAF overlay',
    context: 'User research across five state and local government teams found that TOGAF terminology (ADM phases, architecture building blocks, BDAT layers) was consistently cited as a barrier to adoption. Non-specialist staff could not map their day-to-day work onto the TOGAF vocabulary without expert facilitation. EasyEA is a lightweight, people-centred methodology designed specifically for government teams without dedicated EA staff.',
    decision: 'GovEA will adopt EasyEA as its canonical framework. The core metamodel uses plain-language terms (capabilities, personas, value streams, principles). TOGAF-aligned terminology is available as an optional overlay for organisations that require it, but is not the default.',
    consequences: 'Significantly improved adoption rates in pilot organisations. Reduced the learning curve for non-specialist contributors. The TOGAF overlay is maintained but not actively developed. Supersedes ADR-001.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Capability Mapping', 'Content Authoring & Workflow', 'Feature Management'],
    applications: ['GovEA Web App'],
    initiatives: [] as string[],
    objectives: ['Deliver a complete EA repository for state and local government'],
  },
  {
    number: 'ADR-003',
    title: 'Use raw SQL with indexed CTEs for traversal and completeness queries',
    context: 'GovEA\'s completeness scoring and cross-entity traversal queries must traverse capability → application → personas → value streams → objectives in a single request. Drizzle ORM query builder generates N+1 patterns for these traversals, and the completeness score requires aggregating counts across five entity types per capability domain. In load testing with 500 capabilities, ORM-generated queries took 2.3 seconds on average.',
    decision: 'Completeness and traversal queries will be implemented as raw SQL using indexed CTEs rather than the Drizzle ORM query builder. Drizzle is retained for all CRUD operations. A query performance budget of 200ms is enforced for all dashboard queries.',
    consequences: 'Dashboard load time reduced to under 80ms in load testing. Raw SQL queries require explicit review in code review to guard against injection. Query complexity is centralised in a small number of query files, reducing the surface area for performance regressions.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Repository Completeness', 'End-to-End Traceability'],
    applications: ['PostgreSQL (Neon)', 'GovEA Web App'],
    initiatives: ['Repository Completeness Dashboard'],
    objectives: ['Deliver a complete EA repository for state and local government'],
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
    rationale: 'Architecture that starts with technology creates solutions in search of problems. Starting with business goals ensures every capability, application, and decision can be traced back to an outcome the organisation is trying to achieve. In GovEA, this means no module or feature is built unless it addresses a documented business or user need.',
    implications: 'Every GovEA issue must reference a capability ID and a business goal before implementation begins. Features that cannot be traced to a business outcome are descoped. Architecture reviews start with objectives, not systems.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Capability Mapping', 'Architecture Decision Records'],
    adrs: [] as string[],
  },
  {
    name: 'Value at Every Step',
    description: 'Every artifact, decision, and recommendation must create meaningful business or customer value. If something does not deliver value, it does not belong.',
    title: 'Every artifact must deliver measurable value',
    rationale: 'EA practices fail when they produce documentation nobody reads or governance nobody follows. Requiring every artifact to deliver value forces the team to ask "who will use this and how?" before creating it. In GovEA, this principle drives the decision to start with a minimal but complete set of modules rather than building comprehensive coverage first.',
    implications: 'Capabilities, ADRs, and principles that are not actively referenced or maintained are flagged as stale. Repository completeness scoring surfaces low-value content for review. Debt items without a linked initiative are escalated in severity.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Repository Completeness', 'Architecture Debt Tracking'],
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
    capabilities: ['Capability Mapping', 'Content Authoring & Workflow', 'Repository Completeness'],
    adrs: ['ADR-002'],
  },
  {
    name: 'AI-Enabled from the Beginning',
    description: 'AI is not an add-on. It is built into how EasyEA works. Use AI to accelerate insight, reduce manual effort, and strengthen decision-making across all steps.',
    title: 'Use AI throughout — not as a bolt-on at the end',
    rationale: 'EA practitioners face significant cognitive load — synthesising large bodies of documentation, identifying patterns, and maintaining consistent terminology across dozens of artefacts. AI assistance reduces that burden and allows practitioners to focus on judgment rather than drafting. GovEA is built with AI-assisted authoring as a first-class workflow, not an afterthought.',
    implications: 'GovEA features are designed to work with AI-assisted authoring tools. The data model produces clean, structured output that AI tools can read and augment. Where AI is used to draft content, the source is noted and human review is required before publication.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Content Authoring & Workflow', 'Feature Management'],
    adrs: [] as string[],
  },
  {
    name: 'Human in the Lead',
    description: 'AI may structure the work, draft artifacts, simulate review perspectives, and surface options. Humans make the decisions. No EasyEA engagement may move from discovery to recommendation, or from recommendation to implementation, without explicit human confirmation.',
    title: 'AI structures the work; humans make the decisions',
    rationale: 'AI can accelerate EA work dramatically but introduces risks if its outputs are accepted without review. AI-generated content can be plausible but wrong; AI-simulated stakeholder perspectives can miss political or contextual nuance; AI recommendations can optimise for the wrong objective. Human confirmation at each decision point is non-negotiable.',
    implications: 'GovEA does not automate architecture decisions. Auto-detected debt items surface recommendations but require human review before remediation is logged. All published content reflects a human authoring decision, not an automated one.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Content Authoring & Workflow', 'Architecture Decision Records'],
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
    capabilities: ['Capability Mapping', 'Architecture Debt Tracking'],
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
    capabilities: ['Repository Completeness', 'Content Authoring & Workflow'],
    adrs: [] as string[],
  },
  {
    name: 'Lightweight and Built for Everyday Work',
    description: 'The framework must fit naturally into business, product, and delivery workflows. Minimal artifacts. Lean governance. Just enough structure to support good decisions — nothing more.',
    title: 'Fit into existing workflows; do not create new ones',
    rationale: 'EA tools that require a dedicated EA team to operate are not sustainable in most government organisations. GovEA is designed to be used by department directors, programme managers, and analysts alongside their primary responsibilities — not only by dedicated architects.',
    implications: 'GovEA workflows are measured against time-to-first-value for non-specialist users. Features that require more effort to maintain than the value they produce are candidates for removal. The seed data and onboarding flow are designed to demonstrate value within the first ten minutes of use.',
    principleType: 'architecture' as const,
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Feature Management', 'Content Authoring & Workflow'],
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
    capabilities: ['Multi-Org Federation', 'Content Authoring & Workflow'],
    adrs: [] as string[],
  },
  {
    name: 'Designed to Evolve',
    description: 'EasyEA is a continuous, learning-focused framework. It supports experimentation, feedback loops, and incremental improvement. When real work reveals gaps, log them. When the framework is wrong, change it.',
    title: 'Log gaps; change the framework when it is wrong',
    rationale: 'No framework survives first contact with a real organisation unchanged. EasyEA is explicitly designed to be modified based on real experience. The architecture decision record pattern, the archived status on capabilities, and the supersession chain on ADRs are all mechanisms for capturing how the organisation\'s thinking has evolved.',
    implications: 'Deprecated approaches are archived, not deleted. ADRs that are no longer current are marked superseded with a reference to the decision that replaced them. GovEA collects structured feedback through GitHub issues and uses that feedback to evolve the platform. FRAMEWORK-IMPROVEMENTS.md captures gaps discovered during real engagements.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Feature Management', 'Architecture Decision Records'],
    adrs: [] as string[],
  },
]

// ─── Glossary (GovEA Project) ─────────────────────────────────────────────────

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
    term: 'Architecture Decision Record',
    definition: 'A document that captures a significant architectural decision made during the evolution of a system, including the context that motivated it, the decision itself, and its consequences. ADRs are immutable by convention — superseded decisions are marked as such rather than deleted.',
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
    definition: 'A measure of how thoroughly the EA repository reflects the current state of the organisation\'s architecture. Completeness is assessed per capability domain and considers the presence of descriptions, persona links, application links, and content freshness.',
    domain: 'Enterprise Architecture',
    notes: 'GovEA calculates completeness scores automatically on each repository save. Scores below 60% trigger a warning in the dashboard.',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Federation',
    definition: 'The ability for two or more GovEA organisations to establish a trusted connection and share EA content across organisational boundaries. Federated content retains its source organisation\'s visibility rules.',
    domain: 'Platform',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
]

// ─── Services (GovEA Project) ─────────────────────────────────────────────────

export const GOVEA_PROJECT_SERVICES = [
  {
    name: 'GovEA Hosted Application',
    description: 'The cloud-hosted GovEA web application available to state and local government organisations at govea.app. Organisations sign up, create a workspace, and begin modelling their enterprise architecture immediately.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records', 'Content Authoring & Workflow', 'User & Role Management'],
    personas: ['Enterprise Architect', 'Junior EA Analyst', 'Department Director'],
    valueStreams: ['EA Gap to Published Architecture'],
  },
  {
    name: 'Open Source Self-Hosting',
    description: 'The GovEA codebase published on GitHub under an open source licence, enabling government organisations to self-host the application on their own infrastructure.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'connections' as const,
    capabilities: ['Feature Management', 'User & Role Management'],
    personas: ['CMS Administrator'],
    valueStreams: ['Feature Idea to Production'],
  },
  {
    name: 'EA Repository Authoring',
    description: 'The core EA authoring workspace — capabilities, applications, personas, value streams, principles, decisions, and strategy modules — used by EA practitioners to build and maintain their architecture repository.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Capability Mapping', 'Application Portfolio', 'Architecture Decision Records', 'Repository Completeness', 'Architecture Debt Tracking'],
    personas: ['Enterprise Architect', 'Junior EA Analyst'],
    valueStreams: ['EA Gap to Published Architecture'],
  },
  {
    name: 'Multi-Organisation Architecture Collaboration',
    description: 'Federated EA sharing that allows connected government organisations to publish capabilities and cross-link their architecture at agreed visibility levels.',
    serviceOwner: 'GovEA Project',
    channels: ['online'],
    status: 'draft' as const,
    visibility: 'connections' as const,
    capabilities: ['Multi-Org Federation'],
    personas: ['Agency EA Coordinator', 'Enterprise Architect'],
    valueStreams: [] as string[],
  },
]
