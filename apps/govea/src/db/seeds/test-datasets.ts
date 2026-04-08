// Test and demo dataset presets.
// Used by the dev toolbar to reset org content to a known state.
// Each dataset defines personas, capabilities, applications, tags,
// persona types, and the linkages between them.

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
  status: 'draft' | 'published' | 'archived'
  personas: string[] // persona names
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

export type Dataset = {
  label: string
  description: string
  personaTypes: string[]
  tags: string[]
  personas: DatasetPersona[]
  capabilities: DatasetCapability[]
  applications: DatasetApplication[]
  valueStreams: DatasetValueStream[]
  objectives: DatasetObjective[]
  initiatives: DatasetInitiative[]
}

// ── Dataset 1: Blank ──────────────────────────────────────────────────────────
// Empty content — tests empty states and creation flows.
// Restores default persona types and tags.

export const DATASET_BLANK: Dataset = {
  label: 'Blank',
  description: 'Empty — default types and tags only',
  personaTypes: ['Citizen', 'Staff', 'Elected Official', 'External Partner'],
  tags: ['mobile-first', 'accessibility', 'high-volume', 'low-digital-literacy', 'multilingual'],
  personas: [],
  capabilities: [],
  applications: [],
  valueStreams: [],
  objectives: [],
  initiatives: [],
}

// ── Dataset 2: Starter ────────────────────────────────────────────────────────
// Small city baseline — 3 personas, 3 capabilities, 3 applications.
// Good for testing basic CRUD and linkage flows.

export const DATASET_STARTER: Dataset = {
  label: 'Starter',
  description: '3 personas · 3 capabilities · 3 applications',
  personaTypes: ['Citizen', 'Staff', 'Elected Official', 'External Partner'],
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
      status: 'published',
      personas: ['Resident'],
    },
    {
      name: 'HR Self-Service',
      description: 'Employee access to payroll, benefits, and HR forms without HR staff involvement.',
      domain: 'Legislative & Executive',
      status: 'published',
      personas: ['IT Staff', 'Department Director'],
    },
    {
      name: 'GIS Mapping',
      description: 'Geographic information services for staff planning and public-facing maps.',
      domain: 'Information Technology',
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
}

// ── Dataset 3: City Demo ──────────────────────────────────────────────────────
// Full-featured demo — 6 personas, 8 capabilities, 5 applications.
// Shows off type badges, tags, filters, multi-select, lifecycle states.

export const DATASET_CITY_DEMO: Dataset = {
  label: 'City Demo',
  description: '6 personas · 8 capabilities · 5 applications',
  personaTypes: ['Citizen', 'Staff', 'Elected Official', 'External Partner'],
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
      status: 'published',
      personas: ['Resident', 'Business Owner'],
    },
    {
      name: 'Business License Management',
      description: 'Issuance, renewal, and inspection scheduling for business operating licenses.',
      domain: 'Community Development',
      status: 'published',
      personas: ['Business Owner'],
    },
    {
      name: 'HR Self-Service',
      description: 'Employee access to payroll, benefits elections, time-off requests, and HR forms.',
      domain: 'Legislative & Executive',
      status: 'published',
      personas: ['IT Administrator', 'Department Director', 'Grant Coordinator'],
    },
    {
      name: 'Budget Management',
      description: 'Departmental budget planning, tracking, and reporting for finance and elected oversight.',
      domain: 'Legislative & Executive',
      status: 'published',
      personas: ['City Council Member', 'Department Director'],
    },
    {
      name: 'GIS Mapping',
      description: 'Authoritative geographic data for internal planning and public-facing map applications.',
      domain: 'Information Technology',
      status: 'published',
      personas: ['IT Administrator'],
    },
    {
      name: 'Cybersecurity Monitoring',
      description: 'Continuous threat detection, alerting, and incident response across city infrastructure.',
      domain: 'Information Technology',
      status: 'published',
      personas: ['IT Administrator'],
    },
    {
      name: '311 Resident Services',
      description: 'Omnichannel intake (web, phone, app) for non-emergency service requests and status tracking.',
      domain: 'Public Safety',
      status: 'published',
      personas: ['Resident'],
    },
    {
      name: 'Records Management',
      description: 'Retention, retrieval, and disposition of official city records including grant documentation.',
      domain: 'Administration & Operations',
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
}

export const TEST_DATASETS: Record<string, Dataset> = {
  blank: DATASET_BLANK,
  starter: DATASET_STARTER,
  'city-demo': DATASET_CITY_DEMO,
}
