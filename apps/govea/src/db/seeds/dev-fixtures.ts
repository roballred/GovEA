// Synthetic data for development and testing.
// All dev users use the password 'dev-password' (hashed at seed time).
// Dev login shortcuts on the login page bypass password entry in development.
//
// Two organizations are seeded:
//   - City of Riverdale (primary dev org) — full EA content, three user roles
//   - Office of Digital Services (state agency) — second org for multi-org scenario
//
// An active org connection between them and multiple cross-org capability links are
// created to exercise the federation/visibility use case.

// ─── Orgs ────────────────────────────────────────────────────────────────────

export const DEV_ORG = {
  name: 'City of Riverdale',
  slug: 'city-of-riverdale',
}

export const STATE_ORG = {
  name: 'Office of Digital Services',
  slug: 'office-of-digital-services',
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const DEV_USERS = [
  { name: 'Alice Admin',       email: 'alice@govea.dev',       role: 'admin'       as const },
  { name: 'Carol Contributor', email: 'carol@govea.dev',       role: 'contributor' as const },
  { name: 'Victor Viewer',     email: 'victor@govea.dev',      role: 'viewer'      as const },
]

export const STATE_USERS = [
  { name: 'Sam StateAdmin',    email: 'sam@state.govea.dev',   role: 'admin'       as const },
]

// ─── Persona types & tags (shared defaults) ──────────────────────────────────

export const DEFAULT_PERSONA_TYPES = [
  'Citizen',
  'Staff',
  'Elected Official',
  'External Partner',
]

export const DEFAULT_TAGS = [
  'mobile-first',
  'accessibility',
  'high-volume',
  'low-digital-literacy',
  'multilingual',
]

// Tag assignments for specific personas — seeds the personaTags junction table.
export const DEV_PERSONA_TAGS = [
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
  // archived + instance — exercises both missing enum values
  {
    name: 'Legacy System Operator',
    description: 'Staff role responsible for operating and maintaining legacy on-premises systems. Role phased out as systems are decommissioned.',
    type: 'Staff',
    status: 'archived' as const,
    visibility: 'instance' as const,
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
    domain: 'Finance & Budget',
    behaviors: 'View budget vs. actuals comparisons by department and fund\nGenerate forecast dashboards for the current fiscal year\nExport budget reports to PDF or spreadsheet',
    rules: 'Budget data is read-only in this capability — modifications are made in the source financial system\nOnly published budget reports are visible to elected officials',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Department Director', 'City Council Member'],
  },
  {
    name: 'Service Request Management',
    description: 'Residents submit and track non-emergency service requests such as pothole repairs, graffiti removal, and missed pickups.',
    domain: 'Public Works',
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
    applications: ['Accela', 'Microsoft Entra ID'],
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
    applications: ['CityWorks', 'Legacy Permitting System'],
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
    applications: [] as string[],
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
    applications: [] as string[],
    valueStreams: [] as string[],
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
    domain: 'Finance & Budget',
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
