// Test and demo dataset presets.
// Used by the dev toolbar to reset org content to a known state.
// Each dataset defines personas, capabilities, applications, tags,
// and the linkages between them.
// Persona types and tags are managed via Taxonomy (slug: persona-type / persona-tag).

export type DatasetPersona = {
  name: string
  description: string
  type: string
  status: 'draft' | 'published' | 'archived'
  tags: string[]
}

export type DatasetCapability = {
  name: string
  description: string
  domain: string
  behaviors?: string  // one behavior per line
  rules?: string      // one rule per line
  status: 'draft' | 'published' | 'archived'
  personas: string[]  // persona names
}

export type DatasetApplication = {
  name: string
  description: string
  vendor: string
  hostingModel: 'saas' | 'on-prem' | 'hybrid'
  lifecycleStatus: 'active' | 'planned' | 'sunset' | 'decommissioned'
  status: 'draft' | 'published' | 'archived'
  capabilities: string[] // capability names
}

export type DatasetValueStreamStage = {
  name: string
  description?: string
  capabilities: string[] // capability names
}

export type DatasetValueStream = {
  name: string
  description: string
  valueItem: string
  status: 'draft' | 'published' | 'archived'
  stages: DatasetValueStreamStage[]
}

export type DatasetObjective = {
  name: string
  description: string
  successMetric: string
  timeHorizon: string
  status: 'draft' | 'published' | 'archived'
  capabilities: string[]    // capability names
  valueStreams: string[]     // value stream names
}

export type DatasetInitiativeCapability = {
  name: string              // capability name
  impact?: 'build' | 'improve' | 'retire'
}

export type DatasetInitiative = {
  name: string
  description: string
  status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled'
  startDate?: string
  endDate?: string
  capabilities: DatasetInitiativeCapability[]
  objectives: string[]      // objective names
}

export type DatasetPrinciple = {
  name: string            // short label e.g. "SaaS First"
  description?: string    // one-sentence summary
  title?: string          // full principle statement
  rationale: string
  implications: string
  status: 'draft' | 'published' | 'archived'
  adrs: string[]          // ADR numbers
  capabilities: string[]  // capability names
}

export type DatasetGlossaryTermSource = {
  name: string
  url?: string
  definition: string
}

export type DatasetGlossaryTerm = {
  term: string
  definition: string
  definitionSource?: string   // name of the active source (if selected from sources)
  definitionSourceUrl?: string
  domain?: string
  notes?: string
  status: 'draft' | 'published' | 'archived'
  sources?: DatasetGlossaryTermSource[]
}

export type DatasetADR = {
  number: string            // e.g. "ADR-001"
  title: string
  context: string
  decision: string
  consequences: string
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  supersededByNumber: string | null
  capabilities: string[]   // capability names
  applications: string[]   // application names
  initiatives: string[]    // initiative names
  objectives: string[]     // objective names
}

export type DatasetService = {
  name: string
  description: string
  serviceOwner?: string
  channels: ('online' | 'in-person' | 'phone' | 'mobile')[]
  status: 'draft' | 'published' | 'archived'
  personas: string[]       // persona names
  capabilities: string[]   // capability names
  applications: string[]   // application names
  valueStreams: string[]    // value stream names
}

export type Dataset = {
  label: string
  description: string
  tags: string[]  // taxonomy tag values seeded under "Persona Tag" type
  personas: DatasetPersona[]
  capabilities: DatasetCapability[]
  applications: DatasetApplication[]
  valueStreams: DatasetValueStream[]
  objectives: DatasetObjective[]
  initiatives: DatasetInitiative[]
  adrs: DatasetADR[]
  principles: DatasetPrinciple[]
  glossary: DatasetGlossaryTerm[]
  services: DatasetService[]
}

// ── Dataset 1: Blank ──────────────────────────────────────────────────────────
// Empty content — tests empty states and creation flows.
// Restores default persona tags; persona types are managed in Taxonomy.

export const DATASET_BLANK: Dataset = {
  label: 'Blank',
  description: 'Empty — default tags only',
  tags: ['mobile-first', 'accessibility', 'high-volume', 'low-digital-literacy', 'multilingual'],
  personas: [],
  capabilities: [],
  applications: [],
  valueStreams: [],
  objectives: [],
  initiatives: [],
  adrs: [],
  principles: [],
  glossary: [],
  services: [],
}

// ── Dataset 2: Starter ────────────────────────────────────────────────────────
// Small city baseline — 3 personas, 3 capabilities, 3 applications.
// Good for testing basic CRUD and linkage flows.

