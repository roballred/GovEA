// TOGAF Overlay Demo Dataset — City of Hartfield
//
// Purpose:
//   Demonstrates how GovEA can present a TOGAF-aligned framework overlay for
//   stakeholder review and ARB evaluation, without making TOGAF mandatory for
//   ordinary GovEA use. Implements the scenario defined in issue #247.
//
// Scenario:
//   The City of Hartfield has an Enterprise Architect on staff who is running
//   a "Resident Services Modernisation" architecture work package. The EA team
//   is using GovEA to manage their content and wants to demonstrate TOGAF
//   alignment to the Architecture Review Board while keeping plain-language
//   views intact for the Department Director.
//
// TOGAF Alignment Evidence:
//   - Phase Prelim / A (Architecture Vision): principles, objectives, glossary
//   - Phase B (Business Architecture): capabilities, personas, value streams
//   - Phase C (Application Architecture): applications + capability links
//   - Phase E/F (Migration Planning): initiatives + roadmap
//   - Phase G (Architecture Governance): ADRs, principles, review trail
//
// Intentional Gaps (for completeness demonstration):
//   - Records and Document Management: no applications linked — the EA team
//     has defined the capability but has not yet determined which application
//     fulfils it (Laserfiche is under ARB evaluation). ADR-004 documents this.
//   - Performance Reporting and Analytics: draft status — capability definition
//     is in progress and not yet approved for publication.
//
// Related issues: #245 (design), #247 (demo dataset)
// Login: maya@hartfield.govea.dev / dev-password (Admin)

// ─── Org ─────────────────────────────────────────────────────────────────────

