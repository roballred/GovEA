'use server'

import { db } from '@/db/client'
import {
  strategicObjectives, capabilities, services, goals,
  goalObjectives, objectiveCapabilities, applicationCapabilities,
  initiativeObjectives, serviceCapabilities,
} from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity } from '@/lib/federation'

// ── Shared sub-types ──────────────────────────────────────────────────────────

export interface TraceApp {
  id: string; name: string; vendor: string | null; lifecycleStatus: string | null
}
export interface TraceCapability {
  id: string; name: string; domain: string | null
  applications: TraceApp[]
}
export interface TraceInitiative {
  id: string; name: string; status: string
}
export interface TraceObjective {
  id: string; name: string; timeHorizon: string | null
  goals?: TraceGoal[]
  initiatives?: TraceInitiative[]
}
export interface TraceGoal {
  id: string; name: string; planningHorizon: string | null
}
export interface TracePersona {
  id: string; name: string; type: string | null
}
export interface TraceAdr {
  id: string; number: string; title: string; status: string
}
export interface TracePrinciple {
  id: string; name: string
}

// ── Typed results ─────────────────────────────────────────────────────────────

export interface ObjectiveTrace {
  kind: 'objective'
  id: string; name: string; description: string | null
  successMetric: string | null; timeHorizon: string | null; status: string
  goals: TraceGoal[]
  capabilities: TraceCapability[]
  initiatives: TraceInitiative[]
}

export interface CapabilityTrace {
  kind: 'capability'
  id: string; name: string; domain: string | null; description: string | null; status: string
  goals: TraceGoal[]
  objectives: TraceObjective[]
  strategicInitiatives: TraceInitiative[]
  applications: TraceApp[]
  initiatives: TraceInitiative[]
  personas: TracePersona[]
  adrs: TraceAdr[]
  principles: TracePrinciple[]
}

export interface ServiceTrace {
  kind: 'service'
  id: string; name: string; description: string | null; channels: string[]; status: string
  personas: TracePersona[]
  capabilities: TraceCapability[]
}

export interface GoalTrace {
  kind: 'goal'
  id: string; name: string; description: string | null
  planningHorizon: string | null; owner: string | null; status: string
  objectives: Array<{
    id: string; name: string; timeHorizon: string | null
    capabilities: TraceCapability[]
    initiatives: TraceInitiative[]
  }>
}

export type TraceData = GoalTrace | ObjectiveTrace | CapabilityTrace | ServiceTrace

function dedupeTraceRows<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}

async function getCapabilitiesWithApps(capabilityIds: string[]): Promise<TraceCapability[]> {
  if (capabilityIds.length === 0) return []

  const [capabilityRows, appLinks] = await Promise.all([
    db.query.capabilities.findMany({
      where: inArray(capabilities.id, capabilityIds),
    }),
    db.query.applicationCapabilities.findMany({
      where: inArray(applicationCapabilities.capabilityId, capabilityIds),
      with: { application: true },
    }),
  ])

  const appsByCapability = new Map<string, TraceApp[]>()
  for (const { capabilityId, application } of appLinks) {
    const apps = appsByCapability.get(capabilityId) ?? []
    apps.push({
      id: application.id,
      name: application.name,
      vendor: application.vendor,
      lifecycleStatus: application.lifecycleStatus,
    })
    appsByCapability.set(capabilityId, apps)
  }

  return capabilityRows.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    applications: appsByCapability.get(c.id) ?? [],
  }))
}

async function getGoalsByObjective(objectiveIds: string[]): Promise<Map<string, TraceGoal[]>> {
  const goalsByObjective = new Map<string, TraceGoal[]>()
  if (objectiveIds.length === 0) return goalsByObjective

  const goalRows = await db.query.goalObjectives.findMany({
    where: inArray(goalObjectives.objectiveId, objectiveIds),
    with: { goal: true },
  })

  for (const { objectiveId, goal } of goalRows) {
    const goals_ = goalsByObjective.get(objectiveId) ?? []
    goals_.push({ id: goal.id, name: goal.name, planningHorizon: goal.planningHorizon })
    goalsByObjective.set(objectiveId, goals_)
  }

  return goalsByObjective
}

