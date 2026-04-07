// Synthetic data for development and testing.
// All dev users use the password 'dev-password' (hashed at seed time).
// Dev login shortcuts on the login page bypass password entry in development.

export const DEV_USERS = [
  { name: 'Alice Admin', email: 'alice@govea.dev', role: 'admin' as const },
  { name: 'Carol Contributor', email: 'carol@govea.dev', role: 'contributor' as const },
  { name: 'Victor Viewer', email: 'victor@govea.dev', role: 'viewer' as const },
]

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

export const DEV_PERSONAS = [
  {
    name: 'Resident',
    description: 'A member of the public interacting with city services online or in person.',
    type: 'Citizen',
    status: 'published' as const,
  },
  {
    name: 'IT Staff',
    description: 'Internal technology team member responsible for maintaining and supporting city systems.',
    type: 'Staff',
    status: 'published' as const,
  },
  {
    name: 'Department Director',
    description: 'Senior agency leader accountable for a service area and its technology investment.',
    type: 'Staff',
    status: 'published' as const,
  },
  {
    name: 'Field Inspector',
    description: 'City employee conducting inspections in the field, often on a mobile device.',
    type: 'Staff',
    status: 'draft' as const,
  },
]

// Each capability maps to one or more persona names from DEV_PERSONAS
export const DEV_CAPABILITIES = [
  {
    name: 'Online Permitting',
    description: 'Residents submit, pay for, and track permit applications without visiting a counter.',
    domain: 'Community Development',
    status: 'published' as const,
    personas: ['Resident', 'Field Inspector'],
  },
  {
    name: 'HR Self-Service',
    description: 'Employees view pay stubs, request leave, and update personal information.',
    domain: 'Legislative & Executive',
    status: 'published' as const,
    personas: ['IT Staff'],
  },
  {
    name: 'GIS Mapping',
    description: 'Geographic information services supporting both public-facing maps and internal analysis.',
    domain: 'Information Technology',
    status: 'published' as const,
    personas: ['IT Staff', 'Field Inspector'],
  },
  {
    name: 'Budget Reporting',
    description: 'Directors access real-time budget vs. actuals and forecast dashboards.',
    domain: 'Finance & Budget',
    status: 'published' as const,
    personas: ['Department Director'],
  },
  {
    name: 'Service Request Management',
    description: 'Residents submit and track non-emergency service requests (potholes, graffiti, etc.).',
    domain: 'Public Works',
    status: 'draft' as const,
    personas: ['Resident'],
  },
]

// Each application maps to one or more capability names from DEV_CAPABILITIES
export const DEV_APPLICATIONS = [
  {
    name: 'Accela',
    description: 'Permitting and licensing platform used by Community Development and Code Enforcement.',
    vendor: 'Accela',
    hostingModel: 'saas',
    status: 'published' as const,
    capabilities: ['Online Permitting'],
  },
  {
    name: 'Workday',
    description: 'HR and payroll system used enterprise-wide.',
    vendor: 'Workday',
    hostingModel: 'saas',
    status: 'published' as const,
    capabilities: ['HR Self-Service'],
  },
  {
    name: 'ArcGIS Online',
    description: 'Cloud GIS platform for mapping, spatial analysis, and field data collection.',
    vendor: 'Esri',
    hostingModel: 'saas',
    status: 'published' as const,
    capabilities: ['GIS Mapping', 'Online Permitting'],
  },
  {
    name: 'OpenGov',
    description: 'Budget transparency and performance management platform.',
    vendor: 'OpenGov',
    hostingModel: 'saas',
    status: 'published' as const,
    capabilities: ['Budget Reporting'],
  },
  {
    name: 'CityWorks',
    description: 'Work order and asset management system for Public Works.',
    vendor: 'Trimble',
    hostingModel: 'on-prem',
    status: 'draft' as const,
    capabilities: ['Service Request Management', 'GIS Mapping'],
  },
]