export const TOGAF_ORG = {
  name: 'City of Hartfield',
  slug: 'city-of-hartfield',
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const TOGAF_USERS = [
  { name: 'Maya Architect', email: 'maya@hartfield.govea.dev', role: 'admin' as const },
]

// ─── Personas ────────────────────────────────────────────────────────────────
// Covers the four personas called out in #247:
//   Enterprise Architect, Agency EA Coordinator, Department Director,
//   Resident, Small Business Owner.
// Also adds an ARB Reviewer to exercise the governance side of the demo.

export const TOGAF_PERSONAS = [
  {
    name: 'Enterprise Architect',
    description: 'Central IT staff member responsible for the enterprise architecture practice. Owns the architecture vision, manages the capability model, and prepares content for Architecture Review Board (ARB) submissions. TOGAF-certified; uses GovEA as the authoritative record for all EA artefacts.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Agency EA Coordinator',
    description: 'Department-level coordinator who works with the central EA team to ensure their service area is accurately represented in the capability model. Translates operational needs into architecture language and acts as the EA point-of-contact for their department.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Department Director',
    description: 'Senior agency leader accountable for Hartfield Community Services and its technology investment. Receives plain-language roadmap and service-performance summaries. Does not use TOGAF terminology — GovEA surfaces only executive-friendly views.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'ARB Reviewer',
    description: 'Architecture Review Board member who evaluates architecture proposals for compliance with city standards, principles, and approved patterns. Reviews ADRs and architecture work packages before implementation begins.',
    type: 'Staff',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Resident',
    description: 'A member of the public applying for permits or licenses online. Primary beneficiary of the resident services modernisation programme.',
    type: 'Citizen',
    status: 'published' as const,
    visibility: 'org' as const,
  },
  {
    name: 'Small Business Owner',
    description: 'Local business operator who applies for and renews business licenses. Time-sensitive needs; expects digital-first service with clear status tracking.',
    type: 'External Partner',
    status: 'published' as const,
    visibility: 'org' as const,
  },
]

// ─── Capabilities ─────────────────────────────────────────────────────────────
// Each capability maps to a TOGAF Business Architecture concept.
// Plain-language names and descriptions are used throughout — TOGAF alignment
// is expressed in notes and glossary terms, not in the capability record itself.
//
// Intentional gaps:
//   - Records and Document Management: no applications linked (see ADR-004).
//   - Performance Reporting and Analytics: draft — not yet approved.

export const TOGAF_CAPABILITIES = [
  {
    name: 'Resident Digital Service Delivery',
    description: 'Provide residents and businesses with access to city licensing and permitting services through digital channels. Covers the full online experience from service discovery through to certificate issuance.',
    domain: 'Community Development',
    behaviors: 'Present available permit and license types in plain language for online self-service\nGuide applicants through eligibility checks and required documentation before submission\nTrack application status and send proactive updates at each workflow stage\nIssue digital permits and licenses upon approval\nSupport mobile-first access with accessibility standards compliance',
    rules: 'All resident-facing touchpoints must meet WCAG 2.1 AA accessibility standards\nService descriptions must be written at or below a Grade 8 reading level\nNo resident data may be collected beyond what is required to process the application',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner', 'Department Director'],
  },
  {
    name: 'Identity and Access Management',
    description: 'Authenticate residents, business owners, and staff across city digital services using the state identity broker. Supports single sign-on, multi-factor authentication, and self-service credential recovery.',
    domain: 'Information Technology',
    behaviors: 'Authenticate residents via the state identity broker (SSO) or local credentials\nEnforce multi-factor authentication for staff accessing administrative functions\nIssue and rotate short-lived access tokens for API and session access\nProvide self-service password reset and account recovery for local credentials',
    rules: 'All resident authentication must use OAuth 2.0 with OIDC via the state identity broker\nTokens must expire within 8 hours for staff and 24 hours for residents\nFailed authentication attempts must be logged and rate-limited',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner', 'Enterprise Architect'],
  },
  {
    name: 'Case and Workflow Management',
    description: 'Manage the lifecycle of permit and license applications from initial submission through review, inspection, decision, and issuance. Supports configurable workflow rules, assignment routing, and SLA tracking.',
    domain: 'Community Development',
    behaviors: 'Accept and validate permit and license applications with required documentation\nRoute applications to the responsible reviewer or inspection team\nTrack SLA compliance and escalate overdue cases automatically\nRecord review decisions with supporting rationale\nGenerate decision notices and issue certificates digitally',
    rules: 'Applications must be acknowledged within one business day of submission\nSLA breach notifications must be sent to supervisors before the deadline, not after\nCase assignment changes must be logged with a reason',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner', 'Agency EA Coordinator'],
  },
  {
    name: 'Payment Processing',
    description: 'Collect application fees, inspection fees, and license renewal payments through secure online channels. Integrates with the city finance system for revenue reconciliation.',
    domain: 'Finance & Revenue',
    behaviors: 'Accept credit, debit, and ACH payments for permit and license fees at point of application\nIssue electronic receipts immediately upon successful payment\nProcess refunds for rejected applications within five business days\nReconcile daily payment totals with the city finance system',
    rules: 'Payment must be collected before an application is accepted for substantive review\nCity staff must never handle resident payment credentials\nAll payment transactions must be tokenised — raw card data is never stored',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner'],
  },
  {
    name: 'Notification and Communications',
    description: 'Send automated, plain-language status notifications to applicants at each stage of the licensing and permitting workflow. Supports email, SMS, and in-portal messaging.',
    domain: 'Community Development',
    behaviors: 'Send confirmation notifications immediately after application submission\nNotify applicants when their application moves to a new workflow stage\nSend inspection scheduling confirmations and reminders\nDeliver decision notices with clear next steps for approved and rejected applications\nEnable applicants to set notification channel preferences (email, SMS, portal)',
    rules: 'All automated notifications must use plain language and avoid internal system jargon\nNotifications must include the application reference number and a direct link to the status page\nOptional SMS notifications may only be sent to residents who have explicitly opted in',
    status: 'published' as const,
    visibility: 'org' as const,
    personas: ['Resident', 'Small Business Owner'],
  },
  {
    name: 'Records and Document Management',
    description: 'Store, retrieve, and retain official licensing and permitting records in accordance with state retention schedules. Provides authorised staff with secure access to historical application records and issued certificates.',
    domain: 'Administrative Services',
    behaviors: 'Store all submitted documents, review notes, and issued certificates against the application record\nEnforce records retention periods per state schedule — flag records due for destruction or archival\nProvide authorised staff with full-text search across the records repository\nGenerate certified copies of issued permits and licenses upon request',
    rules: 'Records must be retained for the period specified in the state records retention schedule\nOnly authorised staff roles may retrieve or export records — resident self-service is read-only for their own records\nDestruction of records before the retention period expires is prohibited',
    status: 'published' as const,
    visibility: 'org' as const,
    // NOTE: No applications are linked to this capability — this is the intentional
    // mapping gap. Laserfiche is under ARB evaluation (see ADR-004). Linking it to
    // this capability would imply an architecture decision that has not been made.
    personas: ['Agency EA Coordinator', 'ARB Reviewer'],
  },
  {
    name: 'Performance Reporting and Analytics',
    description: 'Provide directors and architects with service performance dashboards — application volumes, processing times, SLA compliance, and fee revenue by service type.',
    domain: 'Finance & Revenue',
    behaviors: 'Display real-time application volume and status breakdowns by service type and department\nTrack average processing time against SLA targets over configurable time windows\nReport fee revenue and reconciliation status by period\nExport performance data for elected official briefings and ARB reporting',
    rules: 'Performance dashboards are read-only — source data is owned by the case management and finance systems\nExecutive reports must suppress personally identifiable information\nData displayed must be no more than 24 hours stale',
    // draft — intentional gap: capability definition not yet approved
    status: 'draft' as const,
    visibility: 'org' as const,
    personas: ['Department Director', 'Enterprise Architect', 'ARB Reviewer'],
  },
]

// ─── Applications ────────────────────────────────────────────────────────────
// Represents a realistic legacy + modernisation portfolio for a mid-sized city.
//
// Intentional gap: No application is linked to Records and Document Management.
//   Laserfiche is seeded as an active application but is NOT linked to that
//   capability — the ARB evaluation is pending (see ADR-004).

export const TOGAF_APPLICATIONS = [
  {
    name: 'Legacy Licensing Platform',
    description: 'Monolithic on-premises licensing and permitting system built in 2011. Vendor support ends Q2 FY2026. The Resident Services Modernisation programme will replace it.',
    vendor: 'In-house / Vendor-maintained',
    hostingModel: 'on-prem',
    lifecycleStatus: 'sunset' as const,
    status: 'published' as const,
    capabilities: ['Case and Workflow Management', 'Notification and Communications'],
  },
  {
    name: 'CivicPlatform Case Management',
    description: 'Cloud-native permitting and case management SaaS platform selected to replace the Legacy Licensing Platform. Pilot underway with Community Development.',
    vendor: 'Tyler Technologies',
    hostingModel: 'saas',
    lifecycleStatus: 'planned' as const,
    status: 'draft' as const,
    capabilities: ['Case and Workflow Management', 'Notification and Communications', 'Resident Digital Service Delivery'],
  },
  {
    name: 'State Identity Broker',
    description: 'Statewide OAuth 2.0 / OIDC identity broker operated by the state Office of Information Technology. Used for resident single sign-on across state and local government services.',
    vendor: 'State Office of Information Technology',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Identity and Access Management'],
  },
  {
    name: 'PayGov',
    description: 'FedRAMP-authorised government payment processing platform. Handles credit, debit, and ACH transactions for all city online services.',
    vendor: 'US Bank / PayGov',
    hostingModel: 'saas',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    capabilities: ['Payment Processing'],
  },
  {
    name: 'Laserfiche',
    description: 'On-premises enterprise content management system used for document storage and records management. Currently under ARB evaluation for renewal vs. cloud migration. No architecture decision has been recorded — see ADR-004.',
    vendor: 'Laserfiche',
    hostingModel: 'on-prem',
    lifecycleStatus: 'active' as const,
    status: 'published' as const,
    // Intentional gap: NOT linked to Records and Document Management.
    // This demonstrates a missing Phase C mapping — the application exists but
    // the capability-to-application relationship has not been approved by the ARB.
    capabilities: [] as string[],
  },
]

// ─── Value Streams ───────────────────────────────────────────────────────────
// One value stream covering the end-to-end permit/license journey.
// Stages are designed to map to TOGAF Phase B process decomposition.

export const TOGAF_VALUE_STREAMS = [
  {
    name: 'Application to Permit',
    description: 'End-to-end journey from a resident or business submitting a permit or license application through to receiving their approved certificate. Covers the full resident experience and internal workflow.',
    valueItem: 'Approved permit or license enabling the resident or business to operate legally',
    status: 'published' as const,
    visibility: 'org' as const,
    stakeholderPersonas: ['Resident', 'Small Business Owner', 'Department Director'],
    stages: [
      {
        name: 'Service Discovery and Authentication',
        description: 'Applicant identifies the correct service, creates or logs in to their account, and reviews eligibility requirements before starting an application.',
        order: 1,
        capabilities: ['Resident Digital Service Delivery', 'Identity and Access Management'],
      },
      {
        name: 'Application Submission and Payment',
        description: 'Applicant completes the application form, attaches required documents, and pays the applicable fee.',
        order: 2,
        capabilities: ['Case and Workflow Management', 'Payment Processing', 'Notification and Communications'],
      },
      {
        name: 'Review and Compliance Check',
        description: 'Staff review the application for completeness, verify compliance with zoning and code requirements, and request additional information if needed.',
        order: 3,
        capabilities: ['Case and Workflow Management', 'Records and Document Management'],
      },
      {
        name: 'Inspection and Field Verification',
        description: 'Where required, an inspector is dispatched to the site. Inspection results are recorded against the application.',
        order: 4,
        capabilities: ['Case and Workflow Management', 'Notification and Communications'],
      },
      {
        name: 'Decision and Certificate Issuance',
        description: 'A final decision is recorded, the applicant is notified, and an approved certificate is issued digitally and stored in the records system.',
        order: 5,
        capabilities: ['Case and Workflow Management', 'Notification and Communications', 'Records and Document Management'],
      },
    ],
  },
]

// ─── Strategic Objectives ─────────────────────────────────────────────────────

export const TOGAF_OBJECTIVES = [
  {
    name: 'Modernise Resident-Facing Licensing Services',
    description: 'Replace the legacy licensing platform with a cloud-native case management solution that reduces application processing time and eliminates in-person visits for routine transactions.',
    successMetric: '90% of permit and license applications submitted and processed entirely online by end of FY2026; average processing time reduced by 40% versus FY2025 baseline',
    timeHorizon: 'FY2025–FY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Resident Digital Service Delivery', 'Case and Workflow Management', 'Notification and Communications'],
    valueStreams: ['Application to Permit'],
  },
  {
    name: 'Achieve Architecture Governance Maturity',
    description: 'Establish a functioning Architecture Review Board process with documented ADRs and principles in place for all significant technology decisions. Demonstrate that GovEA is the authoritative record for city architecture.',
    successMetric: 'All significant technology decisions in FY2026 covered by an accepted ADR; ARB review completion rate above 95%',
    timeHorizon: 'FY2026',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Performance Reporting and Analytics'],
    valueStreams: [] as string[],
  },
  {
    name: 'Eliminate On-Premises Licensing Infrastructure',
    description: 'Decommission all on-premises servers supporting the legacy licensing platform and migrate residual records to an approved cloud or managed service.',
    successMetric: 'Legacy Licensing Platform servers decommissioned by Q2 FY2027; zero active on-premises licensing workloads',
    timeHorizon: 'FY2027',
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Case and Workflow Management', 'Records and Document Management'],
    valueStreams: [] as string[],
  },
]

