import { eq, isNull } from 'drizzle-orm'
import { GOV_TAXONOMY } from './gov-taxonomy'
import {
  DEV_ORG, STATE_ORG, SYSTEM_ORG,
  DEV_USERS, STATE_USERS, SYSTEM_USERS,
  DEFAULT_PERSONA_TYPES, DEFAULT_PERSONA_TAGS,
  DEV_PERSONA_TAG_ASSIGNMENTS,
  DEV_PERSONAS, DEV_CAPABILITIES, DEV_APPLICATIONS,
  DEV_OBJECTIVES, DEV_VALUE_STREAMS, DEV_INITIATIVES, DEV_ADRS,
  DEV_PRINCIPLES, DEV_GLOSSARY, DEV_SERVICES,
  STATE_PERSONAS, STATE_CAPABILITIES, STATE_APPLICATIONS,
  DEV_CROSS_ORG_LINKS,
  LAKESIDE_ORG, LAKESIDE_USERS,
  LAKESIDE_PERSONAS, LAKESIDE_CAPABILITIES, LAKESIDE_APPLICATIONS,
  LAKESIDE_VALUE_STREAMS, LAKESIDE_OBJECTIVES, LAKESIDE_INITIATIVES,
  LAKESIDE_ADRS, LAKESIDE_PRINCIPLES, LAKESIDE_GLOSSARY, LAKESIDE_SERVICES,
} from './dev-fixtures'
import {
  TOGAF_ORG, TOGAF_USERS,
  TOGAF_PERSONAS, TOGAF_CAPABILITIES, TOGAF_APPLICATIONS,
  TOGAF_VALUE_STREAMS, TOGAF_OBJECTIVES, TOGAF_INITIATIVES,
  TOGAF_ADRS, TOGAF_PRINCIPLES, TOGAF_GLOSSARY, TOGAF_SERVICES,
} from './togaf-demo-fixtures'
import { db } from '../client'
import {
  users, organizations,
  personas, personaTags, capabilities, applications,
  capabilityPersonas, applicationCapabilities,
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas,
  initiatives, initiativeCapabilities, initiativeApplications, initiativeObjectives,
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
  principles, principleAdrs, principleCapabilities,
  glossaryTerms, glossaryTermSources,
  taxonomyTerms,
  services, serviceCapabilities, servicePersonas, serviceValueStreams,
  orgConnections, crossOrgLinks,
} from '../schema'
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

  // ── Org 3: City of Lakeside ──────────────────────────────────────────────

  console.log('\n[Org 3] City of Lakeside')
  const lakesideOrgId = await findOrCreateOrg(LAKESIDE_ORG.slug, LAKESIDE_ORG.name)

  for (const u of LAKESIDE_USERS) {
    await db.insert(users).values({ ...u, passwordHash, organizationId: lakesideOrgId, isActive: 'true' }).onConflictDoNothing()
  }
  console.log(`  ✓ ${LAKESIDE_USERS.length} users (password: dev-password)`)

  const lakesidePersonaIds: Record<string, string> = {}
  for (const p of LAKESIDE_PERSONAS) {
    lakesidePersonaIds[p.name] = await findOrCreatePersona(lakesideOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${LAKESIDE_PERSONAS.length} personas`)

  const lakesideCapabilityIds: Record<string, string> = {}
  for (const c of LAKESIDE_CAPABILITIES) {
    const capId = await findOrCreateCapability(lakesideOrgId, c.name, {
      description: c.description, domain: c.domain,
      behaviors: (c as { behaviors?: string }).behaviors,
      rules: (c as { rules?: string }).rules,
      status: c.status, visibility: c.visibility,
    })
    lakesideCapabilityIds[c.name] = capId
    for (const personaName of c.personas) {
      const personaId = lakesidePersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.capabilityPersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.capabilityId, capId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_CAPABILITIES.length} capabilities`)

  const lakesideApplicationIds: Record<string, string> = {}
  for (const a of LAKESIDE_APPLICATIONS) {
    const appId = await findOrCreateApplication(lakesideOrgId, a.name, {
      description: a.description, vendor: a.vendor, hostingModel: a.hostingModel,
      lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    lakesideApplicationIds[a.name] = appId
    for (const capName of a.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.applicationId, appId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_APPLICATIONS.length} applications`)

  // Value Streams + stages + stage capability links + persona links
  const lakesideValueStreamIds: Record<string, string> = {}
  for (const vs of LAKESIDE_VALUE_STREAMS) {
    const existingVs = await db.query.valueStreams.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.name, vs.name)),
    })
    let vsId: string
    if (existingVs) {
      vsId = existingVs.id
    } else {
      const [inserted] = await db.insert(valueStreams).values({
        organizationId: lakesideOrgId,
        name: vs.name, description: vs.description, valueItem: vs.valueItem,
        status: vs.status, visibility: vs.visibility,
      }).returning()
      vsId = inserted.id
    }
    lakesideValueStreamIds[vs.name] = vsId

    for (const personaName of vs.stakeholderPersonas) {
      const personaId = lakesidePersonaIds[personaName]
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
        const capId = lakesideCapabilityIds[capName]
        if (!capId) continue
        const exists = await db.query.valueStreamStageCapabilities.findFirst({
          where: (t, { eq: e, and }) => and(e(t.stageId, stageId), e(t.capabilityId, capId)),
        })
        if (!exists) await db.insert(valueStreamStageCapabilities).values({ stageId, capabilityId: capId })
      }
    }
  }
  console.log(`  ✓ ${LAKESIDE_VALUE_STREAMS.length} value streams with stages and persona links`)

  // Strategic Objectives + capability / value stream links
  const lakesideObjectiveIds: Record<string, string> = {}
  for (const o of LAKESIDE_OBJECTIVES) {
    const existing = await db.query.strategicObjectives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.name, o.name)),
    })
    let objId: string
    if (existing) {
      objId = existing.id
    } else {
      const [inserted] = await db.insert(strategicObjectives).values({
        organizationId: lakesideOrgId,
        name: o.name, description: o.description,
        successMetric: o.successMetric, timeHorizon: o.timeHorizon,
        status: o.status, visibility: o.visibility,
      }).returning()
      objId = inserted.id
    }
    lakesideObjectiveIds[o.name] = objId

    for (const capName of o.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.objectiveCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(objectiveCapabilities).values({ objectiveId: objId, capabilityId: capId })
    }

    for (const vsName of o.valueStreams) {
      const vsId = lakesideValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.objectiveValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(objectiveValueStreams).values({ objectiveId: objId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_OBJECTIVES.length} strategic objectives`)

  // Initiatives + capability / application / objective links
  const lakesideInitiativeIds: Record<string, string> = {}
  for (const ini of LAKESIDE_INITIATIVES) {
    const existingIni = await db.query.initiatives.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.name, ini.name)),
    })
    let iniId: string
    if (existingIni) {
      iniId = existingIni.id
    } else {
      const [inserted] = await db.insert(initiatives).values({
        organizationId: lakesideOrgId,
        name: ini.name, description: ini.description,
        status: ini.status, startDate: ini.startDate, endDate: ini.endDate ?? undefined,
      }).returning()
      iniId = inserted.id
    }
    lakesideInitiativeIds[ini.name] = iniId

    for (const { name: capName, impact } of ini.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.initiativeCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(initiativeCapabilities).values({ initiativeId: iniId, capabilityId: capId, impact })
    }

    for (const { name: appName, impact } of ini.applications) {
      const appId = lakesideApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.initiativeApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(initiativeApplications).values({ initiativeId: iniId, applicationId: appId, impact })
    }

    for (const objName of ini.objectives) {
      const objId = lakesideObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.initiativeObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.initiativeId, iniId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(initiativeObjectives).values({ initiativeId: iniId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_INITIATIVES.length} initiatives`)

  // ADRs — insert all records first (without supersededBy), then resolve self-references
  const lakesideAdrIds: Record<string, string> = {}
  for (const adr of LAKESIDE_ADRS) {
    const existingAdr = await db.query.adrs.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.number, adr.number)),
    })
    let adrId: string
    if (existingAdr) {
      adrId = existingAdr.id
    } else {
      const [inserted] = await db.insert(adrs).values({
        organizationId: lakesideOrgId,
        number: adr.number, title: adr.title, context: adr.context,
        decision: adr.decision, consequences: adr.consequences, status: adr.status,
      }).returning()
      adrId = inserted.id
    }
    lakesideAdrIds[adr.number] = adrId
  }

  for (const adr of LAKESIDE_ADRS) {
    if (!adr.supersededByNumber) continue
    const adrId = lakesideAdrIds[adr.number]
    const supersedingId = lakesideAdrIds[adr.supersededByNumber]
    if (adrId && supersedingId) {
      await db.update(adrs).set({ supersededBy: supersedingId }).where(eq(adrs.id, adrId))
    }
  }

  for (const adr of LAKESIDE_ADRS) {
    const adrId = lakesideAdrIds[adr.number]
    if (!adrId) continue

    for (const capName of adr.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.adrCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(adrCapabilities).values({ adrId, capabilityId: capId })
    }

    for (const iniName of adr.initiatives) {
      const iniId = lakesideInitiativeIds[iniName]
      if (!iniId) continue
      const exists = await db.query.adrInitiatives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.initiativeId, iniId)),
      })
      if (!exists) await db.insert(adrInitiatives).values({ adrId, initiativeId: iniId })
    }

    for (const objName of adr.objectives) {
      const objId = lakesideObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.adrObjectives.findFirst({
        where: (t, { eq: e, and }) => and(e(t.adrId, adrId), e(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(adrObjectives).values({ adrId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_ADRS.length} ADRs with junction links and supersededBy chain`)

  // Principles + capability links
  for (const p of LAKESIDE_PRINCIPLES) {
    const existing = await db.query.principles.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.name, p.name)),
    })
    let pRow: typeof existing
    if (existing) {
      await db.update(principles).set({ principleType: p.principleType }).where(eq(principles.id, existing.id))
      pRow = existing
    } else {
      const [inserted] = await db.insert(principles).values({
        name: p.name, description: p.description ?? null, title: p.title ?? null,
        rationale: p.rationale, implications: p.implications, principleType: p.principleType,
        status: p.status, visibility: p.visibility, organizationId: lakesideOrgId,
      }).returning()
      pRow = inserted
    }
    for (const capName of p.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.principleCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.principleId, pRow!.id), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(principleCapabilities).values({ principleId: pRow!.id, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_PRINCIPLES.length} principles`)

  // Glossary
  for (const g of LAKESIDE_GLOSSARY) {
    const existing = await db.query.glossaryTerms.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.term, g.term)),
    })
    if (existing) continue
    await db.insert(glossaryTerms).values({
      term: g.term, definition: g.definition,
      definitionSource: (g as { definitionSource?: string }).definitionSource ?? null,
      definitionSourceUrl: null,
      domain: g.domain ?? null,
      notes: (g as { notes?: string }).notes ?? null,
      status: g.status, visibility: g.visibility, organizationId: lakesideOrgId,
    })
  }
  console.log(`  ✓ ${LAKESIDE_GLOSSARY.length} glossary terms`)

  // Services + junction links
  for (const svc of LAKESIDE_SERVICES) {
    const existing = await db.query.services.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, lakesideOrgId), e(t.name, svc.name)),
    })
    let svcId: string
    if (existing) {
      svcId = existing.id
    } else {
      const [inserted] = await db.insert(services).values({
        organizationId: lakesideOrgId,
        name: svc.name, description: svc.description,
        serviceOwner: svc.serviceOwner, channels: svc.channels,
        status: svc.status, visibility: svc.visibility,
      }).returning()
      svcId = inserted.id
    }

    for (const capName of svc.capabilities) {
      const capId = lakesideCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.serviceCapabilities.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(serviceCapabilities).values({ serviceId: svcId, capabilityId: capId })
    }

    for (const personaName of svc.personas) {
      const personaId = lakesidePersonaIds[personaName]
      if (!personaId) continue
      const exists = await db.query.servicePersonas.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.personaId, personaId)),
      })
      if (!exists) await db.insert(servicePersonas).values({ serviceId: svcId, personaId })
    }

    for (const vsName of svc.valueStreams) {
      const vsId = lakesideValueStreamIds[vsName]
      if (!vsId) continue
      const exists = await db.query.serviceValueStreams.findFirst({
        where: (t, { eq: e, and }) => and(e(t.serviceId, svcId), e(t.valueStreamId, vsId)),
      })
      if (!exists) await db.insert(serviceValueStreams).values({ serviceId: svcId, valueStreamId: vsId })
    }
  }
  console.log(`  ✓ ${LAKESIDE_SERVICES.length} services with capability, persona, and value stream links`)

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

  // ── Org 6: GovEA Platform (system org) ───────────────────────────────────

  console.log('\n[Org 6] GovEA Platform (system org)')
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
  console.log(`  ✓ ${SYSTEM_USERS.length} users (ivan@govea.dev / dev-password, instanceRole=instance_admin)`)

  console.log('\nSeed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
