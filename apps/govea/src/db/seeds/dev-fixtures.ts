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
  { name: 'Resident', description: 'A member of the public interacting with city services', type: 'Citizen' },
  { name: 'IT Staff', description: 'Internal technology team member', type: 'Staff' },
  { name: 'Department Director', description: 'Senior agency leader responsible for a service area', type: 'Staff' },
]

export const DEV_CAPABILITIES = [
  { name: 'Online Permitting', description: 'Submit and track permit applications online', domain: 'Community Development' },
  { name: 'HR Self-Service', description: 'Employee access to HR functions', domain: 'Legislative & Executive' },
  { name: 'GIS Mapping', description: 'Geographic information services for staff and public', domain: 'Information Technology' },
]

export const DEV_APPLICATIONS = [
  { name: 'Accela', description: 'Permitting and licensing platform', vendor: 'Accela', hostingModel: 'saas' },
  { name: 'Workday', description: 'HR and payroll system', vendor: 'Workday', hostingModel: 'saas' },
  { name: 'ArcGIS Online', description: 'Cloud GIS platform', vendor: 'Esri', hostingModel: 'saas' },
]