// ─── Initiatives ─────────────────────────────────────────────────────────────
// Covers the full TOGAF ADM migration planning story:
//   - Architecture Vision work package (active)
//   - Platform pilot (proposed)
//   - Legacy decommission (proposed)
//   - IAM consolidation (on-hold — demonstrates the on-hold status and a gap
//     in Phase C coverage for Identity and Access Management)

export const TOGAF_INITIATIVES = [
  {
    name: 'Architecture Vision — Resident Services Modernisation',
    description: 'TOGAF ADM Phase A work package. Develops and validates the architecture vision for the Resident Services Modernisation programme, including stakeholder map, capability assessment, and high-level migration roadmap. Outputs feed into ARB for Phase B approval.',
    status: 'active' as const,
    startDate: 'Q1 FY2025',
    endDate: 'Q2 FY2025',
    capabilities: [
      { name: 'Resident Digital Service Delivery', impact: 'build'   },
      { name: 'Case and Workflow Management',       impact: 'improve' },
      { name: 'Performance Reporting and Analytics',impact: 'build'   },
    ],
    applications: [] as { name: string; impact: 'build' | 'improve' | 'retire' | 'migrate' | null }[],
    objectives: ['Modernise Resident-Facing Licensing Services', 'Achieve Architecture Governance Maturity'],
  },
  {
    name: 'CivicPlatform Pilot — Community Development',
    description: 'TOGAF ADM Phase E/F. Pilot deployment of CivicPlatform Case Management with Community Development to validate the target architecture before full rollout. Includes integration testing with the State Identity Broker and PayGov.',
    status: 'proposed' as const,
    startDate: 'Q3 FY2025',
    endDate: 'Q1 FY2026',
    capabilities: [
      { name: 'Case and Workflow Management',      impact: 'improve' },
      { name: 'Notification and Communications',   impact: 'improve' },
      { name: 'Resident Digital Service Delivery', impact: 'improve' },
    ],
    applications: [
      { name: 'CivicPlatform Case Management', impact: 'build'  },
      { name: 'Legacy Licensing Platform',     impact: null     },
    ],
    objectives: ['Modernise Resident-Facing Licensing Services'],
  },
  {
    name: 'Legacy Licensing Platform Decommission',
    description: 'Retire the on-premises Legacy Licensing Platform after CivicPlatform reaches full production coverage. Includes data migration, records transfer, and server decommission.',
    status: 'proposed' as const,
    startDate: 'Q2 FY2026',
    endDate: 'Q2 FY2027',
    capabilities: [
      { name: 'Case and Workflow Management', impact: 'retire' },
    ],
    applications: [
      { name: 'Legacy Licensing Platform',    impact: 'retire' },
      { name: 'CivicPlatform Case Management',impact: 'build'  },
    ],
    objectives: ['Eliminate On-Premises Licensing Infrastructure'],
  },
  {
    name: 'IAM Consolidation — State Identity Broker Integration',
    description: 'On hold pending state Office of Information Technology API roadmap publication. Will integrate the State Identity Broker as the authoritative identity provider for all resident-facing city services, replacing the legacy local credential store.',
    status: 'on-hold' as const,
    startDate: 'Q4 FY2025',
    endDate: 'Q2 FY2026',
    capabilities: [
      { name: 'Identity and Access Management', impact: 'improve' },
    ],
    applications: [
      { name: 'State Identity Broker', impact: 'improve' },
    ],
    objectives: ['Modernise Resident-Facing Licensing Services'],
  },
]

