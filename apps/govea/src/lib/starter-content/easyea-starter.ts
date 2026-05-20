/**
 * EasyEA Starter — the smallest credible city's EA content (#587).
 *
 * Intent: give a brand-new admin something to demo in week 2 without
 * forcing them through the blank-canvas problem the Early-Maturity EA
 * Practice Lead persona file calls out as the most acute setup pain.
 *
 * Every item ends with the marker `STARTER_CONTENT_MARKER` in its
 * description so the admin (and future archive tooling) can identify
 * starter content unambiguously even if names or fields drift. The
 * marker is plain language so it reads naturally on the detail page.
 *
 * The pack is **idempotent**: applying it twice doesn't create
 * duplicates. The upsert key for every entity type is `name` (or
 * `title` for ADRs) within the caller's org.
 */

export const STARTER_CONTENT_MARKER = 'Example starter content — replace or delete.'

function markStarter(description: string): string {
  return `${description}\n\n${STARTER_CONTENT_MARKER}`
}

export type StarterPersona = {
  name: string
  description: string
  type: string
}

export type StarterCapability = {
  name: string
  description: string
  domain: string
  behaviors: string
  rules: string
  capabilityType: 'business' | 'technical'
  personas: string[] // names matching StarterPersona.name
}

export type StarterApplication = {
  name: string
  description: string
  vendor: string
  hostingModel: 'saas' | 'on-prem' | 'hybrid'
  lifecycleStatus: 'active' | 'planned' | 'sunset' | 'decommissioned'
  capabilities: string[] // names matching StarterCapability.name
}

export type StarterObjective = {
  name: string
  description: string
  successMetric: string
  timeHorizon: string
  capabilities: string[]
}

export type StarterADR = {
  number: string
  title: string
  context: string
  decision: string
  consequences: string
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  capabilities: string[]
}

export type StarterPack = {
  packName: string
  personas: StarterPersona[]
  capabilities: StarterCapability[]
  applications: StarterApplication[]
  objectives: StarterObjective[]
  adrs: StarterADR[]
}

/**
 * For UI use — list of available starter packs. Exposed here (not from the
 * server action module) because Next.js `'use server'` files can only export
 * async functions; importing constants from them crashes at runtime.
 */
export const AVAILABLE_STARTER_PACKS = [
  {
    name: 'easyea-starter',
    label: 'EasyEA Starter',
    summary: 'A small canonical city: 4 personas, 6 capabilities, 3 applications, 1 strategic objective, 2 ADRs. Tagged with a plain-language marker so it never gets confused with your own content.',
    counts: {
      personas: 4,
      capabilities: 6,
      applications: 3,
      objectives: 1,
      adrs: 2,
    },
  },
] as const

