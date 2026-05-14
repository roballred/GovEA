// Synthetic data for development and testing.
// All dev users use the password 'dev-password' (hashed at seed time).
// Dev login shortcuts on the login page bypass password entry in development.
//
// Four organizations are seeded here; a fifth (City of Hartfield, TOGAF overlay
// demo) is defined in togaf-demo-fixtures.ts and seeded by run.ts as Org 5.
//
//   - City of Riverdale (primary dev org) — full EA content, admin + contributor shortcuts
//   - City of Lakeside — second municipal demo org, comparable EA content, admin role
//   - Office of Digital Services (state agency) — second org for multi-org scenario
//   - GovEA Platform (system org, isSystemOrg=true) — operator org for instance admin
//
// An active org connection between City of Riverdale and Office of Digital Services
// and multiple cross-org capability links are created to exercise the federation/visibility use case.
//
// Dev login roster:
//   alice@govea.dev               — City of Riverdale, Admin
//   carol@govea.dev               — City of Riverdale, Contributor
//   luke@lakeside.govea.dev       — City of Lakeside, Admin
//   sam@state.govea.dev           — Office of Digital Services, Admin
//   maya@hartfield.govea.dev      — City of Hartfield (TOGAF demo), Admin
//   ivan@govea.dev                — GovEA Platform, Instance Admin (dev tools only)
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
]

// ─── City of Lakeside ─────────────────────────────────────────────────────────

export const LAKESIDE_ORG = {
  name: 'City of Lakeside',
  slug: 'city-of-lakeside',
}