// ─── ADRs ─────────────────────────────────────────────────────────────────────
// ADR-004 is the key governance record documenting the intentional gap
// (Records and Document Management has no mapped application).

export const TOGAF_ADRS = [
  {
    number: 'ADR-001',
    title: 'SaaS-first for all new resident-facing application acquisitions',
    context: 'The city operates a sunset-status on-premises licensing platform approaching end of vendor support. A replacement is required. City IT capacity is insufficient to maintain on-premises infrastructure at the required reliability level.',
    decision: 'All new resident-facing application acquisitions will default to SaaS unless a documented security, data sovereignty, or integration constraint requires otherwise. On-premises deployments require Director-level approval and an exit plan. This decision is aligned with TOGAF ADM Phase A direction from the Architecture Vision work package.',
    consequences: 'Reduces infrastructure and patching burden. Improves vendor-managed update cadence. Increases reliance on internet connectivity and SLA compliance by vendors. Requires updated procurement templates and vendor risk assessments.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Case and Workflow Management', 'Resident Digital Service Delivery'],
    applications: ['CivicPlatform Case Management'],
    initiatives: ['Architecture Vision — Resident Services Modernisation'],
    objectives: ['Modernise Resident-Facing Licensing Services'],
  },
  {
    number: 'ADR-002',
    title: 'Adopt OAuth 2.0 / OIDC via the State Identity Broker for resident authentication',
    context: 'Resident-facing services currently use fragmented authentication — local username/password for some services and ad-hoc integrations for others. The state Office of Information Technology operates a statewide OAuth 2.0 / OIDC broker available to local agencies.',
    decision: 'All new and migrated resident-facing authentication flows will use OAuth 2.0 with OIDC via the State Identity Broker. Local credential stores are maintained as fallback only. Staff authentication continues through the existing enterprise SSO pathway. Aligns with TOGAF Phase B capability requirement for Identity and Access Management.',
    consequences: 'Improves security posture and enables resident single sign-on across state and local services. Creates dependency on the state identity broker availability. Requires migration of existing legacy authentication implementations.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Identity and Access Management'],
    applications: ['State Identity Broker'],
    initiatives: ['IAM Consolidation — State Identity Broker Integration'],
    objectives: ['Modernise Resident-Facing Licensing Services'],
  },
  {
    number: 'ADR-003',
    title: 'REST/JSON APIs with OAuth 2.0 for all inter-system integrations',
    context: 'Integrations between city systems currently use a mix of SOAP, flat-file exports, and direct database queries. These patterns are difficult to audit, test, and govern. The state integration platform uses REST/JSON.',
    decision: 'All new and migrated inter-system integrations will use REST/JSON APIs authenticated via OAuth 2.0. API contracts must be documented using OpenAPI specifications and reviewed at the ARB before production deployment.',
    consequences: 'Aligns with state and industry direction. Reduces integration complexity and improves auditability. Requires refactoring of existing flat-file and SOAP integrations as systems are replaced.',
    status: 'accepted' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Identity and Access Management', 'Case and Workflow Management'],
    applications: ['CivicPlatform Case Management', 'State Identity Broker', 'PayGov'],
    initiatives: ['CivicPlatform Pilot — Community Development'],
    objectives: [] as string[],
  },
  {
    number: 'ADR-004',
    title: 'Defer records management platform architecture decision pending ARB evaluation',
    context: 'Laserfiche is the city\'s current on-premises records management system. Its vendor contract is due for renewal. Options under consideration include renewing Laserfiche, migrating to a cloud document management SaaS, or bundling records capabilities into CivicPlatform. No evaluation has been completed. The Records and Document Management capability is therefore not yet mapped to an application in GovEA.',
    decision: 'The architecture decision for the records management platform is deferred until the ARB completes its evaluation. The Records and Document Management capability will remain without an application mapping in GovEA until this decision is recorded. This is an intentional, acknowledged gap — not an oversight.',
    consequences: 'Explicitly documents a known architecture gap for ARB visibility. Prevents premature capability-to-application mapping that would misrepresent the architecture. Creates an open action item for the ARB to resolve before the Legacy Licensing Platform decommission milestone.',
    status: 'proposed' as const,
    supersededByNumber: null as string | null,
    capabilities: ['Records and Document Management'],
    applications: ['Laserfiche'],
    initiatives: ['Legacy Licensing Platform Decommission'],
    objectives: ['Eliminate On-Premises Licensing Infrastructure'],
  },
]