export const EASYEA_STARTER: StarterPack = {
  packName: 'easyea-starter',

  personas: [
    {
      name: 'Resident',
      type: 'Citizen',
      description: markStarter('A member of the public interacting with city services online or in person. Primary user of public-facing digital services.'),
    },
    {
      name: 'Small Business Owner',
      type: 'External Partner',
      description: markStarter('Local business operator interacting with the city for permits, licenses, and inspections. High value, time-sensitive needs.'),
    },
    {
      name: 'Department Director',
      type: 'Staff',
      description: markStarter('Senior agency leader making decisions on technology investment, modernization sequencing, and service delivery improvements.'),
    },
    {
      name: 'IT Staff',
      type: 'Staff',
      description: markStarter('Internal technical staff responsible for operating, maintaining, and integrating the technology platforms supporting city services.'),
    },
  ],

  capabilities: [
    {
      name: 'Online Permitting',
      domain: 'Community Development',
      capabilityType: 'business',
      description: markStarter('Residents and businesses submit, pay for, and track permit applications without visiting a counter.'),
      behaviors: 'Submit a permit application online with required documents and fee payment\nTrack the status of an in-progress application\nReceive automated notifications when application status changes',
      rules: 'Applications must be scoped to an organization\nFee collection must occur before an application is accepted for review',
      personas: ['Resident', 'Small Business Owner'],
    },
    {
      name: 'Business License Management',
      domain: 'Community Development',
      capabilityType: 'business',
      description: markStarter('Issue, renew, and revoke business licenses. Notify owners of expiry and compliance requirements.'),
      behaviors: 'Issue a new business operating license upon successful application and payment\nSend renewal reminders before license expiry',
      rules: 'A license may only be issued after all required inspections are passed\nRenewal notices must be sent at least 60 days before expiry',
      personas: ['Small Business Owner'],
    },
    {
      name: 'Service Request Management',
      domain: 'Infrastructure & Public Works',
      capabilityType: 'business',
      description: markStarter('Residents submit and track non-emergency service requests such as pothole repairs, graffiti removal, and missed pickups.'),
      behaviors: 'Accept non-emergency service requests via web and mobile\nRoute requests to the responsible department automatically\nSend status updates at each workflow stage',
      rules: 'Emergency-level requests must be redirected and not accepted through this channel\nService requests must be acknowledged within one business day of submission',
      personas: ['Resident'],
    },
    {
      name: 'Budget Reporting',
      domain: 'Finance & Revenue',
      capabilityType: 'business',
      description: markStarter('Directors and elected officials access real-time budget vs. actuals and forecast dashboards.'),
      behaviors: 'View budget vs. actuals comparisons by department and fund\nGenerate forecast dashboards for the current fiscal year',
      rules: 'Budget data is read-only in this capability — modifications are made in the source financial system',
      personas: ['Department Director'],
    },
    {
      name: 'Digital Identity & Authentication',
      domain: 'Information Technology',
      capabilityType: 'technical',
      description: markStarter('Unified login for residents and staff across city digital services. Supports local accounts and optional SSO.'),
      behaviors: 'Authenticate residents and staff via local credentials or SSO\nIssue and refresh short-lived access tokens\nEnforce multi-factor authentication for privileged roles',
      rules: 'All resident-facing authentication flows must use OAuth 2.0 with OIDC\nTokens must expire within 8 hours for staff and 24 hours for residents',
      personas: ['Resident', 'IT Staff'],
    },
    {
      name: 'HR Self-Service',
      domain: 'Administrative Services',
      capabilityType: 'business',
      description: markStarter('Employees view pay stubs, request leave, update personal information, and access benefits.'),
      behaviors: 'View current and historical pay stubs\nRequest time off and view leave balances',
      rules: 'Employees may only access their own payroll and personal records',
      personas: ['IT Staff'],
    },
  ],

  applications: [
    {
      name: 'Example Permitting Platform',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      description: markStarter('Cloud permitting and licensing platform used by Community Development and Code Enforcement.'),
      capabilities: ['Online Permitting', 'Business License Management'],
    },
    {
      name: 'Example Identity Provider',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      description: markStarter('Cloud identity provider used for staff SSO. Residents use a separate local credential store.'),
      capabilities: ['Digital Identity & Authentication'],
    },
    {
      name: 'Example Budget System',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      description: markStarter('Modern cloud-based budgeting and financial reporting platform.'),
      capabilities: ['Budget Reporting'],
    },
  ],

  objectives: [
    {
      name: 'Improve Digital Service Delivery',
      timeHorizon: 'FY2026',
      description: markStarter('Make city services faster and easier to access online, reducing in-person visits and processing times.'),
      successMetric: '80% of permit applications submitted online by end of FY2026',
      capabilities: ['Online Permitting', 'Service Request Management', 'Digital Identity & Authentication'],
    },
  ],

  adrs: [
    {
      number: 'ADR-001',
      title: 'Adopt SaaS-first hosting for new application acquisitions',
      status: 'accepted',
      context: markStarter('Most government agencies of similar size cannot sustain a deep on-premises operations team. New application acquisitions favour SaaS where the data classification permits.'),
      decision: 'All new application acquisitions evaluate SaaS hosting first. On-premises is the fallback when data residency, integration, or regulatory constraints rule SaaS out.',
      consequences: 'Reduces operational burden on internal IT. Increases dependence on vendor SLAs and creates new procurement / contract review obligations.',
      capabilities: ['Digital Identity & Authentication', 'Online Permitting'],
    },
    {
      number: 'ADR-002',
      title: 'Use OAuth 2.0 / OIDC for all resident-facing authentication flows',
      status: 'accepted',
      context: markStarter('Fragmented authentication across citizen-facing services creates security risk and a poor user experience.'),
      decision: 'All resident-facing authentication flows implement OAuth 2.0 with OIDC. Staff use a designated cloud identity provider; residents have a separate credential store.',
      consequences: 'Improves security posture and enables single sign-on for residents. Increases dependency on the identity provider\'s availability.',
      capabilities: ['Digital Identity & Authentication'],
    },
  ],
}
