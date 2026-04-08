import { GOV_TAXONOMY } from './gov-taxonomy'
import {
  DEV_ORG, STATE_ORG,
  DEV_USERS, STATE_USERS,
  DEFAULT_PERSONA_TYPES, DEFAULT_TAGS,
  DEV_PERSONAS, DEV_CAPABILITIES, DEV_APPLICATIONS,
  DEV_OBJECTIVES, DEV_VALUE_STREAMS, DEV_INITIATIVES, DEV_ADRS,
  STATE_PERSONAS, STATE_CAPABILITIES, STATE_APPLICATIONS,
  DEV_CROSS_ORG_LINK,
} from './dev-fixtures'
import { db } from '../client'
import {
  users, organizations, personaTypes, tags,
  personas, capabilities, applications,
  capabilityPersonas, applicationCapabilities,
  strategicObjectives, objectiveCapabilities,
  valueStreams, valueStreamStages, valueStreamStageCapabilities,
  initiatives, initiativeCapabilities, initiativeObjectives,
  adrs,
  orgConnections, crossOrgLinks,
} from '../schema'
import bcrypt from 'bcryptjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrCreateOrg(slug: string, name: string) {
  const existing = await db.query.organizations.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })
  if (existing) return existing.id
  const [org] = await db.insert(organizations).values({ name, slug }).returning()
  return org.id
}

async function findOrCreatePersona(orgId: string, name: string, data: {
  description?: string; type?: string; status: 'draft' | 'published' | 'archived'; visibility: 'org' | 'connections' | 'instance'
}) {
  const existing = await db.query.personas.findFirst({
    where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, name)),
  })
  if (existing) return existing.id
  const [p] = await db.insert(personas).values({ organizationId: orgId, name, ...data }).returning()
  return p.id
}

async function findOrCreateCapability(orgId: string, name: string, data: {
  description?: string; domain?: string; status: 'draft' | 'published' | 'archived'; visibility: 'org' | 'connections' | 'instance'
}) {
  const existing = await db.query.capabilities.findFirst({
    where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, name)),
  })
  if (existing) return existing.id
  const [c] = await db.insert(capabilities).values({ organizationId: orgId, name, ...data }).returning()
  return c.id
}