export const LAKESIDE_USERS = [
  { name: 'Luke Admin', email: 'luke@lakeside.govea.dev', role: 'admin' as const },
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
    visibility: 'org' as const,
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
    visibility: 'org' as const,
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

// ─── Personas (City of Lakeside) ─────────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const LAKESIDE_PERSONAS = [
  {
    name: 'Resident',
    description: 'A Lakeside resident who accesses city parks, waterfront facilities, and reporting tools. Primarily uses the city website and mobile app.',
    type: 'Citizen',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Marina Operator',
    description: 'Owner or manager of a marina slip or waterfront commercial business requiring annual waterfront permits and safety inspections.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Parks & Recreation Staff',
    description: 'Front-line parks department employee managing facility bookings, maintenance requests, and recreation program delivery.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Environmental Compliance Officer',
    description: 'City staff responsible for stormwater monitoring, permit compliance, and environmental reporting to state agencies.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Department Director',
    description: 'Senior city manager overseeing a department\'s budget, strategic objectives, and cross-departmental coordination.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'City Council Member',
    description: 'Elected official who votes on budgets, policies, and major capital projects affecting parks, waterfront, and city services.',
    type: 'Elected Official',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
  {
    name: 'Seasonal Visitor',
    description: 'Summer-season visitor to Lakeside who uses the marina, parks, and visitor services. Peak demand runs May through September.',
    type: 'Citizen',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'Waterfront Event Coordinator',
    description: 'External event organiser who previously held a direct permit relationship with the city. Role retired when waterfront events were contracted to a dedicated events management firm.',
    type: 'External Partner',
    status: 'archived' as const,
    visibility: 'instance' as const,
  },
]

// ─── Capabilities (City of Lakeside) ─────────────────────────────────────────
// Coverage: status = draft ✓, published ✓, archived ✓
//           visibility = org ✓, connections ✓, instance ✓

export const LAKESIDE_CAPABILITIES = [
  {
    name: 'Parks & Facility Reservation',
    description: 'Manage bookings for parks, pavilions, athletic fields, and recreation centres. Includes availability calendars, online payment, and confirmation workflows.',
    domain: 'Community Services',
    behaviors: 'Search available facilities by date, location, and type\nBook a facility online and pay required fees\nReceive a digital confirmation with access instructions\nCancel or modify a booking within the allowed window\nView and manage all active bookings from a resident account',
    rules: 'Bookings require payment at time of reservation\nCancellations within 48 hours of the booking start are non-refundable\nFacilities may only be booked by verified resident accounts',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Parks & Recreation Staff'],
  },
  {
    name: 'Waterfront Permit & Licensing',
    description: 'Issue and renew annual waterfront operation permits for marinas, boat rentals, and commercial waterfront businesses. Includes safety inspections and fee collection.',
    domain: 'Regulatory Compliance',
    behaviors: 'Submit a new or renewal waterfront permit application with supporting documents\nSchedule and record a safety inspection tied to the application\nIssue a digital permit certificate upon approval\nSend renewal reminders 60 days before permit expiry\nRevoke or suspend a permit for non-compliance',
    rules: 'A permit may only be issued after a satisfactory safety inspection\nAll waterfront commercial operators must hold a current permit\nRenewal applications must be submitted at least 30 days before expiry',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Marina Operator', 'Parks & Recreation Staff'],
  },
  {
    name: 'Stormwater Management',
    description: 'Plan, inspect, and maintain the city\'s stormwater infrastructure. Track outfall monitoring, maintenance schedules, and regulatory compliance reporting.',
    domain: 'Infrastructure & Operations',
    behaviors: 'Log and schedule stormwater infrastructure inspections\nRecord maintenance activities against specific assets\nGenerate compliance reports for state NPDES permit submissions\nTrack outfall monitoring data over time',
    rules: 'NPDES compliance reports must be filed on state-mandated schedules\nAll outfall monitoring data must be retained for a minimum of 5 years',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Environmental Compliance Officer', 'Department Director'],
  },
  {
    name: 'Recreation Program Registration',
    description: 'Register residents and seasonal visitors for city-run recreation programs including classes, sports leagues, camps, and fitness programs.',
    domain: 'Community Services',
    behaviors: 'Browse and search available recreation programs by type, age group, and season\nRegister participants and pay program fees online\nView registration confirmation and program schedule\nJoin a waitlist for programs at capacity\nReceive notifications for program changes or cancellations',
    rules: 'Programs with age or residency restrictions must validate eligibility at registration\nRefunds are only available for cancellations made at least 5 business days before the program start date',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Seasonal Visitor'],
  },
  {
    name: 'Asset & Work Order Management',
    description: 'Track, schedule, and dispatch maintenance work orders for parks assets, waterfront structures, and green space infrastructure.',
    domain: 'Infrastructure & Operations',
    behaviors: 'Create and assign maintenance work orders for parks and waterfront assets\nTrack work order status from open to closed\nRecord labour, materials, and cost against each work order\nLink assets to inspection histories and maintenance schedules\nGenerate asset condition reports for capital planning',
    rules: 'All maintenance activity against city assets must be recorded as a work order\nClosed work orders are read-only and cannot be modified',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Parks & Recreation Staff'],
  },
  {
    name: 'Environmental Monitoring & Reporting',
    description: 'Collect and report water quality and environmental data from lake monitoring stations and stormwater outfalls. Supports state permit compliance.',
    domain: 'Infrastructure & Operations',
    status: 'draft' as const,
    visibility: 'org' as const,
    personas: ['Environmental Compliance Officer'],
  },
  {
    name: 'Community Engagement & Notifications',
    description: 'Push targeted notifications, alerts, and community updates to residents via email, SMS, and the city website. Includes emergency alert integration.',
    domain: 'Public Engagement',
    behaviors: 'Send targeted notifications to resident segments by geography or subscription topic\nPublish community updates to the city website and resident app\nIntegrate with the statewide emergency alert system for urgent notifications\nTrack notification delivery and open rates',
    rules: 'Residents must opt in to non-emergency notifications\nEmergency alerts bypass opt-in consent\nNotification content must be reviewed by the communications team before distribution',
    status: 'published' as const,
    visibility: 'connections' as const,
    personas: ['Resident', 'City Council Member'],
  },
  {
    name: 'Financial Management',
    description: 'General ledger, accounts payable, procurement, and budget management for city departments.',
    domain: 'Finance & Revenue',
    behaviors: 'Post journal entries to the general ledger\nProcess accounts payable invoices and generate payment runs\nTrack departmental budgets and expenditures in real time\nGenerate financial reports for audit and council review',
    rules: 'All expenditures must be approved by an authorised budget holder before payment\nFinancial records must be retained for 7 years',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Department Director'],
  },
  {
    name: 'Document Management',
    description: 'Centralised repository for city documents, permits, and records. Supports retention schedules and public records requests.',
    domain: 'Administrative Services',
    status: 'draft' as const,
    visibility: 'org' as const,
    personas: ['Parks & Recreation Staff', 'Environmental Compliance Officer'],
  },
  // archived + instance — exercises both missing enum values
  {
    name: 'Legacy Booking System',
    description: 'Self-hosted facility booking application replaced by ActiveNet. Archived following successful data migration in Q4 FY2026.',
    domain: 'Community Services',
    status: 'archived' as const,
    visibility: 'instance' as const,
    personas: [] as string[],
  },
]

// ─── Applications (City of Lakeside) ─────────────────────────────────────────

export const LAKESIDE_APPLICATIONS = [
  {
    name: 'ActiveNet',
    description: 'Parks and recreation management platform for facility reservations, program registration, and activity management.',
    vendor: 'Perfect Mind / ActiveNetwork',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Parks & Facility Reservation', 'Recreation Program Registration'],
  },
  {
    name: 'Tyler Munis',
    description: 'Enterprise resource planning system for financial management, purchasing, and budget tracking.',
    vendor: 'Tyler Technologies',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Financial Management'],
  },
  {
    name: 'Laserfiche',
    description: 'Enterprise content management and document services platform for city records and permit documentation.',
    vendor: 'Laserfiche',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Document Management'],
  },
  {
    name: 'Brightly Asset Essentials',
    description: 'Cloud-based work order and asset management system for parks facilities, trails, and waterfront infrastructure.',
    vendor: 'Brightly (formerly Dude Solutions)',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Asset & Work Order Management'],
  },
  {
    name: 'Cartegraph OMS',
    description: 'Legacy on-premises operations management system used for work orders and asset tracking. Being phased out in favour of Brightly Asset Essentials.',
    vendor: 'Cartegraph',
    hostingModel: 'on-prem',
    lifecycleStatus: 'sunset' as const,
    status: 'published' as const,
    capabilities: ['Asset & Work Order Management'],
  },
]

// ─── Value Streams (City of Lakeside) ────────────────────────────────────────

export const LAKESIDE_VALUE_STREAMS = [
  {
    name: 'Facility Booking to Confirmation',
    description: 'End-to-end journey from a resident or visitor searching for an available facility through to receiving a booking confirmation.',
    valueItem: 'Confirmed facility booking with digital access instructions',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Resident', 'Seasonal Visitor'],
    stages: [
      {
        name: 'Availability Search',
        description: 'Resident searches for available facilities by date, type, and location.',
        order: 1,
        capabilities: ['Parks & Facility Reservation'],
      },
      {
        name: 'Booking & Payment',
        description: 'Resident selects a facility, reviews terms, and completes payment.',
        order: 2,
        capabilities: ['Parks & Facility Reservation'],
      },
      {
        name: 'Confirmation & Access',
        description: 'Booking is confirmed and resident receives a digital confirmation with access instructions.',
        order: 3,
        capabilities: ['Parks & Facility Reservation', 'Community Engagement & Notifications'],
      },
    ],
  },
  {
    name: 'Permit Application to Approval',
    description: 'Journey from a marina operator submitting a waterfront permit application through to receiving an approved permit certificate.',
    valueItem: 'Approved waterfront permit certificate enabling legal operation',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Marina Operator'],
    stages: [
      {
        name: 'Application Submission',
        description: 'Operator submits permit application with required documentation and pays the application fee.',
        order: 1,
        capabilities: ['Waterfront Permit & Licensing'],
      },
      {
        name: 'Review & Inspection',
        description: 'Staff review the application and conduct a safety inspection of the waterfront operation.',
        order: 2,
        capabilities: ['Waterfront Permit & Licensing'],
      },
      {
        name: 'Approval & Issuance',
        description: 'Permit is approved and a digital permit certificate is issued to the operator.',
        order: 3,
        capabilities: ['Waterfront Permit & Licensing'],
      },
    ],
  },
]

// ─── Strategic Objectives (City of Lakeside) ──────────────────────────────────

export const LAKESIDE_OBJECTIVES = [
  {
    name: 'Modernise Parks & Recreation Digital Services',
    description: 'Replace disconnected booking spreadsheets and phone-based registration with a unified online platform that residents and seasonal visitors can access at any time.',
    successMetric: '90% of facility bookings and program registrations completed online by end of FY2027',
    timeHorizon: 'FY2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Parks & Facility Reservation', 'Recreation Program Registration', 'Community Engagement & Notifications'],
    valueStreams: ['Facility Booking to Confirmation'],
  },
  {
    name: 'Strengthen Environmental Compliance & Reporting',
    description: 'Improve stormwater monitoring data quality and automate compliance report generation to eliminate manual data assembly and reduce risk of late or deficient submissions.',
    successMetric: '100% on-time stormwater compliance reports filed with no deficiencies by FY2026',
    timeHorizon: 'FY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Environmental Monitoring & Reporting', 'Stormwater Management'],
    valueStreams: [] as string[],
  },
  {
    name: 'Replace Legacy Asset Management System',
    description: 'Retire the ageing Cartegraph OMS system and migrate all parks and waterfront asset and work order management to a modern cloud-hosted platform.',
    successMetric: 'Cartegraph OMS decommissioned and Brightly Asset Essentials fully operational across all work order categories by Q2 FY2027',
    timeHorizon: 'FY2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Asset & Work Order Management'],
    valueStreams: [] as string[],
  },
]

