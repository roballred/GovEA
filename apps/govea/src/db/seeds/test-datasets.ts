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

export type Dataset = {
  label: string
  description: string
  personaTypes: string[]
  tags: string[]
  personas: DatasetPersona[]
  capabilities: DatasetCapability[]
  applications: DatasetApplication[]
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
}

export const TEST_DATASETS: Record<string, Dataset> = {
  blank: DATASET_BLANK,
  starter: DATASET_STARTER,
  'city-demo': DATASET_CITY_DEMO,
}
