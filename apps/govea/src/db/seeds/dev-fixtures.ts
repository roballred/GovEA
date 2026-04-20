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
    status: 'draft' as const,
    visibility: 'connections' as const,
    capabilities: ['Online Permitting', 'Service Request Management'],
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
    applications: ['Accela', 'Microsoft Entra ID'],
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
    applications: ['Accela'],
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
    applications: ['CityWorks'],
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
    applications: ['ArcGIS Online'],
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
    applications: ['Workday', 'Microsoft Entra ID'],
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
    applications: ['OpenGov'],
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
    applications: ['Microsoft Entra ID'],
    valueStreams: [],
  },
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
