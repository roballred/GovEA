// Synthetic data for development and testing.
// Provides three pre-built users (one per role) and a minimal EA portfolio.

export const DEV_USERS = [
  { name: 'Alice Admin', email: 'alice@govea.dev', role: 'admin' as const },
  { name: 'Carol Contributor', email: 'carol@govea.dev', role: 'contributor' as const },
  { name: 'Victor Viewer', email: 'victor@govea.dev', role: 'viewer' as const },
]

export const DEV_PERSONAS = [
  { name: 'Resident', description: 'A member of the public interacting with city services', type: 'citizen' },
  { name: 'IT Staff', description: 'Internal technology team member', type: 'staff' },
  { name: 'Department Director', description: 'Senior agency leader responsible for a service area', type: 'staff' },
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
