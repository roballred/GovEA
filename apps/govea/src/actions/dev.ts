'use server'

import { db } from '@/db/client'
import {
  personas, capabilities, applications, tags, personaTypes,
  personaTags, capabilityPersonas, applicationCapabilities,
  valueStreams, valueStreamStages, valueStreamStageCapabilities,
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  initiatives, initiativeCapabilities, initiativeObjectives,
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

    const applicationByName = Object.fromEntries(applicationRows.map(a => [a.name, a.id]))

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
}
