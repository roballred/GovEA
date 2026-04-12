'use server'

import { db } from '@/db/client'
import {
  personas, capabilities, applications, tags, personaTypes,
  personaTags, capabilityPersonas, applicationCapabilities,
  valueStreams, valueStreamStages, valueStreamStageCapabilities,
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  initiatives, initiativeCapabilities, initiativeObjectives,
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { TEST_DATASETS } from '@/db/seeds/test-datasets'

export async function resetToDataset(datasetKey: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dataset reset is only available in development mode')
  }

  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Admin required')

  const orgId = session.user.organizationId as string
  const dataset = TEST_DATASETS[datasetKey]
  if (!dataset) throw new Error(`Unknown dataset: ${datasetKey}`)

  // ── Wipe org content (junction tables cascade automatically) ──────────────
  await db.delete(adrs).where(eq(adrs.organizationId, orgId))
  await db.delete(initiatives).where(eq(initiatives.organizationId, orgId))
  await db.delete(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
  await db.delete(valueStreams).where(eq(valueStreams.organizationId, orgId))
  await db.delete(applications).where(eq(applications.organizationId, orgId))
  await db.delete(capabilities).where(eq(capabilities.organizationId, orgId))
  await db.delete(personas).where(eq(personas.organizationId, orgId))
  await db.delete(tags).where(eq(tags.organizationId, orgId))
  await db.delete(personaTypes).where(eq(personaTypes.organizationId, orgId))

  // ── Insert persona types ─────────────────────────────────────────────────
  if (dataset.personaTypes.length > 0) {
    await db.insert(personaTypes)
      .values(dataset.personaTypes.map(name => ({ name, organizationId: orgId })))
      .onConflictDoNothing()
  }

  // ── Insert tags ───────────────────────────────────────────────────────────
  const tagRows = dataset.tags.length > 0
    ? await db.insert(tags)
        .values(dataset.tags.map(name => ({ name, organizationId: orgId })))
        .onConflictDoNothing()
        .returning()
    : []

  const tagByName = Object.fromEntries(tagRows.map(t => [t.name, t.id]))

  if (dataset.personas.length === 0) return

  // ── Insert personas ───────────────────────────────────────────────────────
  const personaRows = await db.insert(personas)
    .values(dataset.personas.map(p => ({
      name: p.name,
      description: p.description,
      type: p.type || null,
      status: p.status,
      organizationId: orgId,
    })))
    .returning()

  const personaByName = Object.fromEntries(personaRows.map(p => [p.name, p.id]))

  // Insert persona → tag junctions
  const personaTagRows = dataset.personas.flatMap(p =>
    p.tags
      .filter(t => tagByName[t])
      .map(t => ({ personaId: personaByName[p.name], tagId: tagByName[t] }))
  )
  if (personaTagRows.length > 0) {
    await db.insert(personaTags).values(personaTagRows)
  }

  if (dataset.capabilities.length === 0) return

  // ── Insert capabilities ───────────────────────────────────────────────────
  const capabilityRows = await db.insert(capabilities)
    .values(dataset.capabilities.map(c => ({
      name: c.name,
      description: c.description,
      domain: c.domain,
      behaviors: c.behaviors ?? null,
      rules: c.rules ?? null,
      status: c.status,
      organizationId: orgId,
    })))
    .returning()

  const capabilityByName = Object.fromEntries(capabilityRows.map(c => [c.name, c.id]))

  // Insert capability → persona junctions
  const capPersonaRows = dataset.capabilities.flatMap(c =>
    c.personas
      .filter(p => personaByName[p])
      .map(p => ({ capabilityId: capabilityByName[c.name], personaId: personaByName[p] }))
  )
  if (capPersonaRows.length > 0) {
    await db.insert(capabilityPersonas).values(capPersonaRows)
  }

  const applicationByName: Record<string, string> = {}
  if (dataset.applications.length > 0) {
    // ── Insert applications ─────────────────────────────────────────────────
    const applicationRows = await db.insert(applications)
      .values(dataset.applications.map(a => ({
        name: a.name,
        description: a.description,
        vendor: a.vendor,
        hostingModel: a.hostingModel,
        lifecycleStatus: a.lifecycleStatus,
        status: a.status,
        organizationId: orgId,
      })))
      .returning()

    for (const a of applicationRows) applicationByName[a.name] = a.id

    // Insert application → capability junctions
    const appCapRows = dataset.applications.flatMap(a =>
      a.capabilities
        .filter(c => capabilityByName[c])
        .map(c => ({ applicationId: applicationByName[a.name], capabilityId: capabilityByName[c] }))
    )
    if (appCapRows.length > 0) {
      await db.insert(applicationCapabilities).values(appCapRows)
    }
  }

  if (!dataset.valueStreams || dataset.valueStreams.length === 0) return

  // ── Insert value streams ──────────────────────────────────────────────────
  for (const vs of dataset.valueStreams) {
    const [vsRow] = await db.insert(valueStreams).values({
      name: vs.name,
      description: vs.description,
      valueItem: vs.valueItem,
      status: vs.status,
      organizationId: orgId,
    }).returning()

    for (let i = 0; i < vs.stages.length; i++) {
      const stageDef = vs.stages[i]
      const [stageRow] = await db.insert(valueStreamStages).values({
        valueStreamId: vsRow.id,
        name: stageDef.name,
        description: stageDef.description ?? null,
        order: i,
      }).returning()

      const stageCaps = (stageDef.capabilities ?? [])
        .filter(c => capabilityByName[c])
        .map(c => ({ stageId: stageRow.id, capabilityId: capabilityByName[c] }))

      if (stageCaps.length > 0) {
        await db.insert(valueStreamStageCapabilities).values(stageCaps).onConflictDoNothing()
      }
    }
  }

  if (!dataset.objectives || dataset.objectives.length === 0) return

  // ── Insert strategic objectives ───────────────────────────────────────────
  // Build a value stream name → id map from what we just inserted
  const vsRows = await db.select({ id: valueStreams.id, name: valueStreams.name })
    .from(valueStreams)
    .where(eq(valueStreams.organizationId, orgId))
  const valueStreamByName = Object.fromEntries(vsRows.map(vs => [vs.name, vs.id]))

  for (const obj of dataset.objectives) {
    const [objRow] = await db.insert(strategicObjectives).values({
      name: obj.name,
      description: obj.description,
      successMetric: obj.successMetric,
      timeHorizon: obj.timeHorizon,
      status: obj.status,
      organizationId: orgId,
    }).returning()

    // Link capabilities
    const objCapRows = (obj.capabilities ?? [])
      .filter(c => capabilityByName[c])
      .map(c => ({ objectiveId: objRow.id, capabilityId: capabilityByName[c] }))
    if (objCapRows.length > 0) {
      await db.insert(objectiveCapabilities).values(objCapRows).onConflictDoNothing()
    }

    // Link value streams
    const objVsRows = (obj.valueStreams ?? [])
      .filter(vs => valueStreamByName[vs])
      .map(vs => ({ objectiveId: objRow.id, valueStreamId: valueStreamByName[vs] }))
    if (objVsRows.length > 0) {
      await db.insert(objectiveValueStreams).values(objVsRows).onConflictDoNothing()
    }
  }

  if (!dataset.initiatives || dataset.initiatives.length === 0) return

  // ── Insert initiatives ────────────────────────────────────────────────────
  // Build objective name → id map from what we just inserted
  const objRows = await db.select({ id: strategicObjectives.id, name: strategicObjectives.name })
    .from(strategicObjectives)
    .where(eq(strategicObjectives.organizationId, orgId))
  const objectiveByName = Object.fromEntries(objRows.map(o => [o.name, o.id]))

  for (const init of dataset.initiatives) {
    const [initRow] = await db.insert(initiatives).values({
      name: init.name,
      description: init.description,
      status: init.status,
      startDate: init.startDate ?? null,
      endDate: init.endDate ?? null,
      organizationId: orgId,
    }).returning()

    // Link capabilities with impact
    const initCapRows = (init.capabilities ?? [])
      .filter(ic => capabilityByName[ic.name])
      .map(ic => ({
        initiativeId: initRow.id,
        capabilityId: capabilityByName[ic.name],
        impact: ic.impact ?? null,
      }))
    if (initCapRows.length > 0) {
      await db.insert(initiativeCapabilities).values(initCapRows).onConflictDoNothing()
    }

    // Link objectives
    const initObjRows = (init.objectives ?? [])
      .filter(o => objectiveByName[o])
      .map(o => ({ initiativeId: initRow.id, objectiveId: objectiveByName[o] }))
    if (initObjRows.length > 0) {
      await db.insert(initiativeObjectives).values(initObjRows).onConflictDoNothing()
    }
  }

  if (!dataset.adrs || dataset.adrs.length === 0) return

  // ── Insert ADRs ───────────────────────────────────────────────────────────
  // Build initiative name → id map from what we just inserted
  const iniRows = await db.select({ id: initiatives.id, name: initiatives.name })
    .from(initiatives)
    .where(eq(initiatives.organizationId, orgId))
  const initiativeByName = Object.fromEntries(iniRows.map(i => [i.name, i.id]))

  // First pass: insert all ADRs without supersededBy
  const adrByNumber: Record<string, string> = {}
  for (const adrDef of dataset.adrs) {
    const [adrRow] = await db.insert(adrs).values({
      number: adrDef.number,
      title: adrDef.title,
      context: adrDef.context,
      decision: adrDef.decision,
      consequences: adrDef.consequences,
      status: adrDef.status,
      organizationId: orgId,
    }).returning()
    adrByNumber[adrDef.number] = adrRow.id
  }

  // Second pass: resolve supersededBy self-references
  for (const adrDef of dataset.adrs) {
    if (!adrDef.supersededByNumber) continue
    const adrId = adrByNumber[adrDef.number]
    const supersedingId = adrByNumber[adrDef.supersededByNumber]
    if (adrId && supersedingId) {
      await db.update(adrs).set({ supersededBy: supersedingId }).where(eq(adrs.id, adrId))
    }
  }

  // Junction tables
  for (const adrDef of dataset.adrs) {
    const adrId = adrByNumber[adrDef.number]
    if (!adrId) continue

    const capRows = (adrDef.capabilities ?? [])
      .filter(c => capabilityByName[c])
      .map(c => ({ adrId, capabilityId: capabilityByName[c] }))
    if (capRows.length > 0) await db.insert(adrCapabilities).values(capRows).onConflictDoNothing()

    const appRows = (adrDef.applications ?? [])
      .filter(a => applicationByName[a])
      .map(a => ({ adrId, applicationId: applicationByName[a] }))
    if (appRows.length > 0) await db.insert(adrApplications).values(appRows).onConflictDoNothing()

    const iniJoinRows = (adrDef.initiatives ?? [])
      .filter(i => initiativeByName[i])
      .map(i => ({ adrId, initiativeId: initiativeByName[i] }))
    if (iniJoinRows.length > 0) await db.insert(adrInitiatives).values(iniJoinRows).onConflictDoNothing()

    const objJoinRows = (adrDef.objectives ?? [])
      .filter(o => objectiveByName[o])
      .map(o => ({ adrId, objectiveId: objectiveByName[o] }))
    if (objJoinRows.length > 0) await db.insert(adrObjectives).values(objJoinRows).onConflictDoNothing()
  }
}
