import { eq, isNull } from 'drizzle-orm'
import { GOV_TAXONOMY } from './gov-taxonomy'
import {
  DEV_ORG, STATE_ORG, SYSTEM_ORG,
  DEV_USERS, STATE_USERS, SYSTEM_USERS,
  DEFAULT_PERSONA_TYPES, DEFAULT_PERSONA_TAGS,
  DEV_PERSONA_TAG_ASSIGNMENTS,
  DEV_PERSONAS, DEV_CAPABILITIES, DEV_CAPABILITY_RELATIONSHIPS, DEV_CAPABILITY_TOGAF_DOMAINS, DEV_APPLICATIONS,
  DEV_OBJECTIVES, DEV_GOALS, DEV_STRATEGIES, DEV_VALUE_STREAMS, DEV_INITIATIVES, DEV_ADRS,
  DEV_PRINCIPLES, DEV_GLOSSARY, DEV_SERVICES,
  DEV_DATA_ENTITIES, DEV_DATA_ATTRIBUTES, DEV_DATA_LINKS, DEV_DATA_BUSINESS_KEYS,
  DEV_DATA_ENTITY_RELATIONS, DEV_DATA_ATTRIBUTE_SHARES,
  STATE_PERSONAS, STATE_CAPABILITIES, STATE_APPLICATIONS,
  DEV_CROSS_ORG_LINKS, STATE_INBOUND_CROSS_ORG_LINKS,
  GOVEA_PROJECT_ORG, GOVEA_PROJECT_USERS,
  GOVEA_PROJECT_PERSONAS, GOVEA_PROJECT_CAPABILITIES, GOVEA_PROJECT_APPLICATIONS,
  RETIRED_GOVEA_PROJECT_APPLICATIONS,
  GOVEA_PROJECT_VALUE_STREAMS, GOVEA_PROJECT_GOALS, GOVEA_PROJECT_OBJECTIVES, GOVEA_PROJECT_INITIATIVES,
  GOVEA_PROJECT_ADRS, GOVEA_PROJECT_PRINCIPLES, GOVEA_PROJECT_GLOSSARY, GOVEA_PROJECT_SERVICES,
  GOVEA_PROJECT_DEBT,
} from './dev-fixtures'
import {
  TOGAF_ORG, TOGAF_USERS,
  TOGAF_PERSONAS, TOGAF_CAPABILITIES, TOGAF_APPLICATIONS,
  TOGAF_VALUE_STREAMS, TOGAF_OBJECTIVES, TOGAF_INITIATIVES,
  TOGAF_ADRS, TOGAF_PRINCIPLES, TOGAF_GLOSSARY, TOGAF_SERVICES,
} from './togaf-demo-fixtures'
import { removeRetiredOrgs, RETIRED_ORG_SLUGS } from './cleanup'
import {
  SCALE_ORG, SCALE_USERS, SCALE_CAPABILITIES, SCALE_APPLICATIONS,
} from './scale-fixtures'
import { db } from '../client'
import {
  users, organizations, userOrganizationMemberships,
  personas, personaTags, capabilities, applications,
  capabilityPersonas, applicationCapabilities, capabilityRelationships,
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  goals, goalObjectives,
  strategies, strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives,
  valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas,
  initiatives, initiativeCapabilities, initiativeApplications, initiativeObjectives,
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
  principles, principleAdrs, principleCapabilities,
  glossaryTerms, glossaryTermSources,
  taxonomyTerms, entityTaxonomyDefinitions, entityTaxonomyValues,
  services, serviceCapabilities, servicePersonas, serviceValueStreams,
  orgConnections, crossOrgLinks,
  instanceSettings,
  dataEntities, dataAttributes, dataLinks, dataBusinessKeys,
  dataEntityOwners, dataAttributeOwners, dataLinkOwners, dataBusinessKeyOwners,
  dataEntityRelations, dataEntityAttributeLinks, dataAttributeShares,
  architectureDebtItems, debtCapabilities, debtApplications, debtInitiatives,
} from '../schema'
import { and, inArray } from 'drizzle-orm'
import { MODULE_DEFS } from '../../lib/modules'
import bcrypt from 'bcryptjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function findOrCreateOrg(slug: string, name: string, overrides?: { isSystemOrg?: boolean }) {
  const existing = await db.query.organizations.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
  })
  if (existing) {
    if (overrides?.isSystemOrg && !existing.isSystemOrg) {
      await db.update(organizations).set({ isSystemOrg: true }).where(eq(organizations.id, existing.id))
    }
    return existing.id
  }
  const [org] = await db.insert(organizations).values({ name, slug, isSystemOrg: overrides?.isSystemOrg ?? false }).returning()
  return org.id
}

async function findOrCreatePersona(orgId: string, name: string, data: {
  description?: string; type?: string; status: 'draft' | 'published' | 'archived'; visibility: 'org' | 'connections' | 'instance'
}) {
  const existing = await db.query.personas.findFirst({
    where: (t, { eq: e, and }) => and(e(t.organizationId, orgId), e(t.name, name)),
  })
  if (existing) return existing.id
  const [p] = await db.insert(personas).values({ organizationId: orgId, name, ...data }).returning()
  return p.id
}

async function findOrCreateCapability(orgId: string, name: string, data: {
  description?: string; domain?: string; behaviors?: string; rules?: string; status: 'draft' | 'published' | 'archived'; visibility: 'org' | 'connections' | 'instance'
}) {
  const existing = await db.query.capabilities.findFirst({
    where: (t, { eq: e, and }) => and(e(t.organizationId, orgId), e(t.name, name)),
  })
  if (existing) return existing.id
  const [c] = await db.insert(capabilities).values({ organizationId: orgId, name, ...data }).returning()
  return c.id
}