// ─── Initiatives (City of Lakeside) ──────────────────────────────────────────
// Coverage: status = active ✓, proposed ✓, on-hold ✓, complete ✓

export const LAKESIDE_INITIATIVES = [
  {
    name: 'ActiveNet Implementation',
    description: 'Implement ActiveNet as the city\'s unified parks and recreation management platform, replacing disconnected booking spreadsheets and the phone-based registration process.',
    status: 'active' as const,
    startDate: 'Q2 FY2026',
    endDate: 'Q4 FY2026',
    capabilities: [
      { name: 'Parks & Facility Reservation',  impact: 'build' },
      { name: 'Recreation Program Registration', impact: 'build' },
    ],
    applications: [
      { name: 'ActiveNet', impact: 'build' },
    ],
    objectives: ['Modernise Parks & Recreation Digital Services'],
  },
  {
    name: 'Asset Management Platform Replacement',
    description: 'Retire the legacy Cartegraph OMS system and migrate work order and asset management to Brightly Asset Essentials. Includes data migration, staff training, and a parallel-run period.',
    status: 'proposed' as const,
    startDate: 'Q1 FY2027',
    endDate: 'Q4 FY2027',
    capabilities: [
      { name: 'Asset & Work Order Management', impact: 'improve' },
    ],
    applications: [
      { name: 'Cartegraph OMS',         impact: 'retire' },
      { name: 'Brightly Asset Essentials', impact: 'build'  },
    ],
    objectives: ['Replace Legacy Asset Management System'],
  },
  {
    name: 'Waterfront Digital Permitting Pilot',
    description: 'Pilot a digital permit application and inspection workflow for marina operators and waterfront businesses. On hold pending selection of a permitting platform compatible with the city\'s Tyler Munis integration.',
    status: 'on-hold' as const,
    startDate: 'Q3 FY2026',
    endDate: 'Q2 FY2027',
    capabilities: [
      { name: 'Waterfront Permit & Licensing', impact: 'improve' },
    ],
    applications: [] as { name: string; impact: string }[],
    objectives: [] as string[],
  },
  {
    name: 'Stormwater Compliance Reporting Upgrade',
    description: 'Upgrade stormwater monitoring data collection and reporting workflows to meet updated state NPDES permit requirements. Completed Q2 FY2025.',
    status: 'complete' as const,
    startDate: 'Q3 FY2024',
    endDate: 'Q2 FY2025',
    capabilities: [
      { name: 'Stormwater Management',              impact: 'improve' },
      { name: 'Environmental Monitoring & Reporting', impact: 'build'  },
    ],
    applications: [] as { name: string; impact: string }[],
    objectives: ['Strengthen Environmental Compliance & Reporting'],
  },
]