export const DATASET_STARTER: Dataset = {
  label: 'Starter',
  description: '3 personas · 3 capabilities · 3 applications',
  tags: ['mobile-first', 'accessibility', 'high-volume', 'low-digital-literacy', 'multilingual'],
  personas: [
    {
      name: 'Resident',
      description: 'A member of the public interacting with city services online or in person.',
      type: 'Citizen',
      status: 'published',
      tags: ['high-volume', 'mobile-first'],
    },
    {
      name: 'IT Staff',
      description: 'Internal technology team member who administers systems and supports staff.',
      type: 'Staff',
      status: 'published',
      tags: ['accessibility'],
    },
    {
      name: 'Department Director',
      description: 'Senior agency leader responsible for a service area and its budget.',
      type: 'Staff',
      status: 'published',
      tags: [],
    },
  ],
  capabilities: [
    {
      name: 'Online Permitting',
      description: 'Submit and track permit applications online without visiting a counter.',
      domain: 'Community Development',
      behaviors: 'Submit a permit application online with required documents and fee payment\nTrack the status of an in-progress application\nReceive notifications when application status changes\nDownload an approved permit',
      rules: 'Applications must be scoped to an organization\nOnly published capabilities appear in front-end views',
      status: 'published',
      personas: ['Resident'],
    },
    {
      name: 'HR Self-Service',
      description: 'Employee access to payroll, benefits, and HR forms without HR staff involvement.',
      domain: 'Legislative & Executive',
      behaviors: 'View current and historical pay stubs\nUpdate personal information (address, emergency contacts)\nRequest time off and view leave balances\nEnroll in or change benefits during open enrollment',
      rules: 'Access is restricted to the authenticated employee\'s own records\nBenefits changes are only permitted during open enrollment windows',
      status: 'published',
      personas: ['IT Staff', 'Department Director'],
    },
    {
      name: 'GIS Mapping',
      description: 'Geographic information services for staff planning and public-facing maps.',
      domain: 'Information Technology',
      behaviors: 'View authoritative city basemap layers\nSearch for addresses and parcels\nExport map views as images or spatial data files',
      rules: 'Authoritative spatial data layers are managed by GIS staff only\nPublic-facing maps show only published, approved layers',
      status: 'published',
      personas: ['IT Staff'],
    },
  ],
  applications: [
    {
      name: 'Accela',
      description: 'Permitting and licensing platform for Community Development.',
      vendor: 'Accela',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['Online Permitting'],
    },
    {
      name: 'Workday',
      description: 'HR and payroll system for all city employees.',
      vendor: 'Workday',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['HR Self-Service'],
    },
    {
      name: 'ArcGIS Online',
      description: 'Cloud GIS platform for map authoring and public viewer apps.',
      vendor: 'Esri',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['GIS Mapping'],
    },
  ],
  valueStreams: [
    {
      name: 'Obtain a Building Permit',
      description: 'A resident or business owner applies for and receives an approved building permit.',

      valueItem: 'Approved permit enabling legal construction or renovation',
      status: 'published',
      stages: [
        { name: 'Submit application', description: 'Applicant completes and submits permit application online.', capabilities: ['Online Permitting'] },
        { name: 'Review and decision', description: 'Staff review application and issue approval or request corrections.', capabilities: ['Online Permitting'] },
      ],
    },
  ],
  objectives: [
    {
      name: 'Reduce permit processing time by 40%',
      description: 'Streamline the end-to-end permitting process to reduce burden on residents and businesses.',
      successMetric: 'Average calendar days from submission to decision < 10',
      timeHorizon: 'FY2026',
      status: 'published',
      capabilities: ['Online Permitting'],
      valueStreams: ['Obtain a Building Permit'],
    },
  ],
  initiatives: [
    {
      name: 'Accela Online Portal Upgrade',
      description: 'Upgrade Accela to the latest SaaS version to unlock self-service permit tracking and mobile submission.',
      status: 'active',
      startDate: 'Q1 FY2026',
      endDate: 'Q3 FY2026',
      capabilities: [{ name: 'Online Permitting', impact: 'improve' }],
      objectives: ['Reduce permit processing time by 40%'],
    },
  ],
  adrs: [
    {
      number: 'ADR-001',
      title: 'Use SaaS hosting for Accela',
      context: 'The city previously ran an in-house permitting system on aging on-premises infrastructure that required dedicated IT staff to maintain. Moving to a vendor-hosted SaaS model was evaluated as part of the Accela selection.',
      decision: 'Accela will be deployed as a SaaS solution. The city will not host or manage the application infrastructure. Vendor SLAs will govern availability and patching.',
      consequences: 'Reduces IT maintenance burden and keeps the platform on current releases. Increases reliance on vendor uptime and introduces data residency considerations that must be addressed in the contract.',
      status: 'accepted',
      supersededByNumber: null,
      capabilities: ['Online Permitting'],
      applications: ['Accela'],
      initiatives: ['Accela Online Portal Upgrade'],
      objectives: ['Reduce permit processing time by 40%'],
    },
  ],
  principles: [
    {
      name: 'SaaS First',
      description: 'Default to vendor-hosted SaaS for new application acquisitions where data residency requirements allow.',
      title: 'Prefer SaaS for standard business systems',
      rationale: 'Hosting standard applications on-premises creates infrastructure overhead and keeps the city on older versions. Where vendors offer SaaS deployment and data residency requirements can be met, SaaS reduces maintenance burden and ensures currency.',
      implications: 'New application acquisitions must default to SaaS. On-premises exceptions require documented justification covering security, compliance, or integration constraints, and a Director-level sign-off.',
      status: 'published',
      adrs: ['ADR-001'],
      capabilities: ['Online Permitting', 'HR Self-Service', 'GIS Mapping'],
    },
  ],
  glossary: [
    {
      term: 'Capability',
      definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
      definitionSource: 'EasyEA',
      domain: 'Enterprise Architecture',
      notes: 'Capabilities are technology-agnostic. The same capability can be supported by different applications over time.',
      status: 'published',
      sources: [
        {
          name: 'TOGAF 10',
          url: 'https://pubs.opengroup.org/togaf-standard/adm-techniques/chap08.html',
          definition: 'A business capability is an expression of what a business does and can do. Business capabilities represent the fundamental building blocks of an organization.',
        },
        {
          name: 'EasyEA',
          definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
        },
      ],
    },
    {
      term: 'Persona',
      definition: 'A named, representative user or stakeholder type that interacts with city services. Personas capture goals, context, and pain points to guide service and system design.',
      domain: 'Enterprise Architecture',
      status: 'published',
    },
    {
      term: 'Architecture Decision Record (ADR)',
      definition: 'A documented record of a significant architecture or technology decision — what was decided, why, and what the consequences are.',
      domain: 'Enterprise Architecture',
      notes: 'ADRs are immutable by convention. Superseded decisions are marked as such and linked to the newer decision, preserving the history.',
      status: 'published',
    },
    {
      term: 'SaaS (Software as a Service)',
      definition: 'A software delivery model in which the vendor hosts and operates the application on behalf of the customer. The customer accesses it over the internet and pays on a subscription basis.',
      definitionSource: 'NIST SP 800-145',
      domain: 'Information Technology',
      status: 'published',
      sources: [
        {
          name: 'NIST SP 800-145',
          url: 'https://csrc.nist.gov/publications/detail/sp/800-145/final',
          definition: 'The capability provided to the consumer is to use the provider\'s applications running on a cloud infrastructure. The applications are accessible from various client devices through either a thin client interface, such as a web browser.',
        },
      ],
    },
  ],
  services: [
    {
      name: 'Permit Application Service',
      description: 'The resident-facing online service for submitting and tracking building permit applications.',
      serviceOwner: 'Community Development',
      channels: ['online'],
      status: 'published',
      personas: ['Resident'],
      capabilities: ['Online Permitting'],
      applications: ['Accela'],
      valueStreams: ['Obtain a Building Permit'],
    },
  ],
}

