/**
 * TOGAF 10 Starter — a small, credible, framework-aligned example repository
 * (#749). Replaces the former EasyEA Starter (#587) as the single starter pack.
 *
 * Intent: give a TOGAF-aware evaluator an immediate, recognizable starting
 * point — Architecture Domains, ADM Phase classification, principles, glossary,
 * and report-ready sample content — without forcing TOGAF as a mandatory
 * workflow. GovEA stays EasyEA-first and plain-language for ordinary use; this
 * pack just demonstrates the framework-alignment surface.
 *
 * This pack is **recipe-backed**: applying it first installs the TOGAF recipe
 * (`lib/recipes/togaf.ts`) — the Architecture Domain and ADM Phase taxonomy
 * types, their terms, entity bindings, glossary, and principles — then lays
 * down this sample repository and tags it to those taxonomy terms by stable
 * slug. There is no second hard-coded TOGAF path (#749 acceptance).
 *
 * The taxonomy slugs referenced below (`togafDomains`, `admPhase`) must match
 * the term slugs in `lib/recipes/togaf.ts`. They are the recipe's stable keys;
 * the apply action resolves them to term IDs after the recipe install.
 *
 * Every item ends with the marker `STARTER_CONTENT_MARKER` in its description so
 * the admin (and future archive tooling) can identify starter content even if
 * names or fields drift. The pack is **idempotent**: applying it twice doesn't
 * create duplicates (upsert key is `name`, or `title` for ADRs).
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
  /** TOGAF Architecture Domain term slugs (multi). Tagged after recipe install. */
  togafDomains: string[]
  /** TOGAF ADM Phase term slug (single). Tagged after recipe install. */
  admPhase?: string
}