// ─── Principles ───────────────────────────────────────────────────────────────

export const TOGAF_PRINCIPLES = [
  {
    name: 'Resident First',
    description: 'Design every resident-facing service for the least digitally confident user — low literacy, mobile-only, non-native English speaker. Services that work for the hardest cases work for everyone.',
    title: 'Design for the least digitally confident resident first',
    rationale: 'A significant portion of Hartfield residents access city services via mobile as their primary device. Designing for high-literacy desktop users leaves those residents behind and increases service centre call volume. Inclusive design reduces cost per transaction.',
    implications: 'All resident-facing services must be tested against low-literacy and mobile-first criteria before launch. Plain-language summaries are required for all public-facing content. WCAG 2.1 AA compliance is a launch requirement, not a post-launch enhancement.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Resident Digital Service Delivery', 'Notification and Communications'],
  },
  {
    name: 'Open Standards Integration',
    description: 'Prefer open, widely-adopted integration standards (REST/JSON, OAuth 2.0, OIDC) over proprietary patterns or vendor-specific APIs.',
    title: 'Use open standards for all inter-system integration and identity',
    rationale: 'Proprietary integration patterns create long-term vendor lock-in and make it harder to replace individual components. Open standards are better supported by tooling, easier to audit, and more likely to remain viable as systems change.',
    implications: 'All new integrations must use REST/JSON with OpenAPI documentation. OAuth 2.0 with OIDC is the required authentication pattern for resident-facing services. Legacy SOAP or flat-file integrations are migrated as part of system replacement programmes.',
    principleType: 'architecture' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Identity and Access Management', 'Case and Workflow Management'],
  },
  {
    name: 'City Data Sovereignty',
    description: 'The city retains ownership of all resident data regardless of the platform that processes it. Vendor contracts must guarantee data portability, deletion rights, and prohibition on third-party data use.',
    title: 'City retains ownership of all resident and service data',
    rationale: 'Cloud and SaaS platforms hold city and resident data on behalf of the city. Without explicit contractual protections, vendors may use, analyse, or retain that data beyond the scope of the original agreement. This creates reputational and legal risk.',
    implications: 'All vendor contracts for cloud or SaaS platforms must include: data portability in a standard format within 30 days of notice, the right to deletion, and prohibition on use of city data for vendor analytics or model training. Contracts that do not meet this standard require CIO approval.',
    principleType: 'data' as const,
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Records and Document Management', 'Case and Workflow Management'],
  },
  {
    name: 'Data Minimisation',
    description: 'Collect only the personal and operational data strictly necessary to deliver the service. Do not collect data speculatively for future use cases.',
    title: 'Collect only data that is necessary to deliver the immediate service',
    rationale: 'Every item of personal data collected is a liability. Speculative data collection increases breach exposure, complicates retention schedules, and undermines resident trust. The city should be able to explain, for every data field, exactly why it is collected and how long it is retained.',
    implications: 'Data collection fields in new systems must be justified and documented before launch. Fields with no documented purpose within 12 months of collection are candidates for removal. Privacy impact assessments are required for any new resident data collection.',
    principleType: 'data' as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Resident Digital Service Delivery', 'Identity and Access Management'],
  },
]

