import { eq } from 'drizzle-orm'
import { GOV_TAXONOMY } from './gov-taxonomy'
import {
  DEV_ORG, STATE_ORG,
  DEV_USERS, STATE_USERS,
  DEFAULT_PERSONA_TYPES, DEFAULT_TAGS,
  DEV_PERSONA_TAGS,
  DEV_PERSONAS, DEV_CAPABILITIES, DEV_APPLICATIONS,
  DEV_OBJECTIVES, DEV_VALUE_STREAMS, DEV_INITIATIVES, DEV_ADRS,
  STATE_PERSONAS, STATE_CAPABILITIES, STATE_APPLICATIONS,
  DEV_CROSS_ORG_LINKS,
} from './dev-fixtures'
import { db } from '../client'
import {
  users, organizations, personaTypes, tags,
  personas, personaTags, capabilities, applications,
  capabilityPersonas, applicationCapabilities,
  strategicObjectives, objectiveCapabilities, objectiveApplications, objectiveValueStreams,
  valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas,
  initiatives, initiativeCapabilities, initiativeApplications, initiativeObjectives,
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
  taxonomyTerms,
  orgConnections, crossOrgLinks,
} from '../schema'
import bcrypt from 'bcryptjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function findOrCreateOrg(slug: string, name: string) {
  const existing = await db.query.organizations.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
  })
  if (existing) return existing.id
  const [org] = await db.insert(organizations).values({ name, slug }).returning()
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
  description?: string; domain?: string; status: 'draft' | 'published' | 'archived'; visibility: 'org' | 'connections' | 'instance'
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

  // Persona types
  for (const name of DEFAULT_PERSONA_TYPES) {
    await db.insert(personaTypes).values({ name, organizationId: devOrgId }).onConflictDoNothing()
  }

  // Tags — build id map for personaTags
  const devTagIds: Record<string, string> = {}
  for (const name of DEFAULT_TAGS) {
    const [tag] = await db.insert(tags).values({ name, organizationId: devOrgId })
      .onConflictDoNothing()
      .returning()
    if (tag) {
      devTagIds[name] = tag.id
    } else {
      const existing = await db.query.tags.findFirst({
        where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, name)),
      })
      if (existing) devTagIds[name] = existing.id
    }
  }
  console.log(`  ✓ ${DEFAULT_PERSONA_TYPES.length} persona types, ${DEFAULT_TAGS.length} tags`)

  // Personas
  const devPersonaIds: Record<string, string> = {}
  for (const p of DEV_PERSONAS) {
    devPersonaIds[p.name] = await findOrCreatePersona(devOrgId, p.name, {
      description: p.description, type: p.type, status: p.status, visibility: p.visibility,
    })
  }
  console.log(`  ✓ ${DEV_PERSONAS.length} personas`)

  // Persona tags — personaTags junction table
  for (const assignment of DEV_PERSONA_TAGS) {
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
      description: c.description, domain: c.domain, status: c.status, visibility: c.visibility,
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

  // Government taxonomy — 10 domains, 5 sub-terms each
  for (const [domainIdx, domainEntry] of GOV_TAXONOMY.entries()) {
    const existingDomain = await db.query.taxonomyTerms.findFirst({
      where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, domainEntry.domain)),
    })
    let domainId: string
    if (existingDomain) {
      domainId = existingDomain.id
    } else {
      const [inserted] = await db.insert(taxonomyTerms).values({
        organizationId: devOrgId,
        name: domainEntry.domain,
        slug: toSlug(domainEntry.domain),
        domain: domainEntry.domain,
        sortOrder: String(domainIdx),
      }).returning()
      domainId = inserted.id
    }

    for (const [termIdx, termName] of domainEntry.terms.entries()) {
      const existingTerm = await db.query.taxonomyTerms.findFirst({
        where: (t, { eq: e, and }) => and(e(t.organizationId, devOrgId), e(t.name, termName)),
      })
      if (!existingTerm) {
        await db.insert(taxonomyTerms).values({
          organizationId: devOrgId,
          parentId: domainId,
          name: termName,
          slug: toSlug(termName),
          domain: domainEntry.domain,
          sortOrder: String(termIdx),
        })
      }
    }
  }
  console.log(`  ✓ ${GOV_TAXONOMY.length} taxonomy domains with sub-terms`)

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

    // objectiveApplications
    for (const appName of o.applications) {
      const appId = devApplicationIds[appName]
      if (!appId) continue
      const exists = await db.query.objectiveApplications.findFirst({
        where: (t, { eq: e, and }) => and(e(t.objectiveId, objId), e(t.applicationId, appId)),
      })
      if (!exists) await db.insert(objectiveApplications).values({ objectiveId: objId, applicationId: appId })
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

  // ── Org 2: Office of Digital Services ────────────────────────────────────

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
        status: 'active',
      })
    }
    console.log(`  ✓ Cross-org link (${link.linkType}): "${link.sourceCapabilityName}" → "${link.targetCapabilityName}"`)
  }

  console.log('\nSeed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