async function findOrCreateApplication(orgId: string, name: string, data: {
  description?: string; vendor?: string; version?: string; hostingModel?: string;
  lifecycleStatus: 'active' | 'sunset' | 'decommissioned' | 'planned';
  status: 'draft' | 'published' | 'archived'
}) {
  const existing = await db.query.applications.findFirst({
    where: (t, { eq: e, and }) => and(e(t.organizationId, orgId), e(t.name, name)),
  })
  if (existing) return existing.id
  const [a] = await db.insert(applications).values({ organizationId: orgId, name, ...data }).returning()
  return a.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  if (process.env.DEV !== 'true') {
    console.log('Seed complete.')
    process.exit(0)
  }

  console.log('\nLoading dev fixtures...')
  const passwordHash = await bcrypt.hash('dev-password', 12)

  // ── Cleanup: remove retired fixture orgs ─────────────────────────────────
  const removed = await removeRetiredOrgs(RETIRED_ORG_SLUGS)
  for (const slug of removed) {
    console.log(`  ✓ removed retired org: ${slug}`)
  }

  // ── Org 1: City of Riverdale ─────────────────────────────────────────────

  console.log('\n[Org 1] City of Riverdale')
  const devOrgId = await findOrCreateOrg(DEV_ORG.slug, DEV_ORG.name)

  // Users
  for (const u of DEV_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: devOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${DEV_USERS.length} users (password: dev-password)`)

  // Persona types — taxonomy terms under "Persona Type" type
  let personaTypeTermId: string
  const existingPersonaTypeType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'persona-type')),
  })
  if (existingPersonaTypeType) {
    personaTypeTermId = existingPersonaTypeType.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Persona Type',
      slug: 'persona-type',
      description: 'Categories used to classify personas.',
      sortOrder: '10',
    }).returning()
    personaTypeTermId = inserted.id
  }
  for (const name of DEFAULT_PERSONA_TYPES) {
    await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      parentId: personaTypeTermId,
      name,
      slug: toSlug(name),
    }).onConflictDoNothing()
  }

  // Persona tags — taxonomy terms under "Persona Tag" type; build id map for personaTags junction
  let personaTagTypeId: string
  const existingPersonaTagType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'persona-tag')),
  })
  if (existingPersonaTagType) {
    personaTagTypeId = existingPersonaTagType.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Persona Tag',
      slug: 'persona-tag',
      description: 'Cross-cutting labels used to filter and search personas.',
      sortOrder: '20',
    }).returning()
    personaTagTypeId = inserted.id
  }
  const devTagIds: Record<string, string> = {}
  for (const name of DEFAULT_PERSONA_TAGS) {
    const [term] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      parentId: personaTagTypeId,
      name,
      slug: toSlug(name),
    }).onConflictDoNothing().returning()
    if (term) {
      devTagIds[name] = term.id
    } else {
      const existing = await db.query.taxonomyTerms.findFirst({
        where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.parentId, personaTagTypeId), e(t.name, name)),
      })
      if (existing) devTagIds[name] = existing.id
    }
  }
  console.log(`  ✓ ${DEFAULT_PERSONA_TYPES.length} persona types, ${DEFAULT_PERSONA_TAGS.length} persona tags (taxonomy-backed)`)

  // Personas
  const devPersonaIds: Record<string, string> = {}
  for (const p of DEV_PERSONAS) {
    devPersonaIds[p.name] = await findOrCreatePersona(devOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${DEV_PERSONAS.length} personas`)

  // Persona tags — personaTags junction table
  for (const assignment of DEV_PERSONA_TAG_ASSIGNMENTS) {
    const personaId = devPersonaIds[assignment.personaName]
    if (!personaId) continue
    for (const tagName of assignment.tags) {
      const tagId = devTagIds[tagName]
      if (!tagId) continue
      const exists = await db.query.personaTags.findFirst({
        where: (t, { eq: e, and }) => and(e(t.personaId, personaId), e(t.tagId, tagId)),
      })
      if (!exists) await db.insert(personaTags).values({ personaId, tagId })
    }
  }
  console.log(`  ✓ persona tag assignments`)

  // Capabilities + persona links
  const devCapabilityIds: Record<string, string> = {}
  for (const c of DEV_CAPABILITIES) {
    const capId = await findOrCreateCapability(devOrgId, c.name, {
      description: c.description, domain: c.domain, behaviors: c.behaviors, rules: c.rules, status: c.status, visibility: c.visibility,
    })
    devCapabilityIds[c.name] = capId
    for (const personaName of c.personas) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.capabilityPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.capabilityId, capId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${DEV_CAPABILITIES.length} capabilities`)

  // Capability parent-child relationships
  for (const rel of DEV_CAPABILITY_RELATIONSHIPS) {
    const parentId = devCapabilityIds[rel.parentName]
    const childId = devCapabilityIds[rel.childName]
    if (!parentId || !childId) continue
    const exists = await db.query.capabilityRelationships.findFirst({
      where: (t, { eq: e, and }) => and(e(t.parentId, parentId), e(t.childId, childId)),
    })
    if (!exists) await db.insert(capabilityRelationships).values({ parentId, childId })
  }
  console.log(`  ✓ ${DEV_CAPABILITY_RELATIONSHIPS.length} capability parent-child relationships`)

  // #673 — TOGAF Architecture Domain as a taxonomy type + capability
  // assignments via entity_taxonomy_values, so the (repointed) Application
  // Landscape report reads from taxonomy. Mirrors the TOGAF recipe's domain
  // type (slug/audience). framework_mappings above is retained until #674
  // decommissions it. audience:'framework' hides it from viewers (ADR-0001/0002).
  let togafDomainTypeId: string
  const existingTogafDomainType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.organizationId, devOrgId), n(t.parentId), e(t.slug, 'togaf-architecture-domain')),
  })
  if (existingTogafDomainType) {
    togafDomainTypeId = existingTogafDomainType.id
  } else {
    const [ins] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId, name: 'TOGAF Architecture Domain', slug: 'togaf-architecture-domain',
      audience: 'framework', description: 'The four TOGAF architecture domains (optional classification).', sortOrder: '80',
    }).returning()
    togafDomainTypeId = ins.id
  }
  const TOGAF_DOMAIN_TERMS: Record<string, string> = {
    'Business Architecture': 'business-architecture',
    'Application Architecture': 'application-architecture',
    'Data Architecture': 'data-architecture',
    'Technology Architecture': 'technology-architecture',
  }
  const togafDomainTermIdByName: Record<string, string> = {}
  for (const [name, slug] of Object.entries(TOGAF_DOMAIN_TERMS)) {
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and: a }) => a(e(t.organizationId, devOrgId), e(t.parentId, togafDomainTypeId), e(t.slug, slug)),
    })
    togafDomainTermIdByName[name] = existing
      ? existing.id
      : (await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: togafDomainTypeId, name, slug }).returning())[0].id
  }
  for (const entityType of ['capability', 'application'] as const) {
    await db.insert(entityTaxonomyDefinitions).values({
      organizationId: devOrgId, entityType, taxonomyTypeId: togafDomainTypeId, selectionMode: 'multi', required: false, sortOrder: 2,
    }).onConflictDoNothing()
  }
  let togafDomainValueCount = 0
  for (const [capName, domainLabel] of Object.entries(DEV_CAPABILITY_TOGAF_DOMAINS)) {
    const capId = devCapabilityIds[capName]
    const termId = togafDomainTermIdByName[domainLabel]
    if (!capId || !termId) continue
    await db.insert(entityTaxonomyValues).values({
      organizationId: devOrgId, entityType: 'capability', entityId: capId, taxonomyTermId: termId,
    }).onConflictDoNothing()
    togafDomainValueCount++
  }
  console.log(`  ✓ TOGAF domain taxonomy + ${togafDomainValueCount} capability assignments (entity_taxonomy_values)`)

  // #673 — ADM Phase taxonomy (classification only, ADR-0002) + a few capability
  // tags so the ADM-coverage report demos. audience:'framework'.
  let admPhaseTypeId: string
  const existingAdmType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.organizationId, devOrgId), n(t.parentId), e(t.slug, 'togaf-adm-phase')),
  })
  if (existingAdmType) {
    admPhaseTypeId = existingAdmType.id
  } else {
    const [ins] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId, name: 'ADM Phase', slug: 'togaf-adm-phase', audience: 'framework',
      description: 'TOGAF ADM phases as an optional classification label (no workflow).', sortOrder: '81',
    }).returning()
    admPhaseTypeId = ins.id
  }
  const ADM_PHASES: [string, string][] = [
    ['Preliminary', 'adm-preliminary'],
    ['A: Architecture Vision', 'adm-a-architecture-vision'],
    ['B: Business Architecture', 'adm-b-business-architecture'],
    ['C: Information Systems Architectures', 'adm-c-information-systems-architectures'],
    ['D: Technology Architecture', 'adm-d-technology-architecture'],
    ['E: Opportunities & Solutions', 'adm-e-opportunities-and-solutions'],
    ['F: Migration Planning', 'adm-f-migration-planning'],
    ['G: Implementation Governance', 'adm-g-implementation-governance'],
    ['H: Architecture Change Management', 'adm-h-architecture-change-management'],
    ['Requirements Management', 'adm-requirements-management'],
  ]
  const admTermIdBySlug: Record<string, string> = {}
  for (const [name, slug] of ADM_PHASES) {
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and: a }) => a(e(t.organizationId, devOrgId), e(t.parentId, admPhaseTypeId), e(t.slug, slug)),
    })
    admTermIdBySlug[slug] = existing
      ? existing.id
      : (await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: admPhaseTypeId, name, slug }).returning())[0].id
  }
  for (const entityType of ['capability', 'initiative'] as const) {
    await db.insert(entityTaxonomyDefinitions).values({
      organizationId: devOrgId, entityType, taxonomyTypeId: admPhaseTypeId, selectionMode: 'single', required: false, sortOrder: 3,
    }).onConflictDoNothing()
  }
  const DEV_CAPABILITY_ADM: Record<string, string> = {
    'Online Permitting': 'adm-b-business-architecture',
    'GIS Mapping': 'adm-c-information-systems-architectures',
    'Cross-Agency Data Sharing': 'adm-c-information-systems-architectures',
    'Print & Mail Services': 'adm-d-technology-architecture',
  }
  let admTagCount = 0
  for (const [capName, slug] of Object.entries(DEV_CAPABILITY_ADM)) {
    const capId = devCapabilityIds[capName]; const termId = admTermIdBySlug[slug]
    if (!capId || !termId) continue
    await db.insert(entityTaxonomyValues).values({
      organizationId: devOrgId, entityType: 'capability', entityId: capId, taxonomyTermId: termId,
    }).onConflictDoNothing()
    admTagCount++
  }
  console.log(`  ✓ ADM Phase taxonomy + ${admTagCount} capability tags (entity_taxonomy_values)`)

  // Applications + capability links
  const devApplicationIds: Record<string, string> = {}
  for (const a of DEV_APPLICATIONS) {
    const appId = await findOrCreateApplication(devOrgId, a.name, {
      description: a.description, vendor: a.vendor, version: a.version,
      hostingModel: a.hostingModel, lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    devApplicationIds[a.name] = appId
    for (const capName of a.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${DEV_APPLICATIONS.length} applications`)

  // Government taxonomy — Type: "Domain" with 10 government domain values
  // Under our types/values model: "Domain" is the type, each domain name is a value within it.
  const domainTypeSlug = 'domain'
  let domainTypeId: string
  const existingDomainType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, domainTypeSlug)),
  })
  if (existingDomainType) {
    domainTypeId = existingDomainType.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Domain',
      slug: domainTypeSlug,
      description: 'Business and service domains used to classify capabilities and glossary terms.',
      sortOrder: '0',
    }).returning()
    domainTypeId = inserted.id
  }

  let domainValueCount = 0
  for (const [idx, domainEntry] of GOV_TAXONOMY.entries()) {
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, domainTypeId), e(t.name, domainEntry.domain)),
    })
    if (!existing) {
      await db.insert(taxonomyTerms).values({
        organizationId: devOrgId,
        parentId: domainTypeId,
        name: domainEntry.domain,
        slug: toSlug(domainEntry.domain),
        sortOrder: String(idx * 10),
      })
      domainValueCount++
    }
  }
  console.log(`  ✓ "Domain" type with ${GOV_TAXONOMY.length} domain values (${domainValueCount} new)`)

  // Value Streams + stages + stage capability links + persona links
  const devValueStreamIds: Record<string, string> = {}
  for (const vs of DEV_VALUE_STREAMS) {
    const existingVs = await db.query.valueStreams.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, vs.name)),
    })
    let vsId: string
    if (existingVs) {
      vsId = existingVs.id
    } else {
      const [inserted] = await db.insert(valueStreams).values({
        organizationId: devOrgId,
        name: vs.name,
        description: vs.description,
        valueItem: vs.valueItem,
        status: vs.status,
        visibility: vs.visibility,
      }).returning()
      vsId = inserted.id
    }
    devValueStreamIds[vs.name] = vsId

    // Stakeholder personas — valueStreamPersonas junction table
    for (const personaName of vs.stakeholderPersonas) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.valueStreamPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(valueStreamPersonas).values({ valueStreamId: vsId, personaId })
    }

    // Stages + stage capability links
    for (const stage of vs.stages) {
      const existingStage = await db.query.valueStreamStages.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.name, stage.name)),
      })
      let stageId: string
      if (existingStage) {
        stageId = existingStage.id
      } else {
        const [insertedStage] = await db.insert(valueStreamStages).values({
          valueStreamId: vsId,
          name: stage.name,
          description: stage.description,
          order: stage.order,
        }).returning()
        stageId = insertedStage.id
      }

      for (const capName of stage.capabilities) {
        const capId = devCapabilityIds[capName]
        if (!capId) continue
        const exists = await db.query.valueStreamStageCapabilities.findFirst({
          where: (t, { eq: e, and }) => and(e(t.stageId, stageId), e(t.capabilityId, capId)),
        })
        if (!exists) await db.insert(valueStreamStageCapabilities).values({ stageId, capabilityId: capId })
      }
    }
  }
  console.log(`  ✓ ${DEV_VALUE_STREAMS.length} value streams with stages and persona links`)

  // Strategic Objectives + capability / application / value stream links
  const devObjectiveIds: Record<string, string> = {}
  for (const o of DEV_OBJECTIVES) {
    const existing = await db.query.strategicObjectives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, o.name)),
    })
    let objId: string
    if (existing) {
      objId = existing.id
    } else {
      const [inserted] = await db.insert(strategicObjectives).values({
        organizationId: devOrgId,
        name: o.name,
        description: o.description,
        successMetric: o.successMetric,
        timeHorizon: o.timeHorizon,
        status: o.status,
        visibility: o.visibility,
      }).returning()
      objId = inserted.id
    }
    devObjectiveIds[o.name] = objId

    // objectiveCapabilities
    for (const capName of o.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.objectiveCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(objectiveCapabilities).values({ objectiveId: objId, capabilityId: capId })
    }

    // objectiveValueStreams
    for (const vsName of o.valueStreams) {
      const vsId = devValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.objectiveValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(objectiveValueStreams).values({ objectiveId: objId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${DEV_OBJECTIVES.length} strategic objectives`)

  // Goals + goalObjectives junction
  const devGoalIds: Record<string, string> = {}
  for (const g of DEV_GOALS) {
    const existing = await db.query.goals.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, g.name)),
    })
    let goalId: string
    if (existing) {
      await db.update(goals).set({
        description: g.description,
        planningHorizon: g.planningHorizon,
        owner: g.owner,
        status: g.status,
        visibility: g.visibility,
      }).where(eq(goals.id, existing.id))
      goalId = existing.id
    } else {
      const [inserted] = await db.insert(goals).values({
        organizationId: devOrgId,
        name: g.name,
        description: g.description,
        planningHorizon: g.planningHorizon,
        owner: g.owner,
        status: g.status,
        visibility: g.visibility,
      }).returning()
      goalId = inserted.id
    }

    for (const objName of g.objectives) {
      const objId = devObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.goalObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.goalId, goalId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(goalObjectives).values({ goalId, objectiveId: objId })
    }
    devGoalIds[g.name] = goalId
  }
  console.log(`  ✓ ${DEV_GOALS.length} goals with objective links`)

  // Initiatives + capability / application / objective links
  const devInitiativeIds: Record<string, string> = {}
  for (const ini of DEV_INITIATIVES) {
    const existingIni = await db.query.initiatives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, ini.name)),
    })
    let iniId: string
    if (existingIni) {
      iniId = existingIni.id
    } else {
      const [inserted] = await db.insert(initiatives).values({
        organizationId: devOrgId,
        name: ini.name,
        description: ini.description,
        status: ini.status,
        startDate: ini.startDate,
        endDate: ini.endDate ?? undefined,
      }).returning()
      iniId = inserted.id
    }
    devInitiativeIds[ini.name] = iniId

    // initiativeCapabilities
    for (const { name: capName, impact } of ini.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.initiativeCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(initiativeCapabilities).values({ initiativeId: iniId, capabilityId: capId, impact })
    }

    // initiativeApplications
    for (const { name: appName, impact } of ini.applications) {
      const appId = devApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.initiativeApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(initiativeApplications).values({ initiativeId: iniId, applicationId: appId, impact })
    }

    // initiativeObjectives
    for (const objName of ini.objectives) {
      const objId = devObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.initiativeObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(initiativeObjectives).values({ initiativeId: iniId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${DEV_INITIATIVES.length} initiatives`)

  // Strategies (ADR-0005) + their goal / capability / value-stream / initiative
  // links. Runs after goals, capabilities, value streams and initiatives so the
  // junction ids resolve. Idempotent: upsert by (org, name), link if absent.
  for (const s of DEV_STRATEGIES) {
    const existing = await db.query.strategies.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, s.name)),
    })
    let strategyId: string
    if (existing) {
      await db.update(strategies).set({
        summary: s.summary,
        planningHorizon: s.planningHorizon,
        status: s.status,
        visibility: s.visibility,
      }).where(eq(strategies.id, existing.id))
      strategyId = existing.id
    } else {
      const [inserted] = await db.insert(strategies).values({
        organizationId: devOrgId,
        name: s.name,
        summary: s.summary,
        planningHorizon: s.planningHorizon,
        status: s.status,
        visibility: s.visibility,
      }).returning()
      strategyId = inserted.id
    }

    // Composite PKs make these idempotent — re-seeding is a no-op.
    const goalIds = s.goals.map(n => devGoalIds[n]).filter(Boolean)
    if (goalIds.length) await db.insert(strategyGoals).values(goalIds.map(goalId => ({ strategyId, goalId }))).onConflictDoNothing()
    const capIds = s.capabilities.map(n => devCapabilityIds[n]).filter(Boolean)
    if (capIds.length) await db.insert(strategyCapabilities).values(capIds.map(capabilityId => ({ strategyId, capabilityId }))).onConflictDoNothing()
    const vsIds = s.valueStreams.map(n => devValueStreamIds[n]).filter(Boolean)
    if (vsIds.length) await db.insert(strategyValueStreams).values(vsIds.map(valueStreamId => ({ strategyId, valueStreamId }))).onConflictDoNothing()
    const iniIds = s.initiatives.map(n => devInitiativeIds[n]).filter(Boolean)
    if (iniIds.length) await db.insert(strategyInitiatives).values(iniIds.map(initiativeId => ({ strategyId, initiativeId }))).onConflictDoNothing()
  }
  console.log(`  ✓ ${DEV_STRATEGIES.length} strategies with goal/capability/value-stream/initiative links`)

  // ADRs — insert all records first (without supersededBy), then resolve self-references
  const devAdrIds: Record<string, string> = {}

  for (const adr of DEV_ADRS) {
    const existingAdr = await db.query.adrs.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.number, adr.number)),
    })
    let adrId: string
    if (existingAdr) {
      adrId = existingAdr.id
    } else {
      const [inserted] = await db.insert(adrs).values({
        organizationId: devOrgId,
        number: adr.number,
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        status: adr.status,
        // supersededBy resolved in second pass below
      }).returning()
      adrId = inserted.id
    }
    devAdrIds[adr.number] = adrId
  }

  // Second pass: resolve supersededBy self-references
  for (const adr of DEV_ADRS) {
    if (!adr.supersededByNumber) continue
    const adrId = devAdrIds[adr.number]
    const supersedingId = devAdrIds[adr.supersededByNumber]
    if (adrId && supersedingId) {
      await db.update(adrs).set({ supersededBy: supersedingId }).where(eq(adrs.id, adrId))
    }
  }

  // ADR junction tables: capabilities, applications, initiatives, objectives
  for (const adr of DEV_ADRS) {
    const adrId = devAdrIds[adr.number]
    if (!adrId) continue

    for (const capName of adr.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.adrCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(adrCapabilities).values({ adrId, capabilityId: capId })
    }

    for (const appName of adr.applications) {
      const appId = devApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.adrApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(adrApplications).values({ adrId, applicationId: appId })
    }

    for (const iniName of adr.initiatives) {
      const iniId = devInitiativeIds[iniName]
      if (!iniId) continue
      const exists = await db.query.adrInitiatives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.initiativeId, iniId)),
      })
      if (!exists) await db.insert(adrInitiatives).values({ adrId, initiativeId: iniId })
    }

    for (const objName of adr.objectives) {
      const objId = devObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.adrObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(adrObjectives).values({ adrId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${DEV_ADRS.length} ADRs with junction links and supersededBy chain`)

  // Principles
  for (const p of DEV_PRINCIPLES) {
    const existing = await db.query.principles.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, p.name)),
    })
    let pRow: typeof existing
    if (existing) {
      await db.update(principles).set({ principleType: p.principleType }).where(eq(principles.id, existing.id))
      pRow = existing
    } else {
      const [inserted] = await db.insert(principles).values({
        name: p.name,
        description: p.description ?? null,
        title: p.title ?? null,
        rationale: p.rationale,
        implications: p.implications,
        principleType: p.principleType,
        status: p.status,
        visibility: p.visibility,
        organizationId: devOrgId,
      }).returning()
      pRow = inserted
    }
    for (const capName of p.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.principleCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.principleId, pRow!.id), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(principleCapabilities).values({ principleId: pRow!.id, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${DEV_PRINCIPLES.length} principles`)

  // Glossary
  for (const g of DEV_GLOSSARY) {
    const existing = await db.query.glossaryTerms.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.term, g.term)),
    })
    if (existing) continue
    const [termRow] = await db.insert(glossaryTerms).values({
      term: g.term,
      definition: g.definition,
      definitionSource: (g as { definitionSource?: string }).definitionSource ?? null,
      definitionSourceUrl: (g as { definitionSourceUrl?: string }).definitionSourceUrl ?? null,
      domain: g.domain ?? null,
      notes: g.notes ?? null,
      status: g.status,
      visibility: g.visibility,
      organizationId: devOrgId,
    }).returning()
    const gSources = (g as { sources?: { name: string; url?: string; definition: string }[] }).sources
    if (gSources && gSources.length > 0) {
      await db.insert(glossaryTermSources).values(
        gSources.map(s => ({ termId: termRow.id, name: s.name, url: s.url ?? null, definition: s.definition }))
      )
    }
  }
  console.log(`  ✓ ${DEV_GLOSSARY.length} glossary terms`)

  // Services + junction links
  for (const svc of DEV_SERVICES) {
    const existing = await db.query.services.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, svc.name)),
    })
    let svcId: string
    if (existing) {
      svcId = existing.id
    } else {
      const [inserted] = await db.insert(services).values({
        organizationId: devOrgId,
        name: svc.name,
        description: svc.description,
        serviceOwner: svc.serviceOwner,
        channels: svc.channels,
        status: svc.status,
        visibility: svc.visibility,
      }).returning()
      svcId = inserted.id
    }

    for (const capName of svc.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.serviceCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(serviceCapabilities).values({ serviceId: svcId, capabilityId: capId })
    }

    for (const personaName of svc.personas) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.servicePersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(servicePersonas).values({ serviceId: svcId, personaId })
    }

    for (const vsName of svc.valueStreams) {
      const vsId = devValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.serviceValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(serviceValueStreams).values({ serviceId: svcId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${DEV_SERVICES.length} services with capability, persona, and value stream links`)

  // Application Type taxonomy + entity definition (pilot for base-item taxonomy foundation)
  let appTypeTermId: string
  const existingAppTypeType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'application-type')),
  })
  if (existingAppTypeType) {
    appTypeTermId = existingAppTypeType.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Application Type',
      slug: 'application-type',
      description: 'Classification of applications by their primary purpose or delivery model.',
      sortOrder: '50',
    }).returning()
    appTypeTermId = inserted.id
  }
  const APP_TYPE_VALUES = ['Core Business System', 'Shared Service', 'Integration Platform', 'Reporting & Analytics', 'Public-Facing Service', 'Internal Tool']
  for (const name of APP_TYPE_VALUES) {
    await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      parentId: appTypeTermId,
      name,
      slug: toSlug(name),
    }).onConflictDoNothing()
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'application',
    taxonomyTypeId: appTypeTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Application Type taxonomy type + entity definition')

  // Capability Priority taxonomy + entity definition (base-item foundation: second entity pilot)
  let capPriorityTermId: string
  const existingCapPriority = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'capability-priority')),
  })
  if (existingCapPriority) {
    capPriorityTermId = existingCapPriority.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Capability Priority',
      slug: 'capability-priority',
      description: 'Strategic importance of the capability to the organization.',
      sortOrder: '60',
    }).returning()
    capPriorityTermId = inserted.id
  }
  const CAP_PRIORITY_VALUES = ['Critical', 'High', 'Medium', 'Low']
  for (const name of CAP_PRIORITY_VALUES) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, capPriorityTermId), e(t.slug, slug)),
    })
    if (!existing) {
      await db.insert(taxonomyTerms).values({
        organizationId: devOrgId,
        parentId: capPriorityTermId,
        name,
        slug,
      })
    }
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'capability',
    taxonomyTypeId: capPriorityTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Capability Priority taxonomy type + entity definition')

  // Value Chain taxonomy + entity definition (#694). v1 of value chains is a
  // capabilities-only, taxonomy-backed grouping — the recognized gov reference-
  // architecture pattern (value chain → capabilities), reversible and built on
  // the existing entity-taxonomy mechanism, not a new entity. See
  // docs/design/value-chains.md.
  let valueChainTermId: string
  const existingValueChain = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'value-chain')),
  })
  if (existingValueChain) {
    valueChainTermId = existingValueChain.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Value Chain',
      slug: 'value-chain',
      description: 'The end-to-end public-value stream a capability contributes to — the top-level grouping of the capability map.',
      sortOrder: '70',
    }).returning()
    valueChainTermId = inserted.id
  }
  const VALUE_CHAIN_VALUES = [
    'Public Safety & Justice',
    'Health & Human Services',
    'Infrastructure & Environment',
    'Economic & Community Development',
    'Administration & Support',
  ]
  for (const name of VALUE_CHAIN_VALUES) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, valueChainTermId), e(t.slug, slug)),
    })
    if (!existing) {
      await db.insert(taxonomyTerms).values({
        organizationId: devOrgId,
        parentId: valueChainTermId,
        name,
        slug,
      })
    }
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'capability',
    taxonomyTypeId: valueChainTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 1,
  }).onConflictDoNothing()
  console.log('  ✓ Value Chain taxonomy type + entity definition')

  // Objective Category taxonomy + entity definition
  let objCategoryTermId: string
  const existingObjCategory = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'objective-category')),
  })
  if (existingObjCategory) {
    objCategoryTermId = existingObjCategory.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Objective Category',
      slug: 'objective-category',
      description: 'Classification of strategic objectives by organisational scope.',
      sortOrder: '70',
    }).returning()
    objCategoryTermId = inserted.id
  }
  for (const name of ['Strategic', 'Operational', 'Tactical']) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, objCategoryTermId), e(t.slug, slug)),
    })
    if (!existing) await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: objCategoryTermId, name, slug })
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'objective',
    taxonomyTypeId: objCategoryTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Objective Category taxonomy type + entity definition')

  // Initiative Type taxonomy + entity definition
  let initiativeTypeTermId: string
  const existingInitiativeType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'initiative-type')),
  })
  if (existingInitiativeType) {
    initiativeTypeTermId = existingInitiativeType.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Initiative Type',
      slug: 'initiative-type',
      description: 'Nature of the work being undertaken by the initiative.',
      sortOrder: '80',
    }).returning()
    initiativeTypeTermId = inserted.id
  }
  for (const name of ['Transformation', 'Compliance', 'Maintenance', 'Innovation']) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, initiativeTypeTermId), e(t.slug, slug)),
    })
    if (!existing) await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: initiativeTypeTermId, name, slug })
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'initiative',
    taxonomyTypeId: initiativeTypeTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Initiative Type taxonomy type + entity definition')

  // Decision Category taxonomy + entity definition (for ADRs)
  let decisionCategoryTermId: string
  const existingDecisionCategory = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'decision-category')),
  })
  if (existingDecisionCategory) {
    decisionCategoryTermId = existingDecisionCategory.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Decision Category',
      slug: 'decision-category',
      description: 'Domain of the architecture decision record.',
      sortOrder: '90',
    }).returning()
    decisionCategoryTermId = inserted.id
  }
  for (const name of ['Technology', 'Architecture', 'Process', 'Security', 'Data']) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, decisionCategoryTermId), e(t.slug, slug)),
    })
    if (!existing) await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: decisionCategoryTermId, name, slug })
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'adr',
    taxonomyTypeId: decisionCategoryTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Decision Category taxonomy type + entity definition (ADR)')

  // Principle Scope taxonomy + entity definition
  let principleScopeTermId: string
  const existingPrincipleScope = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and, isNull }) =>
      and(e(t.organizationId, devOrgId), isNull(t.parentId), e(t.slug, 'principle-scope')),
  })
  if (existingPrincipleScope) {
    principleScopeTermId = existingPrincipleScope.id
  } else {
    const [inserted] = await db.insert(taxonomyTerms).values({
      organizationId: devOrgId,
      name: 'Principle Scope',
      slug: 'principle-scope',
      description: 'How broadly this principle applies within the organisation.',
      sortOrder: '100',
    }).returning()
    principleScopeTermId = inserted.id
  }
  for (const name of ['Enterprise', 'Domain', 'Team']) {
    const slug = toSlug(name)
    const existing = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) =>
        and(e(t.organizationId, devOrgId), e(t.parentId, principleScopeTermId), e(t.slug, slug)),
    })
    if (!existing) await db.insert(taxonomyTerms).values({ organizationId: devOrgId, parentId: principleScopeTermId, name, slug })
  }
  await db.insert(entityTaxonomyDefinitions).values({
    organizationId: devOrgId,
    entityType: 'principle',
    taxonomyTypeId: principleScopeTermId,
    selectionMode: 'single',
    required: false,
    sortOrder: 0,
  }).onConflictDoNothing()
  console.log('  ✓ Principle Scope taxonomy type + entity definition')

  // Data Architecture metamodel (#363 / #481) ──────────────────────────────

  const devDataEntityIds: Record<string, string> = {}
  for (const e of DEV_DATA_ENTITIES) {
    const existing = await db.query.dataEntities.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.organizationId, devOrgId), eq2(t.name, e.name)),
    })
    let entityId: string
    if (existing) {
      await db.update(dataEntities).set({
        description: e.description, status: e.status, visibility: e.visibility,
        physicalHubTableName: e.physicalHubTableName, serverName: e.serverName,
        databaseName: e.databaseName, schemaName: e.schemaName, updatedAt: new Date(),
      }).where(eq(dataEntities.id, existing.id))
      entityId = existing.id
    } else {
      const [inserted] = await db.insert(dataEntities).values({
        organizationId: devOrgId,
        name: e.name, description: e.description, status: e.status, visibility: e.visibility,
        physicalHubTableName: e.physicalHubTableName, serverName: e.serverName,
        databaseName: e.databaseName, schemaName: e.schemaName,
      }).returning()
      entityId = inserted.id
    }
    devDataEntityIds[e.name] = entityId
    for (const personaName of e.owners) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const ownerExists = await db.query.dataEntityOwners.findFirst({
        where: (t, { eq: eq2, and }) => and(eq2(t.dataEntityId, entityId), eq2(t.personaId, personaId)),
      })
      if (!ownerExists) await db.insert(dataEntityOwners).values({ dataEntityId: entityId, personaId })
    }
  }
  console.log(`  ✓ ${DEV_DATA_ENTITIES.length} data entities`)

  const devDataAttributeIds: Record<string, string> = {}
  for (const a of DEV_DATA_ATTRIBUTES) {
    const existing = await db.query.dataAttributes.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.organizationId, devOrgId), eq2(t.name, a.name)),
    })
    let attrId: string
    if (existing) {
      await db.update(dataAttributes).set({
        description: a.description, status: a.status, visibility: a.visibility,
        physicalSatelliteTableName: a.physicalSatelliteTableName, serverName: a.serverName,
        databaseName: a.databaseName, schemaName: a.schemaName,
        physicalAttributeType: a.physicalAttributeType, updatedAt: new Date(),
      }).where(eq(dataAttributes.id, existing.id))
      attrId = existing.id
    } else {
      const [inserted] = await db.insert(dataAttributes).values({
        organizationId: devOrgId,
        name: a.name, description: a.description, status: a.status, visibility: a.visibility,
        physicalSatelliteTableName: a.physicalSatelliteTableName, serverName: a.serverName,
        databaseName: a.databaseName, schemaName: a.schemaName,
        physicalAttributeType: a.physicalAttributeType,
      }).returning()
      attrId = inserted.id
    }
    devDataAttributeIds[a.name] = attrId
    for (const personaName of a.owners) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const ownerExists = await db.query.dataAttributeOwners.findFirst({
        where: (t, { eq: eq2, and }) => and(eq2(t.dataAttributeId, attrId), eq2(t.personaId, personaId)),
      })
      if (!ownerExists) await db.insert(dataAttributeOwners).values({ dataAttributeId: attrId, personaId })
    }
    for (const entityName of a.entityLinks) {
      const entityId = devDataEntityIds[entityName]
      if (!entityId) continue
      const linkExists = await db.query.dataEntityAttributeLinks.findFirst({
        where: (t, { eq: eq2, and }) => and(eq2(t.dataEntityId, entityId), eq2(t.dataAttributeId, attrId)),
      })
      if (!linkExists) await db.insert(dataEntityAttributeLinks).values({
        organizationId: devOrgId, dataEntityId: entityId, dataAttributeId: attrId,
      })
    }
  }
  console.log(`  ✓ ${DEV_DATA_ATTRIBUTES.length} data attributes with owner and entity links`)

  const devDataLinkIds: Record<string, string> = {}
  for (const l of DEV_DATA_LINKS) {
    const existing = await db.query.dataLinks.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.organizationId, devOrgId), eq2(t.name, l.name)),
    })
    let linkId: string
    if (existing) {
      await db.update(dataLinks).set({
        description: l.description, status: l.status, visibility: l.visibility,
        physicalLinkTableName: l.physicalLinkTableName, serverName: l.serverName,
        databaseName: l.databaseName, schemaName: l.schemaName,
        physicalLinkType: l.physicalLinkType, updatedAt: new Date(),
      }).where(eq(dataLinks.id, existing.id))
      linkId = existing.id
    } else {
      const [inserted] = await db.insert(dataLinks).values({
        organizationId: devOrgId,
        name: l.name, description: l.description, status: l.status, visibility: l.visibility,
        physicalLinkTableName: l.physicalLinkTableName, serverName: l.serverName,
        databaseName: l.databaseName, schemaName: l.schemaName,
        physicalLinkType: l.physicalLinkType,
      }).returning()
      linkId = inserted.id
    }
    devDataLinkIds[l.name] = linkId
    for (const personaName of l.owners) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const ownerExists = await db.query.dataLinkOwners.findFirst({
        where: (t, { eq: eq2, and }) => and(eq2(t.dataLinkId, linkId), eq2(t.personaId, personaId)),
      })
      if (!ownerExists) await db.insert(dataLinkOwners).values({ dataLinkId: linkId, personaId })
    }
  }
  console.log(`  ✓ ${DEV_DATA_LINKS.length} data links`)

  for (const bk of DEV_DATA_BUSINESS_KEYS) {
    const entityId = devDataEntityIds[bk.entityName]
    if (!entityId) continue
    const existing = await db.query.dataBusinessKeys.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.organizationId, devOrgId), eq2(t.name, bk.name)),
    })
    let bkId: string
    if (existing) {
      await db.update(dataBusinessKeys).set({
        description: bk.description, status: bk.status, visibility: bk.visibility,
        dataType: bk.dataType, updatedAt: new Date(),
      }).where(eq(dataBusinessKeys.id, existing.id))
      bkId = existing.id
    } else {
      const [inserted] = await db.insert(dataBusinessKeys).values({
        organizationId: devOrgId,
        name: bk.name, description: bk.description, status: bk.status, visibility: bk.visibility,
        dataType: bk.dataType, owningDataEntityId: entityId,
      }).returning()
      bkId = inserted.id
    }
    for (const personaName of bk.owners) {
      const personaId = devPersonaIds[personaName]
      if (!personaId) continue
      const ownerExists = await db.query.dataBusinessKeyOwners.findFirst({
        where: (t, { eq: eq2, and }) => and(eq2(t.dataBusinessKeyId, bkId), eq2(t.personaId, personaId)),
      })
      if (!ownerExists) await db.insert(dataBusinessKeyOwners).values({ dataBusinessKeyId: bkId, personaId })
    }
  }
  console.log(`  ✓ ${DEV_DATA_BUSINESS_KEYS.length} business keys`)

  // Entity ↔ Entity "is related" + Attribute ↔ Attribute "shares"
  // Both tables have a canonical-ordering check (left < right). Sort UUIDs at seed time.
  for (const rel of DEV_DATA_ENTITY_RELATIONS) {
    const idA = devDataEntityIds[rel.leftEntityName]
    const idB = devDataEntityIds[rel.rightEntityName]
    if (!idA || !idB) continue
    const [leftId, rightId] = idA < idB ? [idA, idB] : [idB, idA]
    const exists = await db.query.dataEntityRelations.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.leftDataEntityId, leftId), eq2(t.rightDataEntityId, rightId)),
    })
    if (!exists) await db.insert(dataEntityRelations).values({
      organizationId: devOrgId, leftDataEntityId: leftId, rightDataEntityId: rightId,
    })
  }
  for (const share of DEV_DATA_ATTRIBUTE_SHARES) {
    const idA = devDataAttributeIds[share.leftAttributeName]
    const idB = devDataAttributeIds[share.rightAttributeName]
    if (!idA || !idB) continue
    const [leftId, rightId] = idA < idB ? [idA, idB] : [idB, idA]
    const exists = await db.query.dataAttributeShares.findFirst({
      where: (t, { eq: eq2, and }) => and(eq2(t.leftDataAttributeId, leftId), eq2(t.rightDataAttributeId, rightId)),
    })
    if (!exists) await db.insert(dataAttributeShares).values({
      organizationId: devOrgId, leftDataAttributeId: leftId, rightDataAttributeId: rightId,
    })
  }
  console.log(`  ✓ entity-entity and attribute-attribute cross-object relationships`)

  // ── Org 2: Office of Digital Services (state agency) ────────────────────

  console.log('\n[Org 2] Office of Digital Services')
  const stateOrgId = await findOrCreateOrg(STATE_ORG.slug, STATE_ORG.name)

  for (const u of STATE_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: stateOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${STATE_USERS.length} users (password: dev-password)`)

  const statePersonaIds: Record<string, string> = {}
  for (const p of STATE_PERSONAS) {
    statePersonaIds[p.name] = await findOrCreatePersona(stateOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${STATE_PERSONAS.length} personas`)

  const stateCapabilityIds: Record<string, string> = {}
  for (const c of STATE_CAPABILITIES) {
    const capId = await findOrCreateCapability(stateOrgId, c.name, {
      description: c.description, domain: c.domain, status: c.status, visibility: c.visibility,
    })
    stateCapabilityIds[c.name] = capId
    for (const personaName of c.personas) {
      const personaId = statePersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.capabilityPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.capabilityId, capId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${STATE_CAPABILITIES.length} capabilities`)

  for (const a of STATE_APPLICATIONS) {
    const appId = await findOrCreateApplication(stateOrgId, a.name, {
      description: a.description, vendor: a.vendor, hostingModel: a.hostingModel,
      lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    for (const capName of a.capabilities) {
      const capId = stateCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${STATE_APPLICATIONS.length} applications`)

  // ── Org 3: GovEA Project ─────────────────────────────────────────────────

  console.log('\n[Org 3] GovEA Project')
  const goveaProjectOrgId = await findOrCreateOrg(GOVEA_PROJECT_ORG.slug, GOVEA_PROJECT_ORG.name)

  // #518 dogfood refresh: remove applications that previously existed in the
  // GovEA Project org but were retired with the 2026-05-26 seed rewrite (the
  // upsert pattern would otherwise leave them behind as orphans).
  if (RETIRED_GOVEA_PROJECT_APPLICATIONS.length > 0) {
    const retiredNames = [...RETIRED_GOVEA_PROJECT_APPLICATIONS] as string[]
    const removed = await db.delete(applications).where(and(
      eq(applications.organizationId, goveaProjectOrgId),
      inArray(applications.name, retiredNames),
    )).returning({ name: applications.name })
    if (removed.length > 0) {
      console.log(`  ✓ removed ${removed.length} retired applications: ${removed.map(r => r.name).join(', ')}`)
    }
  }

  for (const u of GOVEA_PROJECT_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: goveaProjectOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${GOVEA_PROJECT_USERS.length} users (password: dev-password)`)

  const goveaProjectPersonaIds: Record<string, string> = {}
  for (const p of GOVEA_PROJECT_PERSONAS) {
    goveaProjectPersonaIds[p.name] = await findOrCreatePersona(goveaProjectOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${GOVEA_PROJECT_PERSONAS.length} personas`)

  const goveaProjectCapabilityIds: Record<string, string> = {}
  for (const c of GOVEA_PROJECT_CAPABILITIES) {
    const capId = await findOrCreateCapability(goveaProjectOrgId, c.name, {
      description: c.description, domain: c.domain,
      behaviors: (c as { behaviors?: string }).behaviors,
      rules: (c as { rules?: string }).rules,
      status: c.status, visibility: c.visibility,
    })
    goveaProjectCapabilityIds[c.name] = capId
    for (const personaName of c.personas) {
      const personaId = goveaProjectPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.capabilityPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.capabilityId, capId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_CAPABILITIES.length} capabilities`)

  const goveaProjectApplicationIds: Record<string, string> = {}
  for (const a of GOVEA_PROJECT_APPLICATIONS) {
    const appId = await findOrCreateApplication(goveaProjectOrgId, a.name, {
      description: a.description, vendor: a.vendor, hostingModel: a.hostingModel,
      lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    goveaProjectApplicationIds[a.name] = appId
    for (const capName of a.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_APPLICATIONS.length} applications`)

  // Value Streams + stages + stage capability links + persona links
  const goveaProjectValueStreamIds: Record<string, string> = {}
  for (const vs of GOVEA_PROJECT_VALUE_STREAMS) {
    const existingVs = await db.query.valueStreams.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, vs.name)),
    })
    let vsId: string
    if (existingVs) {
      vsId = existingVs.id
    } else {
      const [inserted] = await db.insert(valueStreams).values({
        organizationId: goveaProjectOrgId,
        name: vs.name, description: vs.description, valueItem: vs.valueItem,
        status: vs.status, visibility: vs.visibility,
      }).returning()
      vsId = inserted.id
    }
    goveaProjectValueStreamIds[vs.name] = vsId

    for (const personaName of vs.stakeholderPersonas) {
      const personaId = goveaProjectPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.valueStreamPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(valueStreamPersonas).values({ valueStreamId: vsId, personaId })
    }

    for (const stage of vs.stages) {
      const existingStage = await db.query.valueStreamStages.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.name, stage.name)),
      })
      let stageId: string
      if (existingStage) {
        stageId = existingStage.id
      } else {
        const [insertedStage] = await db.insert(valueStreamStages).values({
          valueStreamId: vsId, name: stage.name, description: stage.description, order: stage.order,
        }).returning()
        stageId = insertedStage.id
      }
      for (const capName of stage.capabilities) {
        const capId = goveaProjectCapabilityIds[capName]
        if (!capId) continue
        const exists = await db.query.valueStreamStageCapabilities.findFirst({
          where: (t, { eq: e, and }) => and(e(t.stageId, stageId), e(t.capabilityId, capId)),
        })
        if (!exists) await db.insert(valueStreamStageCapabilities).values({ stageId, capabilityId: capId })
      }
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_VALUE_STREAMS.length} value streams with stages and persona links`)

  // Strategic Objectives + capability / value stream links
  const goveaProjectObjectiveIds: Record<string, string> = {}
  for (const o of GOVEA_PROJECT_OBJECTIVES) {
    const existing = await db.query.strategicObjectives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, o.name)),
    })
    let objId: string
    if (existing) {
      objId = existing.id
    } else {
      const [inserted] = await db.insert(strategicObjectives).values({
        organizationId: goveaProjectOrgId,
        name: o.name, description: o.description,
        successMetric: o.successMetric, timeHorizon: o.timeHorizon,
        status: o.status, visibility: o.visibility,
      }).returning()
      objId = inserted.id
    }
    goveaProjectObjectiveIds[o.name] = objId

    for (const capName of o.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.objectiveCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(objectiveCapabilities).values({ objectiveId: objId, capabilityId: capId })
    }

    for (const vsName of o.valueStreams) {
      const vsId = goveaProjectValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.objectiveValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(objectiveValueStreams).values({ objectiveId: objId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_OBJECTIVES.length} strategic objectives`)

  // Goals + goalObjectives junction
  for (const g of GOVEA_PROJECT_GOALS) {
    const existing = await db.query.goals.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, g.name)),
    })
    let goalId: string
    if (existing) {
      await db.update(goals).set({
        description: g.description,
        planningHorizon: g.planningHorizon,
        owner: g.owner,
        status: g.status,
        visibility: g.visibility,
      }).where(eq(goals.id, existing.id))
      goalId = existing.id
    } else {
      const [inserted] = await db.insert(goals).values({
        organizationId: goveaProjectOrgId,
        name: g.name,
        description: g.description,
        planningHorizon: g.planningHorizon,
        owner: g.owner,
        status: g.status,
        visibility: g.visibility,
      }).returning()
      goalId = inserted.id
    }

    for (const objName of g.objectives) {
      const objId = goveaProjectObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.goalObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.goalId, goalId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(goalObjectives).values({ goalId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_GOALS.length} goals with objective links`)

  // Initiatives + capability / application / objective links
  const goveaProjectInitiativeIds: Record<string, string> = {}
  for (const ini of GOVEA_PROJECT_INITIATIVES) {
    const existingIni = await db.query.initiatives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, ini.name)),
    })
    let iniId: string
    if (existingIni) {
      iniId = existingIni.id
    } else {
      const [inserted] = await db.insert(initiatives).values({
        organizationId: goveaProjectOrgId,
        name: ini.name, description: ini.description,
        status: ini.status, startDate: ini.startDate, endDate: ini.endDate ?? undefined,
      }).returning()
      iniId = inserted.id
    }
    goveaProjectInitiativeIds[ini.name] = iniId

    for (const { name: capName, impact } of ini.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.initiativeCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(initiativeCapabilities).values({ initiativeId: iniId, capabilityId: capId, impact })
    }

    for (const { name: appName, impact } of ini.applications) {
      const appId = goveaProjectApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.initiativeApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(initiativeApplications).values({ initiativeId: iniId, applicationId: appId, impact })
    }

    for (const objName of ini.objectives) {
      const objId = goveaProjectObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.initiativeObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(initiativeObjectives).values({ initiativeId: iniId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_INITIATIVES.length} initiatives`)

  // ADRs — insert all records first (without supersededBy), then resolve self-references
  const goveaProjectAdrIds: Record<string, string> = {}
  for (const adr of GOVEA_PROJECT_ADRS) {
    const existingAdr = await db.query.adrs.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.number, adr.number)),
    })
    let adrId: string
    if (existingAdr) {
      adrId = existingAdr.id
    } else {
      const [inserted] = await db.insert(adrs).values({
        organizationId: goveaProjectOrgId,
        number: adr.number, title: adr.title, context: adr.context,
        decision: adr.decision, consequences: adr.consequences, status: adr.status,
      }).returning()
      adrId = inserted.id
    }
    goveaProjectAdrIds[adr.number] = adrId
  }

  for (const adr of GOVEA_PROJECT_ADRS) {
    if (!adr.supersededByNumber) continue
    const adrId = goveaProjectAdrIds[adr.number]
    const supersedingId = goveaProjectAdrIds[adr.supersededByNumber]
    if (adrId && supersedingId) {
      await db.update(adrs).set({ supersededBy: supersedingId }).where(eq(adrs.id, adrId))
    }
  }

  for (const adr of GOVEA_PROJECT_ADRS) {
    const adrId = goveaProjectAdrIds[adr.number]
    if (!adrId) continue

    for (const capName of adr.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.adrCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(adrCapabilities).values({ adrId, capabilityId: capId })
    }

    for (const iniName of adr.initiatives) {
      const iniId = goveaProjectInitiativeIds[iniName]
      if (!iniId) continue
      const exists = await db.query.adrInitiatives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.initiativeId, iniId)),
      })
      if (!exists) await db.insert(adrInitiatives).values({ adrId, initiativeId: iniId })
    }

    for (const objName of adr.objectives) {
      const objId = goveaProjectObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.adrObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(adrObjectives).values({ adrId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_ADRS.length} ADRs with junction links and supersededBy chain`)

  // Principles + capability links
  for (const p of GOVEA_PROJECT_PRINCIPLES) {
    const existing = await db.query.principles.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, p.name)),
    })
    let pRow: typeof existing
    if (existing) {
      await db.update(principles).set({ principleType: p.principleType }).where(eq(principles.id, existing.id))
      pRow = existing
    } else {
      const [inserted] = await db.insert(principles).values({
        name: p.name, description: p.description ?? null, title: p.title ?? null,
        rationale: p.rationale, implications: p.implications, principleType: p.principleType,
        status: p.status, visibility: p.visibility, organizationId: goveaProjectOrgId,
      }).returning()
      pRow = inserted
    }
    for (const capName of p.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.principleCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.principleId, pRow!.id), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(principleCapabilities).values({ principleId: pRow!.id, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_PRINCIPLES.length} principles`)

  // Glossary
  for (const g of GOVEA_PROJECT_GLOSSARY) {
    const existing = await db.query.glossaryTerms.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.term, g.term)),
    })
    if (existing) continue
    await db.insert(glossaryTerms).values({
      term: g.term, definition: g.definition,
      definitionSource: (g as { definitionSource?: string }).definitionSource ?? null,
      definitionSourceUrl: null,
      domain: g.domain ?? null,
      notes: (g as { notes?: string }).notes ?? null,
      status: g.status, visibility: g.visibility, organizationId: goveaProjectOrgId,
    })
  }
  console.log(`  ✓ ${GOVEA_PROJECT_GLOSSARY.length} glossary terms`)

  // Services + junction links
  for (const svc of GOVEA_PROJECT_SERVICES) {
    const existing = await db.query.services.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.name, svc.name)),
    })
    let svcId: string
    if (existing) {
      svcId = existing.id
    } else {
      const [inserted] = await db.insert(services).values({
        organizationId: goveaProjectOrgId,
        name: svc.name, description: svc.description,
        serviceOwner: svc.serviceOwner, channels: svc.channels,
        status: svc.status, visibility: svc.visibility,
      }).returning()
      svcId = inserted.id
    }

    for (const capName of svc.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.serviceCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(serviceCapabilities).values({ serviceId: svcId, capabilityId: capId })
    }

    for (const personaName of svc.personas) {
      const personaId = goveaProjectPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.servicePersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(servicePersonas).values({ serviceId: svcId, personaId })
    }

    for (const vsName of svc.valueStreams) {
      const vsId = goveaProjectValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.serviceValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(serviceValueStreams).values({ serviceId: svcId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_SERVICES.length} services with capability, persona, and value stream links`)

  // Architecture debt + capability / application / initiative junctions (#518).
  // Mirrors open ARB findings (#10, #34, #35) and active risk-register items.
  for (const d of GOVEA_PROJECT_DEBT) {
    const existing = await db.query.architectureDebtItems.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, goveaProjectOrgId), e(t.title, d.title)),
    })
    let debtId: string
    if (existing) {
      await db.update(architectureDebtItems).set({
        description: d.summary,
        debtType: d.debtType,
        severity: d.severity,
        status: d.status,
        securitySensitive: d.securitySensitive,
      }).where(eq(architectureDebtItems.id, existing.id))
      debtId = existing.id
    } else {
      const [inserted] = await db.insert(architectureDebtItems).values({
        organizationId: goveaProjectOrgId,
        title: d.title,
        description: d.summary,
        debtType: d.debtType,
        severity: d.severity,
        status: d.status,
        securitySensitive: d.securitySensitive,
        source: 'human',
      }).returning()
      debtId = inserted.id
    }

    for (const capName of d.capabilities) {
      const capId = goveaProjectCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.debtCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.debtItemId, debtId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(debtCapabilities).values({ debtItemId: debtId, capabilityId: capId })
    }

    for (const appName of d.applications) {
      const appId = goveaProjectApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.debtApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.debtItemId, debtId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(debtApplications).values({ debtItemId: debtId, applicationId: appId })
    }

    for (const iniName of d.initiatives) {
      const iniId = goveaProjectInitiativeIds[iniName]
      if (!iniId) continue
      const exists = await db.query.debtInitiatives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.debtItemId, debtId), e(t.initiativeId, iniId)),
      })
      if (!exists) await db.insert(debtInitiatives).values({ debtItemId: debtId, initiativeId: iniId })
    }
  }
  console.log(`  ✓ ${GOVEA_PROJECT_DEBT.length} architecture debt items with capability/application/initiative links`)

  // ── Multi-org: connection + cross-org capability links ────────────────────

  console.log('\n[Multi-org]')

  const existingConnection = await db.query.orgConnections.findFirst({
    where: (t, { eq: e, and }) => and(e(t.fromOrgId, devOrgId), e(t.toOrgId, stateOrgId)),
  })
  if (!existingConnection) {
    await db.insert(orgConnections).values({ fromOrgId: devOrgId, toOrgId: stateOrgId, status: 'active' })
  }
  console.log('  ✓ Org connection (active): City of Riverdale → Office of Digital Services')

  for (const link of DEV_CROSS_ORG_LINKS) {
    const sourceCapId = devCapabilityIds[link.sourceCapabilityName]
    const targetCapId = stateCapabilityIds[link.targetCapabilityName]
    if (!sourceCapId || !targetCapId) continue

    const existingLink = await db.query.crossOrgLinks.findFirst({
      where: (t, { eq: e, and }) => and(e(t.sourceEntityId, sourceCapId), e(t.targetEntityId, targetCapId)),
    })
    if (!existingLink) {
      await db.insert(crossOrgLinks).values({
        sourceOrgId: devOrgId,
        sourceEntityType: 'capability',
        sourceEntityId: sourceCapId,
        targetOrgId: stateOrgId,
        targetEntityType: 'capability',
        targetEntityId: targetCapId,
        linkType: link.linkType,
        status: 'pending',
      })
    } else if (existingLink.status !== 'pending' || existingLink.linkType !== link.linkType) {
      await db.update(crossOrgLinks)
        .set({ status: 'pending', linkType: link.linkType })
        .where(eq(crossOrgLinks.id, existingLink.id))
    }
    console.log(`  ✓ Cross-org link (${link.linkType}): "${link.sourceCapabilityName}" → "${link.targetCapabilityName}"`)
  }

  // ── Reverse-direction cross-org links (#543) ──────────────────────────────
  // The links above are all Riverdale → ODS, leaving Alice (Agency EA
  // Coordinator at Riverdale) with zero inbound requests to approve in the
  // seed. The "Awaiting your approval" branch in cross-org-links-panel.tsx
  // was unreachable. Seed the reverse direction so the inbound-approval flow
  // is exercisable end-to-end in the dev demo.

  const existingReverseConnection = await db.query.orgConnections.findFirst({
    where: (t, { eq: e, and }) => and(e(t.fromOrgId, stateOrgId), e(t.toOrgId, devOrgId)),
  })
  if (!existingReverseConnection) {
    await db.insert(orgConnections).values({ fromOrgId: stateOrgId, toOrgId: devOrgId, status: 'active' })
  }
  console.log('  ✓ Reverse org connection (active): Office of Digital Services → City of Riverdale')

  for (const link of STATE_INBOUND_CROSS_ORG_LINKS) {
    const sourceCapId = stateCapabilityIds[link.sourceCapabilityName]
    const targetCapId = devCapabilityIds[link.targetCapabilityName]
    if (!sourceCapId || !targetCapId) continue

    const existingLink = await db.query.crossOrgLinks.findFirst({
      where: (t, { eq: e, and }) => and(e(t.sourceEntityId, sourceCapId), e(t.targetEntityId, targetCapId)),
    })
    if (!existingLink) {
      await db.insert(crossOrgLinks).values({
        sourceOrgId: stateOrgId,
        sourceEntityType: 'capability',
        sourceEntityId: sourceCapId,
        targetOrgId: devOrgId,
        targetEntityType: 'capability',
        targetEntityId: targetCapId,
        linkType: link.linkType,
        status: 'pending',
      })
    } else if (existingLink.status !== 'pending' || existingLink.linkType !== link.linkType) {
      await db.update(crossOrgLinks)
        .set({ status: 'pending', linkType: link.linkType })
        .where(eq(crossOrgLinks.id, existingLink.id))
    }
    console.log(`  ✓ Inbound cross-org link (${link.linkType}): "${link.sourceCapabilityName}" → "${link.targetCapabilityName}" [Riverdale-side awaits approval]`)
  }

  // ── Org 5: City of Hartfield (TOGAF overlay demo) ───────────────────────

  console.log('\n[Org 5] City of Hartfield (TOGAF overlay demo)')
  const togafOrgId = await findOrCreateOrg(TOGAF_ORG.slug, TOGAF_ORG.name)

  for (const u of TOGAF_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: togafOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${TOGAF_USERS.length} users (password: dev-password)`)

  const togafPersonaIds: Record<string, string> = {}
  for (const p of TOGAF_PERSONAS) {
    togafPersonaIds[p.name] = await findOrCreatePersona(togafOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${TOGAF_PERSONAS.length} personas`)

  const togafCapabilityIds: Record<string, string> = {}
  for (const c of TOGAF_CAPABILITIES) {
    const capId = await findOrCreateCapability(togafOrgId, c.name, {
      description: c.description, domain: c.domain,
      behaviors: (c as { behaviors?: string }).behaviors,
      rules: (c as { rules?: string }).rules,
      status: c.status, visibility: c.visibility,
    })
    togafCapabilityIds[c.name] = capId
    for (const personaName of c.personas) {
      const personaId = togafPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.capabilityPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.capabilityId, capId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${TOGAF_CAPABILITIES.length} capabilities`)

  const togafApplicationIds: Record<string, string> = {}
  for (const a of TOGAF_APPLICATIONS) {
    const appId = await findOrCreateApplication(togafOrgId, a.name, {
      description: a.description, vendor: a.vendor, hostingModel: a.hostingModel,
      lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    togafApplicationIds[a.name] = appId
    for (const capName of a.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${TOGAF_APPLICATIONS.length} applications (Laserfiche intentionally unlinked — see ADR-004)`)

  // Value Streams + stages + stage capability links + persona links
  const togafValueStreamIds: Record<string, string> = {}
  for (const vs of TOGAF_VALUE_STREAMS) {
    const existingVs = await db.query.valueStreams.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.name, vs.name)),
    })
    let vsId: string
    if (existingVs) {
      vsId = existingVs.id
    } else {
      const [inserted] = await db.insert(valueStreams).values({
        organizationId: togafOrgId,
        name: vs.name, description: vs.description, valueItem: vs.valueItem,
        status: vs.status, visibility: vs.visibility,
      }).returning()
      vsId = inserted.id
    }
    togafValueStreamIds[vs.name] = vsId

    for (const personaName of vs.stakeholderPersonas) {
      const personaId = togafPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.valueStreamPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(valueStreamPersonas).values({ valueStreamId: vsId, personaId })
    }

    for (const stage of vs.stages) {
      const existingStage = await db.query.valueStreamStages.findFirst({
        where: (t, { eq: e, and }) => and(e(t.valueStreamId, vsId), e(t.name, stage.name)),
      })
      let stageId: string
      if (existingStage) {
        stageId = existingStage.id
      } else {
        const [insertedStage] = await db.insert(valueStreamStages).values({
          valueStreamId: vsId, name: stage.name, description: stage.description, order: stage.order,
        }).returning()
        stageId = insertedStage.id
      }
      for (const capName of stage.capabilities) {
        const capId = togafCapabilityIds[capName]
        if (!capId) continue
        const exists = await db.query.valueStreamStageCapabilities.findFirst({
          where: (t, { eq: e, and }) => and(e(t.stageId, stageId), e(t.capabilityId, capId)),
        })
        if (!exists) await db.insert(valueStreamStageCapabilities).values({ stageId, capabilityId: capId })
      }
    }
  }
  console.log(`  ✓ ${TOGAF_VALUE_STREAMS.length} value streams with stages and persona links`)

  // Strategic Objectives + capability / value stream links
  const togafObjectiveIds: Record<string, string> = {}
  for (const o of TOGAF_OBJECTIVES) {
    const existing = await db.query.strategicObjectives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.name, o.name)),
    })
    let objId: string
    if (existing) {
      objId = existing.id
    } else {
      const [inserted] = await db.insert(strategicObjectives).values({
        organizationId: togafOrgId,
        name: o.name, description: o.description,
        successMetric: o.successMetric, timeHorizon: o.timeHorizon,
        status: o.status, visibility: o.visibility,
      }).returning()
      objId = inserted.id
    }
    togafObjectiveIds[o.name] = objId

    for (const capName of o.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.objectiveCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(objectiveCapabilities).values({ objectiveId: objId, capabilityId: capId })
    }

    for (const vsName of o.valueStreams) {
      const vsId = togafValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.objectiveValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(objectiveValueStreams).values({ objectiveId: objId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${TOGAF_OBJECTIVES.length} strategic objectives`)

  // Initiatives + capability / application / objective links
  const togafInitiativeIds: Record<string, string> = {}
  for (const ini of TOGAF_INITIATIVES) {
    const existingIni = await db.query.initiatives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.name, ini.name)),
    })
    let iniId: string
    if (existingIni) {
      iniId = existingIni.id
    } else {
      const [inserted] = await db.insert(initiatives).values({
        organizationId: togafOrgId,
        name: ini.name, description: ini.description,
        status: ini.status, startDate: ini.startDate, endDate: ini.endDate ?? undefined,
      }).returning()
      iniId = inserted.id
    }
    togafInitiativeIds[ini.name] = iniId

    for (const { name: capName, impact } of ini.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.initiativeCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(initiativeCapabilities).values({ initiativeId: iniId, capabilityId: capId, impact })
    }

    for (const { name: appName, impact } of ini.applications) {
      const appId = togafApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.initiativeApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(initiativeApplications).values({ initiativeId: iniId, applicationId: appId, impact })
    }

    for (const objName of ini.objectives) {
      const objId = togafObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.initiativeObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(initiativeObjectives).values({ initiativeId: iniId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${TOGAF_INITIATIVES.length} initiatives`)

  // ADRs — insert all records first, then resolve supersededBy
  const togafAdrIds: Record<string, string> = {}
  for (const adr of TOGAF_ADRS) {
    const existingAdr = await db.query.adrs.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.number, adr.number)),
    })
    let adrId: string
    if (existingAdr) {
      adrId = existingAdr.id
    } else {
      const [inserted] = await db.insert(adrs).values({
        organizationId: togafOrgId,
        number: adr.number, title: adr.title, context: adr.context,
        decision: adr.decision, consequences: adr.consequences, status: adr.status,
      }).returning()
      adrId = inserted.id
    }
    togafAdrIds[adr.number] = adrId
  }

  for (const adr of TOGAF_ADRS) {
    if (!adr.supersededByNumber) continue
    const adrId = togafAdrIds[adr.number]
    const supersedingId = togafAdrIds[adr.supersededByNumber]
    if (adrId && supersedingId) {
      await db.update(adrs).set({ supersededBy: supersedingId }).where(eq(adrs.id, adrId))
    }
  }

  for (const adr of TOGAF_ADRS) {
    const adrId = togafAdrIds[adr.number]
    if (!adrId) continue

    for (const capName of adr.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.adrCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(adrCapabilities).values({ adrId, capabilityId: capId })
    }

    for (const appName of adr.applications) {
      const appId = togafApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.adrApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(adrApplications).values({ adrId, applicationId: appId })
    }

    for (const iniName of adr.initiatives) {
      const iniId = togafInitiativeIds[iniName]
      if (!iniId) continue
      const exists = await db.query.adrInitiatives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.initiativeId, iniId)),
      })
      if (!exists) await db.insert(adrInitiatives).values({ adrId, initiativeId: iniId })
    }

    for (const objName of adr.objectives) {
      const objId = togafObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.adrObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(adrObjectives).values({ adrId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${TOGAF_ADRS.length} ADRs (ADR-004 documents intentional records gap)`)

  // Principles + capability links
  for (const p of TOGAF_PRINCIPLES) {
    const existing = await db.query.principles.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.name, p.name)),
    })
    let pRow: typeof existing
    if (existing) {
      await db.update(principles).set({ principleType: p.principleType }).where(eq(principles.id, existing.id))
      pRow = existing
    } else {
      const [inserted] = await db.insert(principles).values({
        name: p.name, description: p.description ?? null, title: p.title ?? null,
        rationale: p.rationale, implications: p.implications, principleType: p.principleType,
        status: p.status, visibility: p.visibility, organizationId: togafOrgId,
      }).returning()
      pRow = inserted
    }
    for (const capName of p.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.principleCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.principleId, pRow!.id), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(principleCapabilities).values({ principleId: pRow!.id, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${TOGAF_PRINCIPLES.length} principles`)

  // Glossary
  for (const g of TOGAF_GLOSSARY) {
    const existing = await db.query.glossaryTerms.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.term, g.term)),
    })
    if (existing) continue
    const [termRow] = await db.insert(glossaryTerms).values({
      term: g.term,
      definition: g.definition,
      definitionSource: (g as { definitionSource?: string }).definitionSource ?? null,
      definitionSourceUrl: (g as { definitionSourceUrl?: string }).definitionSourceUrl ?? null,
      domain: g.domain ?? null,
      notes: (g as { notes?: string }).notes ?? null,
      status: g.status,
      visibility: g.visibility,
      organizationId: togafOrgId,
    }).returning()
    const gSources = (g as { sources?: { name: string; url?: string; definition: string }[] }).sources
    if (gSources && gSources.length > 0) {
      await db.insert(glossaryTermSources).values(
        gSources.map(s => ({ termId: termRow.id, name: s.name, url: s.url ?? null, definition: s.definition }))
      )
    }
  }
  console.log(`  ✓ ${TOGAF_GLOSSARY.length} glossary terms (TOGAF multi-source definitions)`)

  // Services + junction links
  const togafValueStreamIdsForSvc = togafValueStreamIds
  for (const svc of TOGAF_SERVICES) {
    const existing = await db.query.services.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, togafOrgId), e(t.name, svc.name)),
    })
    let svcId: string
    if (existing) {
      svcId = existing.id
    } else {
      const [inserted] = await db.insert(services).values({
        organizationId: togafOrgId,
        name: svc.name, description: svc.description,
        serviceOwner: svc.serviceOwner, channels: [...svc.channels],
        status: svc.status, visibility: svc.visibility,
      }).returning()
      svcId = inserted.id
    }

    for (const capName of svc.capabilities) {
      const capId = togafCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.serviceCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(serviceCapabilities).values({ serviceId: svcId, capabilityId: capId })
    }

    for (const personaName of svc.personas) {
      const personaId = togafPersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.servicePersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(servicePersonas).values({ serviceId: svcId, personaId })
    }

    for (const vsName of svc.valueStreams) {
      const vsId = togafValueStreamIdsForSvc[vsName]
      if (!vsId) continue
      const exists = await db.query.serviceValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(serviceValueStreams).values({ serviceId: svcId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${TOGAF_SERVICES.length} services with capability, persona, and value stream links`)

  // ── Org 6: Metro Scale Test (stress-test portfolio) ──────────────────────

  console.log('\n[Org 6] Metro Scale Test (scale dataset — 300 capabilities, 500 applications)')
  const scaleOrgId = await findOrCreateOrg(SCALE_ORG.slug, SCALE_ORG.name)

  for (const u of SCALE_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: scaleOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${SCALE_USERS.length} users (scale@govea.dev / dev-password)`)

  const scaleCapabilityIds: Record<string, string> = {}
  for (const c of SCALE_CAPABILITIES) {
    scaleCapabilityIds[c.name] = await findOrCreateCapability(scaleOrgId, c.name, {
      description: c.description, domain: c.domain, status: c.status, visibility: c.visibility,
    })
  }
  console.log(`  ✓ ${SCALE_CAPABILITIES.length} capabilities`)

  for (const a of SCALE_APPLICATIONS) {
    const appId = await findOrCreateApplication(scaleOrgId, a.name, {
      description: a.description, vendor: a.vendor,
      hostingModel: a.hostingModel, lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    for (const capName of a.capabilities) {
      const capId = scaleCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${SCALE_APPLICATIONS.length} applications with capability links`)

  // ── Org 7: GovEA Platform (system org) ───────────────────────────────────

  console.log('\n[Org 7] GovEA Platform (system org)')
  const systemOrgId = await findOrCreateOrg(SYSTEM_ORG.slug, SYSTEM_ORG.name, { isSystemOrg: true })

  for (const u of SYSTEM_USERS) {
    const existing = await db.query.users.findFirst({
      where: (t, { eq: e }) => e(t.email, u.email),
    })
    if (existing) {
      await db.update(users)
        .set({ instanceRole: u.instanceRole })
        .where(eq(users.id, existing.id))
    } else {
      await db.insert(users).values({
        ...u,
        passwordHash,
        organizationId: systemOrgId,
        isActive: 'true',
      })
    }
  }
  console.log(`  ✓ ${SYSTEM_USERS.length} users with instanceRole=instance_admin (dev-password): ${SYSTEM_USERS.map(u => u.email).join(', ')}`)

  // ── Instance settings — enable all modules for dev ────────────────────────
  // Production instances start with every module disabled (opt-in). For dev,
  // we ensure the singleton row exists with all modules available so the full
  // app is reachable without manual toggling.
  const existingInstanceSettings = await db.query.instanceSettings.findFirst()
  if (existingInstanceSettings) {
    await db.update(instanceSettings)
      .set({ disabledModules: {}, updatedAt: new Date() })
      .where(eq(instanceSettings.id, existingInstanceSettings.id))
  } else {
    await db.insert(instanceSettings).values({ disabledModules: {} })
  }
  console.log(`  ✓ instanceSettings: all ${MODULE_DEFS.length} modules enabled`)

  // ── #693 slice 1 (#703): backfill user_organization_memberships ───────────
  // Behavior-neutral — nothing reads memberships yet (auth resolution is slice
  // 2). A single pass over every seeded user, across all orgs, so we don't have
  // to touch each per-org user loop. One membership per user mirroring their
  // current org/role, flagged primary. Idempotent via the (user_id,
  // organization_id) unique index, so re-seeding is a no-op.
  const allUsers = await db
    .select({ id: users.id, organizationId: users.organizationId, role: users.role })
    .from(users)
  for (const u of allUsers) {
    await db.insert(userOrganizationMemberships).values({
      userId: u.id,
      organizationId: u.organizationId,
      role: u.role,
      isPrimary: true,
    }).onConflictDoNothing()
  }
  console.log(`  ✓ ${allUsers.length} user-organization memberships (backfilled, primary)`)

  // #693 slice 3b demo — make one dev user multi-org so the org switcher is
  // exercisable in dev: Alice (City of Riverdale admin) also joins the State
  // org as a contributor. Idempotent.
  const [alice] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'alice@govea.dev')).limit(1)
  const [stateOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, 'office-of-digital-services')).limit(1)
  if (alice && stateOrg) {
    await db.insert(userOrganizationMemberships).values({
      userId: alice.id,
      organizationId: stateOrg.id,
      role: 'contributor',
      isPrimary: false,
    }).onConflictDoNothing()
    console.log('  ✓ demo multi-org membership: alice@govea.dev → Office of Digital Services (contributor)')
  }

  console.log('\nSeed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