// ─── Glossary ─────────────────────────────────────────────────────────────────
// TOGAF-specific terms with multi-source definitions, demonstrating the
// framework reference management pattern from issue #245.
//
// Key design decisions:
//   - TOGAF definitions are cited as reference sources, not embedded as
//     authoritative text (licensing and citation rules)
//   - Each term uses the GovEA plain-language definition as the primary,
//     with TOGAF and other sources in the sources array
//   - Terms demonstrate the range: some with a selected source, some pending

export const TOGAF_GLOSSARY = [
  {
    term: 'Architecture Vision',
    definition: 'A high-level description of the target state of the enterprise and how the architecture programme will deliver it. Used to align stakeholders before detailed architecture work begins.',
    definitionSource: 'TOGAF 10 (adapted for GovEA plain-language use)',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'In GovEA, the Architecture Vision is represented by the combination of strategic objectives, the initiative roadmap, and the current capability assessment. It does not require a separate TOGAF-format document — the GovEA record set IS the vision artefact.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A concise description of the changes to the enterprise that will be needed as a result of the business goals and strategic drivers, together with a high-level description of the target architecture that will be needed to support the business goals.',
      },
      {
        name: 'GovEA plain-language equivalent',
        url: undefined as string | undefined,
        definition: 'A shared picture of where the organization is headed and what needs to change to get there — written in plain language for elected officials, directors, and the public, and backed by the structured records in GovEA.',
      },
    ],
  },
  {
    term: 'ADM Phase',
    definition: 'A stage in the TOGAF Architecture Development Method (ADM) — the step-by-step approach for developing and managing enterprise architecture. Phases run from Preliminary through Architecture Vision, Business Architecture, Information Systems Architecture, Technology Architecture, Migration Planning, Implementation Governance, and Architecture Change Management.',
    definitionSource: 'TOGAF 10',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'GovEA does not enforce ADM phase as a formal field. In the TOGAF overlay demo, ADM phase alignment is approximated by the combination of initiative status, capability build/improve/retire impact labels, and ADR status. A future framework-alignment feature (see issue #245) would allow explicit ADM phase tagging.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'The Architecture Development Method (ADM) provides a tested and repeatable process for developing architectures. The ADM includes establishing an architecture framework, developing architecture content, transitioning, and governing the realization of architectures.',
      },
    ],
  },
  {
    term: 'Business Capability',
    definition: 'A named ability that the organization must have to deliver its mission. Capabilities describe what the organization does, independent of how it does it or which technology supports it.',
    definitionSource: 'GovEA / EasyEA methodology',
    definitionSourceUrl: undefined as string | undefined,
    domain: 'Enterprise Architecture',
    notes: 'In TOGAF terms, GovEA capabilities correspond to Business Architecture capabilities. In FEAF, they map to business or technical capabilities in the Business Reference Model. The GovEA definition is intentionally technology-agnostic and plain-language.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'An ability that an organization, person, or system possesses. Capabilities are typically expressed in general and high-level terms and typically require a combination of organization, people, processes, and technology to achieve.',
      },
      {
        name: 'FEAF v2 (Federal Enterprise Architecture Framework)',
        url: 'https://www.cio.gov/policies-and-instructions/federal-enterprise-architecture-framework/',
        definition: 'A business capability is a particular ability or capacity that a business may possess or exchange to achieve a specific purpose or outcome.',
      },
      {
        name: 'GovEA / EasyEA methodology',
        url: 'https://github.com/roballred/EasyEA',
        definition: 'A named ability the organization must have to deliver value. Capabilities describe what the organization does, not how it does it or which systems support it.',
      },
    ],
  },
  {
    term: 'Architecture Work Package',
    definition: 'A defined unit of architecture work with a clear scope, outputs, and acceptance criteria. Used to organise architecture activities and track progress through the ADM.',
    definitionSource: 'TOGAF 10',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'In GovEA, an architecture work package is most closely represented by an active initiative with linked capabilities, ADRs, and objectives. The "Architecture Vision — Resident Services Modernisation" initiative in this dataset is an example.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A set of actions identified to achieve one or more objectives for the business. A Work Package can be defined at various levels of detail and can be used to represent the transition states required to realize the Target Architecture.',
      },
    ],
  },
  {
    term: 'Stakeholder Map',
    definition: 'A structured inventory of the individuals, roles, and groups with an interest in the architecture work — including their concerns, influence, and what information they need.',
    definitionSource: 'TOGAF 10 (adapted)',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'In GovEA, the stakeholder map is represented by the Personas catalog. Each persona represents a stakeholder class. The capability-persona links show which capabilities each stakeholder interacts with. This dataset uses the Enterprise Architect, Agency EA Coordinator, Department Director, ARB Reviewer, Resident, and Small Business Owner personas as the stakeholder map for the Resident Services Modernisation programme.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A technique used to identify and prioritize stakeholders based on their level of power/influence and interest. Used during Architecture Vision to ensure all relevant parties are engaged in the architecture process.',
      },
    ],
  },
  {
    term: 'Architecture Compliance',
    definition: 'The state of a system or initiative being demonstrably consistent with the principles, standards, and decisions documented in the architecture. Assessed during Architecture Review Board review.',
    definitionSource: 'TOGAF 10 (adapted)',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'In GovEA, architecture compliance is demonstrated by: (1) capability links showing what the initiative builds or changes, (2) ADRs in Accepted status covering the decisions involved, (3) principles that the initiative does not violate. The intentional gap in this dataset — Records and Document Management having no application link — is an example of a compliance gap that would appear in an ARB review.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'Architecture compliance is the process of checking that a specific implementation (project/program) meets the standards and specifications defined in the architecture. TOGAF defines three types of compliance: irrelevant, consistent, and conformant.',
      },
    ],
  },
  {
    term: 'Migration Plan',
    definition: 'A structured plan for transitioning from the current (baseline) architecture to the target architecture, including sequencing, dependencies, and risk mitigation.',
    definitionSource: 'TOGAF 10 (adapted)',
    definitionSourceUrl: 'https://www.opengroup.org/togaf',
    domain: 'Enterprise Architecture',
    notes: 'In GovEA, the migration plan is represented by the Roadmap view — initiatives ordered by status and date, with capability impact labels showing what is being built, improved, or retired. The Initiatives catalog is the canonical migration plan artefact for this dataset.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A plan that defines a roadmap for moving from the Baseline Architecture to the Target Architecture. It is described in terms of a series of Transition Architectures, each representing an intermediate state between the Baseline and Target. Each transition is captured as an Architecture Work Package.',
      },
    ],
  },
  {
    term: 'Gap Analysis',
    definition: 'The identification of differences between the baseline (current) architecture and the target architecture. Gaps become inputs to the migration plan and are prioritised for resolution.',
    domain: 'Enterprise Architecture',
    notes: 'This dataset contains two intentional gaps demonstrating what gap analysis looks like in GovEA: (1) Records and Document Management — defined capability with no application mapping (Phase C gap). (2) Performance Reporting and Analytics — capability in draft status, not yet approved (Phase B gap). Both are documented in ADR-004 and in initiative descriptions.',
    status: 'published' as const,
    visibility: 'org' as const,
    sources: [
      {
        name: 'TOGAF 10 (The Open Group Architecture Framework)',
        url: 'https://www.opengroup.org/togaf',
        definition: 'A technique used to identify the differences between two Architecture States. Gaps between the Baseline and Target are identified and classified, with the intent of informing the transition planning work that will address these gaps.',
      },
    ],
  },
]