// ── Dataset 3: City Demo ──────────────────────────────────────────────────────
// Full-featured demo — 6 personas, 8 capabilities, 5 applications.
// Shows off type badges, tags, filters, multi-select, lifecycle states.

export const DATASET_CITY_DEMO: Dataset = {
  label: 'City Demo',
  description: '6 personas · 8 capabilities · 5 applications',
  tags: ['mobile-first', 'accessibility', 'high-volume', 'low-digital-literacy', 'multilingual'],
  personas: [
    {
      name: 'Resident',
      description: 'A member of the public who accesses city services online, by phone, or in person. Often low digital literacy; primary consumer of public-facing services.',
      type: 'Citizen',
      status: 'published',
      tags: ['high-volume', 'mobile-first', 'low-digital-literacy'],
    },
    {
      name: 'Business Owner',
      description: 'Local business owner who needs permits, licenses, and inspections to operate. Interacts with multiple departments; time-sensitive needs.',
      type: 'External Partner',
      status: 'published',
      tags: ['mobile-first', 'high-volume'],
    },
    {
      name: 'City Council Member',
      description: 'Elected official who reviews budget proposals, approves ordinances, and needs high-level portfolio visibility without technical detail.',
      type: 'Elected Official',
      status: 'published',
      tags: [],
    },
    {
      name: 'IT Administrator',
      description: 'Manages infrastructure, user accounts, and system integrations. Primary internal technology contact for departments.',
      type: 'Staff',
      status: 'published',
      tags: ['accessibility'],
    },
    {
      name: 'Department Director',
      description: 'Senior agency leader accountable for service delivery and budget. Needs visibility into application portfolio and upcoming lifecycle risks.',
      type: 'Staff',
      status: 'published',
      tags: [],
    },
    {
      name: 'Grant Coordinator',
      description: 'Staff member who manages federal and state grant applications and reporting. Needs multilingual document support and records access.',
      type: 'Staff',
      status: 'draft',
      tags: ['multilingual', 'accessibility'],
    },
  ],
  capabilities: [
    {
      name: 'Online Permitting',
      description: 'Citizens and businesses submit, track, and pay for permit applications without visiting a counter.',
      domain: 'Community Development',
      behaviors: 'Submit a permit application online with required documents and fee payment\nTrack the status of an in-progress application\nReceive automated notifications when application status changes\nSchedule required inspections after permit approval\nDownload an approved permit',
      rules: 'Applications must be scoped to an organization\nOnly published capabilities are visible to external users\nFee collection must occur before an application is accepted for review',
      status: 'published',
      personas: ['Resident', 'Business Owner'],
    },
    {
      name: 'Business License Management',
      description: 'Issuance, renewal, and inspection scheduling for business operating licenses.',
      domain: 'Community Development',
      behaviors: 'Issue a new business operating license upon successful application and payment\nSend renewal reminders before license expiry\nSchedule and record compliance inspections\nRevoke or suspend licenses for non-compliance',
      rules: 'A license may only be issued after all required inspections are passed\nRenewal notices must be sent at least 60 days before expiry',
      status: 'published',
      personas: ['Business Owner'],
    },
    {
      name: 'HR Self-Service',
      description: 'Employee access to payroll, benefits elections, time-off requests, and HR forms.',
      domain: 'Legislative & Executive',
      behaviors: 'View current and historical pay stubs\nUpdate personal information such as address and emergency contacts\nRequest time off and view leave balances\nEnroll in or change benefits during open enrollment\nAccess and submit HR forms electronically',
      rules: 'Employees may only access their own payroll and personal records\nBenefits changes are only permitted during open enrollment windows\nLeave requests require manager approval before they are confirmed',
      status: 'published',
      personas: ['IT Administrator', 'Department Director', 'Grant Coordinator'],
    },
    {
      name: 'Budget Management',
      description: 'Departmental budget planning, tracking, and reporting for finance and elected oversight.',
      domain: 'Legislative & Executive',
      behaviors: 'Enter and submit departmental budget requests for the next fiscal year\nTrack actuals against approved budget lines in real time\nGenerate budget vs. actuals reports for elected and executive review\nFlag budget lines that are forecasting an overrun',
      rules: 'Budget submissions require director-level approval before forwarding to finance\nFinal budget figures may only be modified by Finance with Council authorization',
      status: 'published',
      personas: ['City Council Member', 'Department Director'],
    },
    {
      name: 'GIS Mapping',
      description: 'Authoritative geographic data for internal planning and public-facing map applications.',
      domain: 'Information Technology',
      behaviors: 'View and query authoritative city basemap layers\nSearch for addresses, parcels, and points of interest\nExport map views as images or spatial data files\nPublish curated public-facing map applications',
      rules: 'Authoritative spatial data layers are managed by GIS staff only\nPublic-facing maps may only include approved, published layers',
      status: 'published',
      personas: ['IT Administrator'],
    },
    {
      name: 'Cybersecurity Monitoring',
      description: 'Continuous threat detection, alerting, and incident response across city infrastructure.',
      domain: 'Information Technology',
      behaviors: 'Detect anomalous activity and generate alerts in real time\nCorrelate events across endpoints, network, and cloud workloads\nEscalate confirmed incidents to the security response team\nMaintain an audit trail of all security events and response actions',
      rules: 'All city endpoints must have the monitoring agent installed within 30 days of provisioning\nCritical alerts must be acknowledged within 15 minutes',
      status: 'published',
      personas: ['IT Administrator'],
    },
    {
      name: '311 Resident Services',
      description: 'Omnichannel intake (web, phone, app) for non-emergency service requests and status tracking.',
      domain: 'Public Safety',
      behaviors: 'Accept non-emergency service requests via web, mobile app, and phone\nRoute requests to the responsible department automatically\nSend status updates to the resident at each workflow stage\nAllow residents to track open requests in real time',
      rules: 'Emergency-level requests must be redirected to 911 and not accepted through 311\nService requests must be acknowledged within one business day of submission',
      status: 'published',
      personas: ['Resident'],
    },
    {
      name: 'Records Management',
      description: 'Retention, retrieval, and disposition of official city records including grant documentation.',
      domain: 'Administration & Operations',
      behaviors: 'Store and categorize official city records according to the retention schedule\nRetrieve records by keyword, date range, category, or custodian\nEnforce automated retention holds and disposition workflows\nGenerate chain-of-custody documentation for audits and legal requests',
      rules: 'Records must be classified and assigned a retention category at the time of ingestion\nDisposition of records requires supervisor approval and is logged permanently',
      status: 'draft',
      personas: ['Grant Coordinator', 'Department Director'],
    },
  ],
  applications: [
    {
      name: 'Accela',
      description: 'Permitting and licensing platform handling permits, business licenses, and inspections.',
      vendor: 'Accela',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['Online Permitting', 'Business License Management'],
    },
    {
      name: 'Workday',
      description: 'HR, payroll, and financial management platform for city employees.',
      vendor: 'Workday',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['HR Self-Service', 'Budget Management'],
    },
    {
      name: 'ArcGIS Online',
      description: 'Cloud GIS platform for authoritative map publishing and spatial analysis.',
      vendor: 'Esri',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['GIS Mapping'],
    },
    {
      name: 'CrowdStrike Falcon',
      description: 'Cloud-native endpoint detection and response platform for cybersecurity monitoring.',
      vendor: 'CrowdStrike',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      status: 'published',
      capabilities: ['Cybersecurity Monitoring'],
    },
    {
      name: 'OpenText Livelink',
      description: 'Legacy on-premise document and records management system. Sunset in progress.',
      vendor: 'OpenText',
      hostingModel: 'on-prem',
      lifecycleStatus: 'sunset',
      status: 'published',
      capabilities: ['Records Management'],
    },
  ],
  valueStreams: [
    {
      name: 'Obtain a Building Permit',
      description: 'A resident or business owner applies for and receives an approved building permit to begin construction or renovation.',

      valueItem: 'Approved permit enabling legal construction or renovation',
      status: 'published',
      stages: [
        { name: 'Submit application', description: 'Applicant completes permit application online, uploads supporting documents, and pays the filing fee.', capabilities: ['Online Permitting'] },
        { name: 'Staff review', description: 'Plan reviewers assess the application for code compliance and completeness.', capabilities: ['Online Permitting'] },
        { name: 'Inspection scheduling', description: 'Upon approval, applicant schedules required site inspections.', capabilities: ['Online Permitting'] },
        { name: 'Permit issuance', description: 'Final approved permit is issued and stored in the records system.', capabilities: ['Online Permitting', 'Records Management'] },
      ],
    },
    {
      name: 'Report a Non-Emergency Issue',
      description: 'A resident reports a non-emergency service issue (pothole, graffiti, broken streetlight) and tracks its resolution.',

      valueItem: 'Confirmed service request with status tracking',
      status: 'published',
      stages: [
        { name: 'Submit service request', description: 'Resident submits issue via web, mobile app, or phone.', capabilities: ['311 Resident Services'] },
        { name: 'Route to department', description: 'Request is categorized and routed to the responsible department.', capabilities: ['311 Resident Services'] },
        { name: 'Resolution and closure', description: 'Department resolves the issue and closes the request; resident notified.', capabilities: ['311 Resident Services'] },
      ],
    },
    {
      name: 'Onboard a New City Employee',
      description: 'A new employee is provisioned with system access, HR enrollment, and payroll setup.',

      valueItem: 'Fully provisioned employee ready for first day',
      status: 'draft',
      stages: [
        { name: 'HR enrollment', description: 'New hire completes benefits elections and direct deposit setup.', capabilities: ['HR Self-Service'] },
        { name: 'System access provisioning', description: 'IT provisions accounts, email, and role-based system access.', capabilities: ['Cybersecurity Monitoring'] },
        { name: 'Records creation', description: 'Employee file created in records management system.', capabilities: ['Records Management'] },
      ],
    },
  ],
  objectives: [
    {
      name: 'Reduce permit processing time by 40%',
      description: 'Streamline the end-to-end permitting process to reduce burden on residents and businesses.',
      successMetric: 'Average calendar days from submission to decision < 10',
      timeHorizon: 'FY2026',
      status: 'published',
      capabilities: ['Online Permitting', 'Business License Management'],
      valueStreams: ['Obtain a Building Permit'],
    },
    {
      name: 'Improve resident service request resolution rate',
      description: 'Increase the percentage of 311 service requests resolved within SLA targets.',
      successMetric: '90% of requests resolved within 5 business days',
      timeHorizon: 'FY2025',
      status: 'published',
      capabilities: ['311 Resident Services'],
      valueStreams: ['Report a Non-Emergency Issue'],
    },
    {
      name: 'Modernize records infrastructure',
      description: 'Replace the legacy on-premise records system with a cloud-native platform to reduce risk and improve access.',
      successMetric: 'OpenText Livelink decommissioned and all records migrated by Q4 FY2026',
      timeHorizon: '18 months',
      status: 'draft',
      capabilities: ['Records Management'],
      valueStreams: [],
    },
  ],
  initiatives: [
    {
      name: 'Accela Online Portal Upgrade',
      description: 'Upgrade Accela to the latest cloud release to enable self-service permit tracking, mobile submission, and automated status notifications.',
      status: 'active',
      startDate: 'Q1 FY2026',
      endDate: 'Q3 FY2026',
      capabilities: [
        { name: 'Online Permitting', impact: 'improve' },
        { name: 'Business License Management', impact: 'improve' },
      ],
      objectives: ['Reduce permit processing time by 40%'],
    },
    {
      name: 'Deploy 311 Mobile App',
      description: 'Launch a native mobile application for residents to submit and track service requests, with real-time status updates and push notifications.',
      status: 'proposed',
      startDate: 'Q2 FY2026',
      endDate: 'Q4 FY2026',
      capabilities: [{ name: '311 Resident Services', impact: 'improve' }],
      objectives: ['Improve resident service request resolution rate'],
    },
    {
      name: 'Migrate Records to Cloud Platform',
      description: 'Decommission OpenText Livelink and migrate all official city records to a cloud-native document management system.',
      status: 'proposed',
      startDate: 'Q1 FY2026',
      endDate: 'Q4 FY2026',
      capabilities: [
        { name: 'Records Management', impact: 'build' },
      ],
      objectives: ['Modernize records infrastructure'],
    },
  ],
  adrs: [
    {
      number: 'ADR-001',
      title: 'Adopt SaaS-first hosting for new application acquisitions',
      context: 'The city operates several aging on-premises systems that require dedicated infrastructure, patching, and specialist staff. CityWorks and OpenText Livelink are both approaching end of vendor support and represent significant maintenance risk.',
      decision: 'All new application acquisitions will default to SaaS hosting unless a documented security, compliance, or integration requirement mandates on-premises deployment. On-prem exceptions require Director-level approval and a documented exit plan.',
      consequences: 'Reduces infrastructure maintenance burden and improves vendor-managed update cadence. Increases reliance on internet connectivity and vendor SLAs. Requires updated procurement templates and vendor risk assessment processes.',
      status: 'accepted',
      supersededByNumber: null,
      capabilities: ['Online Permitting', 'Business License Management'],
      applications: ['Accela', 'CrowdStrike Falcon'],
      initiatives: ['Accela Online Portal Upgrade', 'Migrate Records to Cloud Platform'],
      objectives: ['Reduce permit processing time by 40%'],
    },
    {
      number: 'ADR-002',
      title: 'Use OAuth 2.0 / OIDC for all resident-facing authentication flows',
      context: 'Resident-facing services currently use fragmented authentication — some rely on legacy username/password forms, others on ad-hoc integrations. This creates security risk and poor user experience across service touchpoints.',
      decision: 'All resident-facing authentication flows will implement OAuth 2.0 with OIDC. A separate resident credential store will be maintained for services not requiring SSO. Staff authentication continues through the existing enterprise SSO pathway.',
      consequences: 'Improves security posture and enables consistent single sign-on for residents. Requires migration of legacy authentication implementations. Increases dependency on the identity provider for resident service availability.',
      status: 'proposed',
      supersededByNumber: null,
      capabilities: ['Online Permitting', '311 Resident Services'],
      applications: [],
      initiatives: ['Accela Online Portal Upgrade', 'Deploy 311 Mobile App'],
      objectives: ['Improve resident service request resolution rate'],
    },
    {
      number: 'ADR-003',
      title: 'Decommission OpenText Livelink in favour of cloud-native records platform',
      context: 'OpenText Livelink is an on-premises document and records management system that is sunset and no longer receiving vendor updates. It represents a compliance and operational risk as the city\'s official records repository.',
      decision: 'OpenText Livelink will be decommissioned by Q4 FY2026. All official city records will be migrated to a cloud-native records platform selected through a competitive procurement process. Migration includes validation of retention schedules and chain-of-custody documentation.',
      consequences: 'Eliminates a critical infrastructure risk and brings records management into compliance with updated retention policies. Migration carries data integrity risk that must be mitigated through phased migration and parallel operation during transition.',
      status: 'accepted',
      supersededByNumber: null,
      capabilities: ['Records Management'],
      applications: ['OpenText Livelink'],
      initiatives: ['Migrate Records to Cloud Platform'],
      objectives: ['Modernize records infrastructure'],
    },
    {
      number: 'ADR-004',
      title: 'Require on-premises deployment for all financial systems',
      context: 'An earlier city security policy required financial systems to be deployed on-premises to meet data residency requirements. This was documented as an architectural constraint in the prior technology strategy.',
      decision: 'All financial management and budget systems must be deployed on-premises within city-owned infrastructure.',
      consequences: 'Provided data residency assurance under the prior policy but created significant infrastructure and maintenance overhead. Superseded by the updated cloud security posture and SaaS-first direction established in ADR-001.',
      status: 'superseded',
      supersededByNumber: 'ADR-001',
      capabilities: ['Budget Management'],
      applications: [],
      initiatives: [],
      objectives: [],
    },
  ],
  principles: [
    {
      name: 'SaaS First',
      description: 'Default to vendor-hosted SaaS for all new application acquisitions unless a documented constraint requires otherwise.',
      title: 'SaaS first for new application acquisitions',
      rationale: 'On-premises infrastructure creates disproportionate maintenance overhead for a city IT team. Vendor-managed SaaS keeps the city on current releases and shifts patching and availability responsibility to the vendor.',
      implications: 'All new application procurements default to SaaS. On-premises deployment requires Director-level approval, a documented technical justification, and a documented exit plan. Existing on-premises systems are assessed for migration at each contract renewal.',
      status: 'published',
      adrs: ['ADR-001', 'ADR-003'],
      capabilities: ['Online Permitting', 'Business License Management', 'Records Management'],
    },
    {
      name: 'Open Standards Auth',
      description: 'All resident-facing authentication flows use OAuth 2.0 with OIDC for a consistent, auditable identity layer.',
      title: 'Open standards for resident-facing authentication',
      rationale: 'Fragmented authentication across resident-facing services creates inconsistent security posture and poor user experience. Standardising on OAuth 2.0 / OIDC provides a well-understood, auditable identity layer.',
      implications: 'New resident-facing services must implement OAuth 2.0 with OIDC. Legacy authentication implementations are migrated as part of system upgrades. Staff authentication continues through the existing enterprise SSO pathway.',
      status: 'published',
      adrs: ['ADR-002'],
      capabilities: ['Online Permitting', '311 Resident Services'],
    },
    {
      name: 'Records Chain of Custody',
      description: 'System migrations must preserve metadata, retention schedules, and audit trails for all official city records.',
      title: 'Preserve records chain of custody through system transitions',
      rationale: 'Official city records carry legal and compliance obligations. Any migration between records systems must preserve metadata, retention schedules, and audit trails to satisfy public records law.',
      implications: 'Records migrations require a validated data mapping exercise and parallel operation of source and target systems until sign-off. Disposition of records from decommissioned systems requires legal review.',
      status: 'draft',
      adrs: ['ADR-003'],
      capabilities: ['Records Management'],
    },
  ],
  glossary: [
    {
      term: 'Capability',
      definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
      definitionSource: 'EasyEA',
      domain: 'Enterprise Architecture',
      notes: 'Capabilities are technology-agnostic. The same capability can be supported by different applications over time.',
      status: 'published',
      sources: [
        {
          name: 'TOGAF 10',
          url: 'https://pubs.opengroup.org/togaf-standard/adm-techniques/chap08.html',
          definition: 'A business capability is an expression of what a business does and can do. Business capabilities represent the fundamental building blocks of an organization.',
        },
        {
          name: 'EasyEA',
          definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
        },
      ],
    },
    {
      term: 'Persona',
      definition: 'A named, representative user or stakeholder type that interacts with city services. Personas capture goals, context, and pain points to guide service and system design.',
      definitionSource: 'EasyEA',
      domain: 'Enterprise Architecture',
      status: 'published',
      sources: [
        {
          name: 'EasyEA',
          definition: 'A named, representative user or stakeholder type that interacts with city services. Personas capture goals, context, and pain points to guide service and system design.',
        },
        {
          name: 'Nielsen Norman Group',
          url: 'https://www.nngroup.com/articles/persona/',
          definition: 'Personas are fictional characters created to represent the different user types that might use a site, brand, or product in a similar way.',
        },
      ],
    },
    {
      term: 'Architecture Decision Record (ADR)',
      definition: 'A documented record of a significant architecture or technology decision — what was decided, why, and what the consequences are.',
      domain: 'Enterprise Architecture',
      notes: 'ADRs are immutable by convention. Superseded decisions are marked as such and linked to the newer decision, preserving the history.',
      status: 'published',
      sources: [
        {
          name: 'Architectural Decision Records (adr.github.io)',
          url: 'https://adr.github.io/',
          definition: 'An Architectural Decision (AD) is a justified software design choice that addresses a functional or non-functional requirement that is architecturally significant.',
        },
      ],
    },
    {
      term: 'Value Stream',
      definition: 'The sequence of activities that deliver a specific outcome of value to a stakeholder. Value streams cross departmental boundaries and end with a concrete result for the recipient.',
      definitionSource: 'TOGAF 10',
      domain: 'Enterprise Architecture',
      status: 'published',
      sources: [
        {
          name: 'TOGAF 10',
          url: 'https://pubs.opengroup.org/togaf-standard/business-architecture/chap05.html',
          definition: 'A value stream is an end-to-end collection of value-adding activities that create an overall result for a customer, stakeholder, or end user.',
        },
        {
          name: 'Lean Enterprise Institute',
          url: 'https://www.lean.org/lexicon-terms/value-stream/',
          definition: 'All the actions (both value-creating and non-value-creating) currently required to bring a product through the main flows essential to every product.',
        },
      ],
    },
    {
      term: 'SaaS (Software as a Service)',
      definition: 'A software delivery model in which the vendor hosts and operates the application on behalf of the customer. The customer accesses it over the internet and pays on a subscription basis.',
      definitionSource: 'NIST SP 800-145',
      domain: 'Information Technology',
      status: 'published',
      sources: [
        {
          name: 'NIST SP 800-145',
          url: 'https://csrc.nist.gov/publications/detail/sp/800-145/final',
          definition: 'The capability provided to the consumer is to use the provider\'s applications running on a cloud infrastructure. The applications are accessible from various client devices through either a thin client interface, such as a web browser.',
        },
      ],
    },
    {
      term: 'OAuth 2.0',
      definition: 'An open authorization framework that enables applications to obtain limited access to user accounts on another service. Used as the foundation for modern single sign-on and API authorization.',
      definitionSource: 'RFC 6749',
      domain: 'Information Technology',
      notes: 'Often paired with OIDC (OpenID Connect) for authentication. OAuth 2.0 alone covers authorization; OIDC adds identity.',
      status: 'published',
      sources: [
        {
          name: 'RFC 6749',
          url: 'https://datatracker.ietf.org/doc/html/rfc6749',
          definition: 'The OAuth 2.0 authorization framework enables a third-party application to obtain limited access to an HTTP service, either on behalf of a resource owner by orchestrating an approval interaction between the resource owner and the HTTP service, or by allowing the third-party application to obtain access on its own behalf.',
        },
      ],
    },
    {
      term: 'OIDC (OpenID Connect)',
      definition: 'An identity layer built on top of OAuth 2.0 that allows applications to verify the identity of a user based on authentication performed by an authorization server.',
      definitionSource: 'OpenID Foundation',
      domain: 'Information Technology',
      status: 'published',
      sources: [
        {
          name: 'OpenID Foundation',
          url: 'https://openid.net/connect/',
          definition: 'OpenID Connect 1.0 is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server.',
        },
      ],
    },
    {
      term: 'Lifecycle Status',
      definition: 'The stage of a system or application in its operational life: planned, active, sunset, or decommissioned. Used to assess portfolio health and plan transitions.',
      domain: 'Portfolio Management',
      status: 'published',
    },
    {
      term: 'Retention Schedule',
      definition: 'A documented policy that specifies how long different categories of records must be kept before they may be destroyed or archived.',
      domain: 'Records Management',
      notes: 'Retention schedules are typically set by state law and must be followed during any records system migration.',
      status: 'published',
    },
    {
      term: 'Sunset',
      definition: 'The status of a system that is still operational but is no longer receiving new investment and is scheduled for decommissioning. Sunset systems represent known technical risk.',
      domain: 'Portfolio Management',
      status: 'published',
    },
    {
      term: 'Data Residency',
      definition: 'The requirement that data be stored and processed within a specific geographic or jurisdictional boundary. Often a constraint in public sector procurement.',
      domain: 'Information Technology',
      status: 'published',
    },
    {
      term: 'Service Level Agreement (SLA)',
      definition: 'A contract between a service provider and customer that defines the expected level of service, including availability, response times, and remedies for non-compliance.',
      domain: 'Portfolio Management',
      status: 'published',
    },
  ],
  services: [
    {
      name: 'Permit Application Service',
      description: 'Online service for residents and businesses to submit, pay for, and track building permit applications without visiting a counter.',
      serviceOwner: 'Community Development',
      channels: ['online'],
      status: 'published',
      personas: ['Resident', 'Business Owner'],
      capabilities: ['Online Permitting'],
      applications: ['Accela'],
      valueStreams: ['Obtain a Building Permit'],
    },
    {
      name: 'Business License Service',
      description: 'Service for local businesses to apply for, renew, and manage operating licenses — available online and at the Community Development counter.',
      serviceOwner: 'Community Development',
      channels: ['online', 'in-person'],
      status: 'published',
      personas: ['Business Owner'],
      capabilities: ['Business License Management'],
      applications: ['Accela'],
      valueStreams: [],
    },
    {
      name: '311 Resident Request Service',
      description: 'Omnichannel service for residents to report non-emergency issues such as potholes, graffiti, and broken streetlights — available online, by phone, and via mobile app.',
      serviceOwner: 'City Manager Office',
      channels: ['online', 'phone', 'mobile'],
      status: 'published',
      personas: ['Resident'],
      capabilities: ['311 Resident Services'],
      applications: [],
      valueStreams: ['Report a Non-Emergency Issue'],
    },
    {
      name: 'Employee Self-Service Portal',
      description: 'Internal portal for city employees to access payroll, benefits, leave balances, and HR forms without contacting HR directly.',
      serviceOwner: 'Human Resources',
      channels: ['online'],
      status: 'published',
      personas: ['IT Administrator', 'Department Director', 'Grant Coordinator'],
      capabilities: ['HR Self-Service'],
      applications: ['Workday'],
      valueStreams: ['Onboard a New City Employee'],
    },
    {
      name: 'Public Records Request Service',
      description: 'Service for members of the public and staff to submit and track requests for official city records under public records law.',
      serviceOwner: 'City Clerk',
      channels: ['online', 'in-person'],
      status: 'draft',
      personas: ['Resident'],
      capabilities: ['Records Management'],
      applications: ['OpenText Livelink'],
      valueStreams: [],
    },
  ],
}

export const TEST_DATASETS: Record<string, Dataset> = {
  blank: DATASET_BLANK,
  starter: DATASET_STARTER,
  'city-demo': DATASET_CITY_DEMO,
}