async function findOrCreateApplication(orgId: string, name: string, data: {
  description?: string; vendor?: string; hostingModel?: string;
  lifecycleStatus: 'active' | 'sunset' | 'decommissioned' | 'planned';
  status: 'draft' | 'published' | 'archived'
}) {
  const existing = await db.query.applications.findFirst({
    where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, name)),
  })
  if (existing) return existing.id
  const [a] = await db.insert(applications).values({ organizationId: orgId, name, ...data }).returning()
  return a.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding government taxonomy...')
  console.log(`Loaded ${GOV_TAXONOMY.length} top-level domains`)

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

  // Persona types & tags
  for (const name of DEFAULT_PERSONA_TYPES) {
    await db.insert(personaTypes).values({ name, organizationId: devOrgId }).onConflictDoNothing()
  }
  for (const name of DEFAULT_TAGS) {
    await db.insert(tags).values({ name, organizationId: devOrgId }).onConflictDoNothing()
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
        where: (t, { eq, and }) => and(eq(t.capabilityId, capId), eq(t.personaId, personaId)),
      })
      if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
    }
  }
  console.log(`  ✓ ${DEV_CAPABILITIES.length} capabilities`)

  // Applications + capability links
  const devApplicationIds: Record<string, string> = {}
  for (const a of DEV_APPLICATIONS) {
    const appId = await findOrCreateApplication(devOrgId, a.name, {
      description: a.description, vendor: a.vendor, hostingModel: a.hostingModel,
      lifecycleStatus: a.lifecycleStatus, status: a.status,
    })
    devApplicationIds[a.name] = appId
    for (const capName of a.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.applicationCapabilities.findFirst({
        where: (t, { eq, and }) => and(eq(t.applicationId, appId), eq(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${DEV_APPLICATIONS.length} applications`)

  // Strategic Objectives + capability links
  const devObjectiveIds: Record<string, string> = {}
  for (const o of DEV_OBJECTIVES) {
    const existing = await db.query.strategicObjectives.findFirst({
      where: (t, { eq, and }) => and(eq(t.organizationId, devOrgId), eq(t.name, o.name)),
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
      }).returning()
      objId = inserted.id
    }
    devObjectiveIds[o.name] = objId
    for (const capName of o.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.objectiveCapabilities.findFirst({
        where: (t, { eq, and }) => and(eq(t.objectiveId, objId), eq(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(objectiveCapabilities).values({ objectiveId: objId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${DEV_OBJECTIVES.length} strategic objectives`)

  // Value Streams + stages + stage capability links
  for (const vs of DEV_VALUE_STREAMS) {
    const existingVs = await db.query.valueStreams.findFirst({
      where: (t, { eq, and }) => and(eq(t.organizationId, devOrgId), eq(t.name, vs.name)),
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

    for (const stage of vs.stages) {
      const existingStage = await db.query.valueStreamStages.findFirst({
        where: (t, { eq, and }) => and(eq(t.valueStreamId, vsId), eq(t.name, stage.name)),
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
          where: (t, { eq, and }) => and(eq(t.stageId, stageId), eq(t.capabilityId, capId)),
        })
        if (!exists) await db.insert(valueStreamStageCapabilities).values({ stageId, capabilityId: capId })
      }
    }
  }
  console.log(`  ✓ ${DEV_VALUE_STREAMS.length} value streams with stages`)

  // Initiatives + capability/objective links
  for (const ini of DEV_INITIATIVES) {
    const existingIni = await db.query.initiatives.findFirst({
      where: (t, { eq, and }) => and(eq(t.organizationId, devOrgId), eq(t.name, ini.name)),
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
        endDate: ini.endDate,
      }).returning()
      iniId = inserted.id
    }

    for (const { name: capName, impact } of ini.capabilities) {
      const capId = devCapabilityIds[capName]
      if (!capId) continue
      const exists = await db.query.initiativeCapabilities.findFirst({
        where: (t, { eq, and }) => and(eq(t.initiativeId, iniId), eq(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(initiativeCapabilities).values({ initiativeId: iniId, capabilityId: capId, impact })
    }

    for (const objName of ini.objectives) {
      const objId = devObjectiveIds[objName]
      if (!objId) continue
      const exists = await db.query.initiativeObjectives.findFirst({
        where: (t, { eq, and }) => and(eq(t.initiativeId, iniId), eq(t.objectiveId, objId)),
      })
      if (!exists) await db.insert(initiativeObjectives).values({ initiativeId: iniId, objectiveId: objId })
    }
  }
  console.log(`  ✓ ${DEV_INITIATIVES.length} initiatives`)

  // ADRs
  for (const adr of DEV_ADRS) {
    const existingAdr = await db.query.adrs.findFirst({
      where: (t, { eq, and }) => and(eq(t.organizationId, devOrgId), eq(t.number, adr.number)),
    })
    if (!existingAdr) {
      await db.insert(adrs).values({
        organizationId: devOrgId,
        number: adr.number,
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        status: adr.status,
      })
    }
  }
  console.log(`  ✓ ${DEV_ADRS.length} ADRs`)

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
        where: (t, { eq, and }) => and(eq(t.capabilityId, capId), eq(t.personaId, personaId)),
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
        where: (t, { eq, and }) => and(eq(t.applicationId, appId), eq(t.capabilityId, capId)),
      })
      if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
    }
  }
  console.log(`  ✓ ${STATE_APPLICATIONS.length} applications`)

  // ── Multi-org: connection + cross-org capability link ─────────────────────

  console.log('\n[Multi-org]')

  const existingConnection = await db.query.orgConnections.findFirst({
    where: (t, { eq, and }) => and(eq(t.fromOrgId, devOrgId), eq(t.toOrgId, stateOrgId)),
  })
  if (!existingConnection) {
    await db.insert(orgConnections).values({ fromOrgId: devOrgId, toOrgId: stateOrgId, status: 'active' })
  }
  console.log('  ✓ Org connection (active): City of Riverdale → Office of Digital Services')

  const sourceCapId = devCapabilityIds[DEV_CROSS_ORG_LINK.sourceCapabilityName]
  const targetCapId = stateCapabilityIds[DEV_CROSS_ORG_LINK.targetCapabilityName]
  if (sourceCapId && targetCapId) {
    const existingLink = await db.query.crossOrgLinks.findFirst({
      where: (t, { eq, and }) => and(eq(t.sourceEntityId, sourceCapId), eq(t.targetEntityId, targetCapId)),
    })
    if (!existingLink) {
      await db.insert(crossOrgLinks).values({
        sourceOrgId: devOrgId,
        sourceEntityType: 'capability',
        sourceEntityId: sourceCapId,
        targetOrgId: stateOrgId,
        targetEntityType: 'capability',
        targetEntityId: targetCapId,
        linkType: DEV_CROSS_ORG_LINK.linkType,
        status: 'active',
      })
    }
    console.log(`  ✓ Cross-org link (active): "${DEV_CROSS_ORG_LINK.sourceCapabilityName}" implements "${DEV_CROSS_ORG_LINK.targetCapabilityName}"`)
  }

  console.log('\nSeed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