// ── Goal trace ────────────────────────────────────────────────────────────────

export async function getGoalTrace(id: string): Promise<GoalTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.goals.findFirst({
    where: eq(goals.id, id),
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const goalObjectiveRows = await db.query.goalObjectives.findMany({
    where: eq(goalObjectives.goalId, id),
    with: { objective: true },
  })
  const objectiveIds = goalObjectiveRows.map(({ objectiveId }) => objectiveId)

  const [objectiveCapRows, initiativeRows] = objectiveIds.length > 0
    ? await Promise.all([
        db.query.objectiveCapabilities.findMany({
          where: inArray(objectiveCapabilities.objectiveId, objectiveIds),
        }),
        db.query.initiativeObjectives.findMany({
          where: inArray(initiativeObjectives.objectiveId, objectiveIds),
          with: { initiative: true },
        }),
      ])
    : [[], []] as const

  const capabilityIds = [...new Set(objectiveCapRows.map(({ capabilityId }) => capabilityId))]
  const capabilityTraceRows = await getCapabilitiesWithApps(capabilityIds)
  const capabilitiesById = new Map(capabilityTraceRows.map((capability) => [capability.id, capability]))

  const capabilitiesByObjective = new Map<string, TraceCapability[]>()
  for (const { objectiveId, capabilityId } of objectiveCapRows) {
    const capability = capabilitiesById.get(capabilityId)
    if (!capability) continue
    const objectiveCapabilities_ = capabilitiesByObjective.get(objectiveId) ?? []
    objectiveCapabilities_.push(capability)
    capabilitiesByObjective.set(objectiveId, objectiveCapabilities_)
  }

  const initiativesByObjective = new Map<string, TraceInitiative[]>()
  for (const { objectiveId, initiative } of initiativeRows) {
    const initiatives = initiativesByObjective.get(objectiveId) ?? []
    initiatives.push({ id: initiative.id, name: initiative.name, status: initiative.status })
    initiativesByObjective.set(objectiveId, initiatives)
  }

  return {
    kind: 'goal',
    id: row.id,
    name: row.name,
    description: row.description,
    planningHorizon: row.planningHorizon,
    owner: row.owner,
    status: row.status,
    objectives: goalObjectiveRows.map(({ objective: o }) => ({
      id: o.id,
      name: o.name,
      timeHorizon: o.timeHorizon,
      capabilities: capabilitiesByObjective.get(o.id) ?? [],
      initiatives: initiativesByObjective.get(o.id) ?? [],
    })),
  }
}

// ── Objective trace ───────────────────────────────────────────────────────────

export async function getObjectiveTrace(id: string): Promise<ObjectiveTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, id),
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const [objectiveCapRows, initiativeRows] = await Promise.all([
    db.query.objectiveCapabilities.findMany({
      where: eq(objectiveCapabilities.objectiveId, id),
    }),
    db.query.initiativeObjectives.findMany({
      where: eq(initiativeObjectives.objectiveId, id),
      with: { initiative: true },
    }),
  ])
  const capabilityIds = objectiveCapRows.map(({ capabilityId }) => capabilityId)
  const [capabilityTraceRows, goalsByObjective] = await Promise.all([
    getCapabilitiesWithApps(capabilityIds),
    getGoalsByObjective([id]),
  ])

  return {
    kind: 'objective',
    id: row.id,
    name: row.name,
    description: row.description,
    successMetric: row.successMetric,
    timeHorizon: row.timeHorizon,
    status: row.status,
    goals: goalsByObjective.get(row.id) ?? [],
    capabilities: objectiveCapRows
      .map(({ capabilityId }) => capabilityTraceRows.find((c) => c.id === capabilityId))
      .filter((c): c is TraceCapability => Boolean(c)),
    initiatives: initiativeRows.map(({ initiative: i }) => ({
      id: i.id, name: i.name, status: i.status,
    })),
  }
}

