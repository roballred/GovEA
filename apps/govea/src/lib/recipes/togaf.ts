import type { Recipe } from './types'

/**
 * TOGAF recipe — the recipe engine's first real consumer (#672 / #665 S2).
 *
 * Aligned to the **TOGAF Standard, 10th Edition (2022)** — "TOGAF 10". The ADM
 * phases are unchanged from 9.2, so this is a framing/branding alignment rather
 * than a structural one; the value of the 10th-edition labelling is that
 * TOGAF-aware evaluators recognise the current standard.
 *
 * Per ADR-0002, TOGAF concepts ship as ordinary taxonomy **classification**,
 * not workflow: an "Architecture Domain" type and an "ADM Phase" type, both
 * marked `audience: 'framework'` so they stay invisible to viewer-role users
 * and stakeholder reports (ADR-0001's "no framework jargon for Department
 * Directors"). ADM phases are labels only — no phase gates, approvals, or
 * transitions (ADR-0002 §35-38).
 *
 * Report presets (Application Landscape by domain, ADM coverage by phase) are
 * deferred to the report engine (S3 / #673) — the Recipe type doesn't carry
 * presets yet.
 */
export const togafRecipe: Recipe = {
  slug: 'togaf',
  name: 'TOGAF 10',
  version: '2.0.0',
  description:
    'Installs TOGAF (Standard, 10th Edition) as optional taxonomy: Architecture Domains and ADM Phases (classification only, per ADR-0002), plus core TOGAF glossary and principles. Framework types are hidden from viewers and stakeholder reports.',

  taxonomyTypes: [
    {
      name: 'TOGAF Architecture Domain',
      slug: 'togaf-architecture-domain',
      audience: 'framework',
      description: 'The four TOGAF architecture domains, as an optional classification.',
      terms: [
        { name: 'Business Architecture', slug: 'business-architecture' },
        { name: 'Application Architecture', slug: 'application-architecture' },
        { name: 'Data Architecture', slug: 'data-architecture' },
        { name: 'Technology Architecture', slug: 'technology-architecture' },
      ],
      bindings: [
        { entityType: 'capability', selectionMode: 'multi' },
        { entityType: 'application', selectionMode: 'multi' },
      ],
    },
    {
      name: 'ADM Phase',
      slug: 'togaf-adm-phase',
      audience: 'framework',
      description:
        'TOGAF ADM phases as an optional classification label (ADR-0002). Tagging only — no phase gates, approvals, or required progression.',
      terms: [
        { name: 'Preliminary', slug: 'adm-preliminary' },
        { name: 'A: Architecture Vision', slug: 'adm-a-architecture-vision' },
        { name: 'B: Business Architecture', slug: 'adm-b-business-architecture' },
        { name: 'C: Information Systems Architectures', slug: 'adm-c-information-systems-architectures' },
        { name: 'D: Technology Architecture', slug: 'adm-d-technology-architecture' },
        { name: 'E: Opportunities & Solutions', slug: 'adm-e-opportunities-and-solutions' },
        { name: 'F: Migration Planning', slug: 'adm-f-migration-planning' },
        { name: 'G: Implementation Governance', slug: 'adm-g-implementation-governance' },
        { name: 'H: Architecture Change Management', slug: 'adm-h-architecture-change-management' },
        { name: 'Requirements Management', slug: 'adm-requirements-management' },
      ],
      bindings: [
        { entityType: 'capability', selectionMode: 'single' },
        { entityType: 'initiative', selectionMode: 'single' },
      ],
    },
  ],

  glossaryTerms: [
    { term: 'Architecture Development Method (ADM)', definition: 'The core of the TOGAF Standard (10th Edition): a step-by-step approach to developing and managing an enterprise architecture, organised into phases (Preliminary, A–H, and Requirements Management).', domain: 'Framework' },
    { term: 'Architecture Domain', definition: 'One of the four TOGAF architecture areas — Business, Data, Application, and Technology — used to organise architecture work.', domain: 'Framework' },
    { term: 'Architecture Vision', definition: 'The high-level, aspirational view of the target architecture produced in ADM Phase A, used to gain stakeholder buy-in.', domain: 'Framework' },
    { term: 'Building Block', definition: 'A reusable component of business, IT, or architectural capability that can be combined with others to deliver architectures and solutions.', domain: 'Framework' },
    { term: 'Architecture Repository', definition: 'The holding area for all architecture assets — reference models, standards, completed architectures, and governance records.', domain: 'Framework' },
  ],

  principles: [
    { name: 'Primacy of Principles', title: 'Primacy of Principles', description: 'All people and teams involved in the enterprise apply these principles.', rationale: 'Consistent, measurable progress depends on everyone working from the same principles.', implications: 'Initiatives are assessed for compliance; conflicts are reconciled against the principles.' },
    { name: 'Business Continuity', title: 'Business Continuity', description: 'Operations are maintained in spite of system interruptions.', rationale: 'Public services must remain available through outages and change.', implications: 'Dependencies and recovery expectations are documented for critical capabilities.' },
    { name: 'Data Is an Asset', title: 'Data Is an Asset', description: 'Data is an asset with value to the enterprise and is managed accordingly.', rationale: 'Decisions and services depend on accurate, governed data.', implications: 'Ownership, stewardship, and quality expectations are defined for key data.' },
    { name: 'Common Use Applications', title: 'Common Use Applications', description: 'Prefer applications used across the enterprise over similar duplicates.', rationale: 'Duplicate applications raise cost and fragment data.', implications: 'New applications are evaluated against existing shared capabilities first.' },
  ],
}