// ─── Services ────────────────────────────────────────────────────────────────

export const TOGAF_SERVICES = [
  {
    name: 'Online Permit and License Portal',
    description: 'Single online entry point for residents and businesses to apply for, track, pay for, and receive permits and licenses. Replaces in-person counter visits for all standard permit and license types.',
    serviceOwner: 'Community Development',
    channels: ['online', 'mobile'] as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Resident Digital Service Delivery', 'Case and Workflow Management', 'Payment Processing', 'Notification and Communications'],
    personas: ['Resident', 'Small Business Owner'],
    valueStreams: ['Application to Permit'],
  },
  {
    name: 'Business License Renewal',
    description: 'Annual renewal service for existing business licenses. Notifies business owners ahead of expiry and accepts online renewal with fee payment or in-person alternatives.',
    serviceOwner: 'Community Development',
    channels: ['online', 'in-person', 'phone'] as const,
    status: 'published' as const,
    visibility: 'org' as const,
    capabilities: ['Case and Workflow Management', 'Identity and Access Management', 'Notification and Communications'],
    personas: ['Small Business Owner'],
    valueStreams: ['Application to Permit'],
  },
  {
    name: 'Architecture Review and Governance',
    description: 'Internal service through which project teams request architecture review, submit ADRs for ARB approval, and receive compliance assessments. Managed by the Enterprise Architect.',
    serviceOwner: 'Central IT / Enterprise Architecture',
    channels: ['online'] as const,
    status: 'draft' as const,
    visibility: 'org' as const,
    capabilities: ['Performance Reporting and Analytics'],
    personas: ['Enterprise Architect', 'Agency EA Coordinator', 'ARB Reviewer'],
    valueStreams: [] as string[],
  },
]