export type StarterApplication = {
  name: string
  description: string
  vendor: string
  hostingModel: 'saas' | 'on-prem' | 'hybrid'
  lifecycleStatus: 'active' | 'planned' | 'sunset' | 'decommissioned'
  capabilities: string[] // names matching StarterCapability.name
  /** TOGAF Architecture Domain term slugs (multi). Tagged after recipe install. */
  togafDomains: string[]
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

export type StarterInitiative = {
  name: string
  description: string
  status: 'proposed' | 'active' | 'on-hold' | 'complete' | 'cancelled'
  startDate: string
  endDate: string
  capabilities: string[]
  /** TOGAF ADM Phase term slug (single). Tagged after recipe install. */
  admPhase?: string
}

export type StarterPack = {
  packName: string
  /** Recipe to install before laying down content (taxonomy/glossary/principles). */
  recipeSlug: string
  personas: StarterPersona[]
  capabilities: StarterCapability[]
  applications: StarterApplication[]
  objectives: StarterObjective[]
  adrs: StarterADR[]
  initiatives: StarterInitiative[]
}

/**
 * For UI use — list of available starter packs. Exposed here (not from the
 * server action module) because Next.js `'use server'` files can only export
 * async functions; importing constants from them crashes at runtime.
 */
export const AVAILABLE_STARTER_PACKS = [
  {
    name: 'togaf-starter',
    label: 'TOGAF 10 Starter',
    summary:
      'A small, framework-aligned example agency for TOGAF-aware demos. Installs the TOGAF (Standard, 10th Edition) taxonomy — Architecture Domains and ADM Phases — plus glossary and principles, then a coherent sample repository tagged to those domains and phases. Classification only: no formal TOGAF compliance is implied. Every record carries a plain-language marker so it never gets confused with your own content.',
    counts: {
      personas: 4,
      capabilities: 6,
      applications: 4,
      objectives: 2,
      adrs: 2,
      initiatives: 3,
    },
  },
] as const

export const TOGAF_STARTER: StarterPack = {
  packName: 'togaf-starter',
  recipeSlug: 'togaf',

  personas: [
    {
      name: 'Resident',
      type: 'Citizen',
      description: markStarter('A member of the public interacting with agency services online or in person. Primary user of public-facing digital services.'),
    },
    {
      name: 'Department Director',
      type: 'Staff',
      description: markStarter('Senior agency leader making decisions on technology investment, modernization sequencing, and service delivery. A stakeholder in the TOGAF Architecture Vision.'),
    },
    {
      name: 'Enterprise Architect',
      type: 'Staff',
      description: markStarter('Owns the architecture practice — maintains the architecture repository, governs principles, and classifies work across TOGAF domains and ADM phases.'),
    },
    {
      name: 'IT Operations Staff',
      type: 'Staff',
      description: markStarter('Internal technical staff who operate, maintain, and integrate the platforms supporting agency services across the technology architecture.'),
    },
  ],

  capabilities: [
    {
      name: 'Citizen Service Management',
      domain: 'Citizen Services',
      capabilityType: 'business',
      togafDomains: ['business-architecture'],
      admPhase: 'adm-b-business-architecture',
      description: markStarter('Provide, route, and track the public-facing services an agency delivers to residents across channels.'),
      behaviors: 'Accept service requests across web, phone, and in person\nRoute each request to the responsible department\nReport on service volumes and resolution times',
      rules: 'Every service request must be associated with a responsible department\nResidents must be able to track an in-progress request',
      personas: ['Resident', 'Department Director'],
    },
    {
      name: 'Permitting & Licensing',
      domain: 'Community Development',
      capabilityType: 'business',
      togafDomains: ['business-architecture'],
      admPhase: 'adm-b-business-architecture',
      description: markStarter('Residents and businesses apply for, pay for, and track permits and licenses without visiting a counter.'),
      behaviors: 'Submit a permit or license application online with required documents and fees\nTrack application status and receive change notifications',
      rules: 'Fees must be collected before an application is accepted for review\nA license may only be issued after all required inspections pass',
      personas: ['Resident'],
    },
    {
      name: 'Case Management',
      domain: 'Operations',
      capabilityType: 'business',
      togafDomains: ['application-architecture'],
      admPhase: 'adm-c-information-systems-architectures',
      description: markStarter('Manage the lifecycle of work items — intake, assignment, escalation, and closure — across agency programs.'),
      behaviors: 'Open, assign, and close cases against defined service levels\nEscalate overdue cases to a supervisor',
      rules: 'Each case must have an owner at all times\nCase history is append-only for audit',
      personas: ['Department Director'],
    },
    {
      name: 'Enterprise Data Management',
      domain: 'Information Management',
      capabilityType: 'technical',
      togafDomains: ['data-architecture'],
      admPhase: 'adm-c-information-systems-architectures',
      description: markStarter('Govern the agency’s shared data — master records, ownership, quality, and stewardship — as a managed asset.'),
      behaviors: 'Maintain authoritative master records for residents, businesses, and assets\nPublish data quality and stewardship reports',
      rules: 'Each shared data domain must have a named steward\nMaster records are reconciled from source systems, not edited directly',
      personas: ['Enterprise Architect'],
    },
    {
      name: 'Identity & Access Management',
      domain: 'Information Technology',
      capabilityType: 'technical',
      togafDomains: ['technology-architecture', 'application-architecture'],
      admPhase: 'adm-d-technology-architecture',
      description: markStarter('Unified authentication and authorization for residents and staff across agency digital services.'),
      behaviors: 'Authenticate residents and staff via local credentials or federated identity\nEnforce multi-factor authentication for privileged roles',
      rules: 'Resident-facing authentication must use OpenID Connect\nPrivileged access must require multi-factor authentication',
      personas: ['IT Operations Staff', 'Resident'],
    },
    {
      name: 'Cloud Hosting Platform',
      domain: 'Information Technology',
      capabilityType: 'technical',
      togafDomains: ['technology-architecture'],
      admPhase: 'adm-d-technology-architecture',
      description: markStarter('The managed cloud foundation — compute, networking, and platform services — that agency applications run on.'),
      behaviors: 'Provision compute and platform services from an approved catalog\nMonitor availability and cost across hosted workloads',
      rules: 'New workloads are provisioned through the approved platform, not ad hoc\nProduction workloads must have monitoring and backup configured',
      personas: ['IT Operations Staff'],
    },
  ],

  applications: [
    {
      name: 'Citizen Portal',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      togafDomains: ['application-architecture', 'business-architecture'],
      description: markStarter('Public-facing portal where residents request services, apply for permits, and track status.'),
      capabilities: ['Citizen Service Management', 'Permitting & Licensing'],
    },
    {
      name: 'Permitting & Licensing System',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      togafDomains: ['application-architecture'],
      description: markStarter('System of record for permit and license applications, reviews, inspections, and issuance.'),
      capabilities: ['Permitting & Licensing', 'Case Management'],
    },
    {
      name: 'Enterprise Data Platform',
      vendor: 'Example Vendor',
      hostingModel: 'hybrid',
      lifecycleStatus: 'active',
      togafDomains: ['data-architecture'],
      description: markStarter('Shared data platform consolidating master records and analytics from agency source systems.'),
      capabilities: ['Enterprise Data Management'],
    },
    {
      name: 'Identity Provider',
      vendor: 'Example Vendor',
      hostingModel: 'saas',
      lifecycleStatus: 'active',
      togafDomains: ['technology-architecture'],
      description: markStarter('Cloud identity provider supplying OpenID Connect authentication and federation for staff and residents.'),
      capabilities: ['Identity & Access Management'],
    },
  ],

  objectives: [
    {
      name: 'Improve Digital Service Delivery',
      timeHorizon: 'FY2026',
      description: markStarter('Make agency services faster and easier to access online, reducing in-person visits and processing times.'),
      successMetric: '80% of permit applications submitted online by end of FY2026',
      capabilities: ['Citizen Service Management', 'Permitting & Licensing', 'Identity & Access Management'],
    },
    {
      name: 'Consolidate Enterprise Data',
      timeHorizon: 'FY2027',
      description: markStarter('Establish authoritative master data and retire duplicate stores so decisions and services share one source of truth.'),
      successMetric: 'Single authoritative master record for residents and businesses by end of FY2027',
      capabilities: ['Enterprise Data Management', 'Case Management'],
    },
  ],

  adrs: [
    {
      number: 'ADR-001',
      title: 'Adopt a cloud-first hosting strategy',
      status: 'accepted',
      context: markStarter('Agencies of this size cannot sustain a deep on-premises operations team. New workloads favour managed cloud platforms where data classification permits.'),
      decision: 'New application acquisitions and workloads evaluate the managed cloud hosting platform first. On-premises is the fallback when data residency, integration, or regulatory constraints rule cloud out.',
      consequences: 'Reduces operational burden on internal IT and standardizes the technology architecture. Increases dependence on vendor SLAs and adds procurement / contract review obligations.',
      capabilities: ['Cloud Hosting Platform', 'Identity & Access Management'],
    },
    {
      number: 'ADR-002',
      title: 'Standardize on OpenID Connect for identity federation',
      status: 'accepted',
      context: markStarter('Fragmented authentication across services creates security risk and a poor user experience for both residents and staff.'),
      decision: 'All resident- and staff-facing authentication flows use OpenID Connect through the designated identity provider. Per-application credential stores are retired.',
      consequences: 'Improves security posture and enables single sign-on. Increases dependency on the identity provider’s availability and requires a federation migration for existing applications.',
      capabilities: ['Identity & Access Management'],
    },
  ],

  initiatives: [
    {
      name: 'Citizen Portal Modernization',
      status: 'active',
      startDate: 'Q1 FY2026',
      endDate: 'Q4 FY2026',
      admPhase: 'adm-e-opportunities-and-solutions',
      description: markStarter('Replace the legacy resident portal with a modern, accessible experience covering services and permits.'),
      capabilities: ['Citizen Service Management', 'Permitting & Licensing'],
    },
    {
      name: 'Data Platform Migration',
      status: 'proposed',
      startDate: 'Q2 FY2026',
      endDate: 'Q1 FY2027',
      admPhase: 'adm-f-migration-planning',
      description: markStarter('Migrate master records and analytics from source systems onto the shared enterprise data platform.'),
      capabilities: ['Enterprise Data Management'],
    },
    {
      name: 'Identity Federation Rollout',
      status: 'active',
      startDate: 'Q1 FY2026',
      endDate: 'Q3 FY2026',
      admPhase: 'adm-g-implementation-governance',
      description: markStarter('Onboard agency applications onto OpenID Connect single sign-on and retire per-application credential stores.'),
      capabilities: ['Identity & Access Management'],
    },
  ],
}