// ─── ADRs (City of Lakeside) ──────────────────────────────────────────────────
// Coverage: status = accepted ✓, superseded ✓ (ADR-002 → ADR-003)
//           supersededByNumber — self-reference chain resolved in run.ts

export const LAKESIDE_ADRS = [
  {
    number: 'ADR-001',
    title: 'Adopt SaaS-first for parks and recreation technology acquisitions',
    context: 'The parks department relied on a mix of paper forms, spreadsheets, and a legacy self-hosted booking system that required dedicated server maintenance and was inaccessible outside of business hours. The existing approach could not support resident self-service or seasonal demand spikes.',
    decision: 'All new parks and recreation technology acquisitions will default to vendor-hosted SaaS platforms. On-premises deployment requires Director-level approval and a documented justification.',
    consequences: 'Reduces infrastructure burden on IT. Enables 24/7 resident self-service. Increases reliance on vendor uptime and internet access. Requires updated data agreements to cover resident data processed by SaaS vendors.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Parks & Facility Reservation', 'Recreation Program Registration'],
    applications: ['ActiveNet'],
    initiatives: ['ActiveNet Implementation'],
    objectives: ['Modernise Parks & Recreation Digital Services'],
  },
  {
    number: 'ADR-002',
    title: 'Retain on-premises hosting for all environmental monitoring data',
    context: 'Environmental monitoring data is subject to state retention requirements and chain-of-custody obligations for NPDES permit submissions. In 2021, city legal counsel advised that cloud-hosted storage created ambiguity about data custody for regulatory compliance.',
    decision: 'Environmental monitoring and stormwater compliance data will be stored exclusively on city-managed on-premises infrastructure.',
    consequences: 'Ensured regulatory compliance under the 2021 legal interpretation. Restricted cloud adoption for environmental systems and increased infrastructure maintenance costs. Superseded by updated state cloud data guidance issued in 2024.',
    status: 'superseded' as const,
    supersededByNumber: 'ADR-003',
    capabilities: ['Environmental Monitoring & Reporting'],
    applications: [] as string[],
    initiatives: [] as string[],
    objectives: [] as string[],
  },
  {
    number: 'ADR-003',
    title: 'Permit cloud hosting for environmental data with state-approved data residency controls',
    context: 'The state issued updated cloud hosting guidance in 2024 permitting cloud storage of environmental monitoring data provided vendors hold state-approved data residency agreements. This resolves the legal ambiguity that motivated ADR-002.',
    decision: 'Environmental monitoring and stormwater compliance data may be hosted in cloud platforms that hold state-approved data residency agreements. Vendor data residency documentation must be reviewed by city legal counsel before onboarding.',
    consequences: 'Opens the market for cloud-hosted environmental monitoring solutions. Requires vendor due diligence on data residency agreements. Supersedes ADR-002.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Environmental Monitoring & Reporting', 'Stormwater Management'],
    applications: [] as string[],
    initiatives: ['Stormwater Compliance Reporting Upgrade'],
    objectives: ['Strengthen Environmental Compliance & Reporting'],
  },
]