// ── Capability trace ──────────────────────────────────────────────────────────

export async function getCapabilityTrace(id: string): Promise<CapabilityTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.capabilities.findFirst({
    where: eq(capabilities.id, id),
    with: {
      objectiveCapabilities: { with: { objective: true } },
      applicationCapabilities: { with: { application: true } },
      initiativeCapabilities: { with: { initiative: true } },
      capabilityPersonas: { with: { persona: true } },
      adrCapabilities: { with: { adr: true } },
      principleCapabilities: { with: { principle: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const objectiveIds = row.objectiveCapabilities.map(({ objective }) => objective.id)
  const [goalsByObjective, initiativeObjectiveRows] = await Promise.all([
    getGoalsByObjective(objectiveIds),
    objectiveIds.length > 0
      ? db.query.initiativeObjectives.findMany({
          where: inArray(initiativeObjectives.objectiveId, objectiveIds),
          with: { initiative: true },
        })
      : Promise.resolve([]),
  ])
  const goalTraceRows = dedupeTraceRows(
    objectiveIds.flatMap((objectiveId) => goalsByObjective.get(objectiveId) ?? [])
  )
  const initiativesByObjective = new Map<string, TraceInitiative[]>()
  for (const { objectiveId, initiative } of initiativeObjectiveRows) {
    const initiatives = initiativesByObjective.get(objectiveId) ?? []
    initiatives.push({ id: initiative.id, name: initiative.name, status: initiative.status })
    initiativesByObjective.set(objectiveId, initiatives)
  }
  const strategicInitiatives = dedupeTraceRows(
    objectiveIds.flatMap((objectiveId) => initiativesByObjective.get(objectiveId) ?? [])
  )

  return {
    kind: 'capability',
    id: row.id,
    name: row.name,
    domain: row.domain,
    description: row.description,
    status: row.status,
    goals: goalTraceRows,
    objectives: row.objectiveCapabilities.map(({ objective: o }) => ({
      id: o.id, name: o.name, timeHorizon: o.timeHorizon,
      goals: goalsByObjective.get(o.id) ?? [],
      initiatives: initiativesByObjective.get(o.id) ?? [],
    })),
    strategicInitiatives,
    applications: row.applicationCapabilities.map(({ application: a }) => ({
      id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus,
    })),
    initiatives: row.initiativeCapabilities.map(({ initiative: i }) => ({
      id: i.id, name: i.name, status: i.status,
    })),
    personas: row.capabilityPersonas.map(({ persona: p }) => ({
      id: p.id, name: p.name, type: p.type,
    })),
    adrs: row.adrCapabilities.map(({ adr: a }) => ({
      id: a.id, number: a.number, title: a.title, status: a.status,
    })),
    principles: row.principleCapabilities.map(({ principle: p }) => ({
      id: p.id, name: p.name,
    })),
  }
}

// ── Service trace ─────────────────────────────────────────────────────────────

export async function getServiceTrace(id: string): Promise<ServiceTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      servicePersonas: { with: { persona: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const serviceCapRows = await db.query.serviceCapabilities.findMany({
    where: eq(serviceCapabilities.serviceId, id),
  })
  const capabilityTraceRows = await getCapabilitiesWithApps(serviceCapRows.map(({ capabilityId }) => capabilityId))

  return {
    kind: 'service',
    id: row.id,
    name: row.name,
    description: row.description,
    channels: row.channels,
    status: row.status,
    personas: row.servicePersonas.map(({ persona: p }) => ({
      id: p.id, name: p.name, type: p.type,
    })),
    capabilities: serviceCapRows
      .map(({ capabilityId }) => capabilityTraceRows.find((c) => c.id === capabilityId))
      .filter((c): c is TraceCapability => Boolean(c)),
  }
}