// ─── Principles (City of Lakeside) ───────────────────────────────────────────

export const LAKESIDE_PRINCIPLES = [
  {
    name: 'Accessible by Default',
    description: 'Design all resident-facing parks and recreation services for maximum accessibility — physical, digital, and linguistic.',
    title: 'Design for accessibility first in all parks and recreation services',
    rationale: 'Parks and recreation services are used by residents of all abilities, ages, and language backgrounds. Designing for the most constrained users ensures the service works well for everyone, including those with disabilities, low digital literacy, or limited English proficiency.',
    implications: 'All online booking and registration flows must meet WCAG 2.1 AA standards. Multilingual support is required for all resident-facing parks services. Staff-facing interfaces require accessibility review before launch.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Parks & Facility Reservation', 'Recreation Program Registration', 'Community Engagement & Notifications'],
    adrs: [] as string[],
  },
  {
    name: 'Environmental Stewardship Through Data',
    description: 'Base environmental policy decisions on monitored data rather than estimates, and publish compliance data openly where permissible.',
    title: 'Ground environmental decisions in monitored, verifiable data',
    rationale: 'The lake and waterfront are the city\'s most valuable natural assets. Environmental decisions made without reliable monitoring data risk both ecological damage and regulatory non-compliance. Data-grounded decisions are also more defensible in regulatory and public contexts.',
    implications: 'Capital investments in environmental monitoring infrastructure are prioritised. Stormwater and water quality data must be collected at defined intervals and stored with full chain-of-custody metadata. Compliance reports must include source data references.',
    principleType: 'data' as const,
    status: 'draft' as const,
    visibility: 'connections' as const,
    capabilities: ['Environmental Monitoring & Reporting', 'Stormwater Management'],
    adrs: [] as string[],
  },
]

// ─── Glossary (City of Lakeside) ─────────────────────────────────────────────

export const LAKESIDE_GLOSSARY = [
  {
    term: 'Asset Management',
    definition: 'The systematic process of developing, operating, maintaining, and disposing of physical assets in the most cost-effective manner. In local government, covers infrastructure, buildings, equipment, and fleet.',
    domain: 'Infrastructure & Operations',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Work Order',
    definition: 'A formal record of a maintenance, repair, or improvement task assigned to a staff member or crew. Work orders track the scope of work, assigned resources, priority, status, and completion details.',
    domain: 'Infrastructure & Operations',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Waterfront Permit',
    definition: 'An annual operating permit issued by the city to commercial operators conducting business on or adjacent to the waterfront, including marinas, boat rentals, and event organisers.',
    domain: 'Regulatory Compliance',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Stormwater Management',
    definition: 'The collection, treatment, and controlled release of rainwater and snowmelt runoff to prevent flooding and protect water quality. Local governments are typically responsible for stormwater infrastructure under their NPDES permit.',
    domain: 'Infrastructure & Operations',
    notes: 'City of Lakeside holds an NPDES Phase II Small MS4 permit from the state. All stormwater-related system decisions must align with permit obligations and the approved Stormwater Management Plan.',
    status: 'draft' as const,
    visibility: 'org' as const,
  },
  {
    term: 'Recreation Program',
    definition: 'A structured activity or class offered by the parks and recreation department for residents, including fitness, arts, sports leagues, summer camps, and senior programming.',
    domain: 'Community Services',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    term: 'NPDES Permit',
    definition: 'National Pollutant Discharge Elimination System permit — a federal permit administered by states that regulates the discharge of pollutants into waters of the United States. Local governments operating stormwater systems hold Phase II MS4 permits.',
    definitionSource: 'US EPA Clean Water Act Section 402',
    domain: 'Infrastructure & Operations',
    status: 'published' as const,
    visibility: 'connections' as const,
  },
]

// ─── Services (City of Lakeside) ─────────────────────────────────────────────

export const LAKESIDE_SERVICES = [
  {
    name: 'Parks & Facility Booking',
    description: 'Residents and seasonal visitors book parks pavilions, athletic fields, and recreation centres online, select dates, pay fees, and receive a digital confirmation with access instructions.',
    serviceOwner: 'Parks & Recreation',
    channels: ['online', 'in-person'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Parks & Facility Reservation'],
    personas: ['Resident', 'Parks & Recreation Staff'],
    valueStreams: ['Facility Booking to Confirmation'],
  },
  {
    name: 'Waterfront Permit Application',
    description: 'Marina operators and waterfront commercial businesses apply for and renew their annual waterfront operating permits, upload required documents, pay fees, and track inspection scheduling.',
    serviceOwner: 'Waterfront Management Office',
    channels: ['online', 'in-person'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Waterfront Permit & Licensing'],
    personas: ['Marina Operator'],
    valueStreams: ['Permit Application to Approval'],
  },
  {
    name: 'Recreation Program Registration',
    description: 'Residents and seasonal visitors browse and register for city-run recreation programs — fitness classes, sports leagues, summer camps, and senior activities — and pay online.',
    serviceOwner: 'Parks & Recreation',
    channels: ['online', 'mobile'],
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Recreation Program Registration'],
    personas: ['Resident', 'Seasonal Visitor'],
    valueStreams: ['Facility Booking to Confirmation'],
  },
  {
    name: 'Report Environmental Concern',
    description: 'Residents report suspected stormwater, lake water quality, or waterfront environmental issues. Reports are triaged by the Environmental Services Division and tracked to resolution.',
    serviceOwner: 'Environmental Services Division',
    channels: ['online', 'phone'],
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Environmental Monitoring & Reporting', 'Stormwater Management'],
    personas: ['Resident', 'Environmental Compliance Officer'],
    valueStreams: [] as string[],
  },
]
