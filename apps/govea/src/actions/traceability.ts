'use server'

import { db } from '@/db/client'
import {
  strategicObjectives, capabilities, services, goals, strategies, strategyGoals,
  strategyCapabilities, strategyValueStreams, strategyInitiatives,
  goalObjectives, objectiveCapabilities, applicationCapabilities,
  initiativeObjectives, serviceCapabilities,
  // #695 — trace-participation subjects and their one-hop root junctions
  applications, initiatives, personas, valueStreams, adrs, principles,
  initiativeCapabilities, capabilityPersonas, servicePersonas,
  serviceValueStreams, valueStreamCapabilities, objectiveValueStreams,
  valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas,
  adrCapabilities, adrObjectives, principleCapabilities,
} from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity } from '@/lib/federation'
import type { TraceParticipantKind } from '@/lib/trace-participants'

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
export interface TraceStrategy {
  id: string; name: string; status: string; planningHorizon: string | null
}
export interface TraceValueStream {
  id: string; name: string; valueItem: string | null; status: string
}

// ── Typed results ─────────────────────────────────────────────────────────────

export interface ObjectiveTrace {
  kind: 'objective'
  id: string; name: string; description: string | null
  successMetric: string | null; timeHorizon: string | null; status: string
  goals: TraceGoal[]
  capabilities: TraceCapability[]
  initiatives: TraceInitiative[]
  valueStreams: TraceValueStream[]
}

export interface CapabilityTrace {
  kind: 'capability'
  id: string; name: string; domain: string | null; description: string | null; status: string
  strategies: TraceStrategy[]
  goals: TraceGoal[]
  objectives: TraceObjective[]
  strategicInitiatives: TraceInitiative[]
  applications: TraceApp[]
  initiatives: TraceInitiative[]
  personas: TracePersona[]
  adrs: TraceAdr[]
  principles: TracePrinciple[]
  valueStreams: TraceValueStream[]
}

export interface ServiceTrace {
  kind: 'service'
  id: string; name: string; description: string | null; channels: string[]; status: string
  personas: TracePersona[]
  capabilities: TraceCapability[]
  valueStreams: TraceValueStream[]
}

export interface ValueStreamTrace {
  kind: 'value-stream'
  id: string; name: string; valueItem: string | null; description: string | null; status: string
  personas: TracePersona[]
  objectives: Array<{ id: string; name: string; timeHorizon: string | null }>
  services: Array<{ id: string; name: string }>
  stages: Array<{
    id: string; name: string; description: string | null; order: number
    capabilities: TraceCapability[]
  }>
  applications: TraceApp[]
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

export interface StrategyTrace {
  kind: 'strategy'
  id: string; name: string; summary: string | null
  planningHorizon: string | null; status: string
  goals: Array<{
    id: string; name: string; planningHorizon: string | null; status: string
    objectives: Array<{
      id: string; name: string; timeHorizon: string | null
      capabilities: TraceCapability[]
      initiatives: TraceInitiative[]
    }>
  }>
  // Direct course-of-action links (ADR-0005): the operating model the strategy
  // leverages/changes and the funded work that delivers it. Distinct from the
  // capabilities/initiatives reached through goals → objectives.
  valueStreams: { id: string; name: string }[]
  directCapabilities: TraceCapability[]
  directInitiatives: TraceInitiative[]
}

export type TraceData = StrategyTrace | GoalTrace | ObjectiveTrace | CapabilityTrace | ServiceTrace | ValueStreamTrace

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

// Summaries for value streams surfaced as related context on other trace views
// (#809). Same-org by junction construction; pruned to published for viewers.
async function getValueStreamSummaries(valueStreamIds: string[], isViewer: boolean): Promise<TraceValueStream[]> {
  const ids = [...new Set(valueStreamIds)]
  if (ids.length === 0) return []
  const rows = await db.query.valueStreams.findMany({
    where: inArray(valueStreams.id, ids),
    columns: { id: true, name: true, valueItem: true, status: true },
  })
  return rows
    .filter((v) => !isViewer || v.status === 'published')
    .map((v) => ({ id: v.id, name: v.name, valueItem: v.valueItem, status: v.status }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Strategy trace ──────────────────────────────────────────────────────────
//
// Strategy is a course-of-action root that pursues Goals (#697 / ADR-0005). The
// chain is Strategy → Goals → Objectives → Initiatives → Capabilities →
// Applications, composed entirely from existing relationships. Viewer pruning:
// a proposed Strategy is not a viewer-visible root, and pursued goals are pruned
// to published for viewers.

export async function getStrategyTrace(id: string): Promise<StrategyTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const isViewer = session.user.role === 'viewer'

  const row = await db.query.strategies.findFirst({ where: eq(strategies.id, id) })
  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null
  // A proposed strategy is not a viewer-visible root.
  if (isViewer && row.status === 'proposed') return null

  // Goals this strategy pursues (via the strategy_goals junction); pruned to
  // published for viewers.
  const pursuedRows = await db.query.strategyGoals.findMany({
    where: eq(strategyGoals.strategyId, id),
    with: { goal: true },
  })
  const memberGoals = pursuedRows
    .map((r) => r.goal)
    .filter((g) => !isViewer || g.status === 'published')
    .sort((a, b) => a.name.localeCompare(b.name))
  const goalIds = memberGoals.map((g) => g.id)

  // Objectives per member goal, then caps + initiatives for those objectives —
  // same downstream traversal getGoalTrace uses, fanned across all member goals.
  const goalObjectiveRows = goalIds.length > 0
    ? await db.query.goalObjectives.findMany({
        where: inArray(goalObjectives.goalId, goalIds),
        with: { objective: true },
      })
    : []
  const objectiveIds = [...new Set(goalObjectiveRows.map(({ objectiveId }) => objectiveId))]

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
  const capabilitiesById = new Map(capabilityTraceRows.map((c) => [c.id, c]))

  const capabilitiesByObjective = new Map<string, TraceCapability[]>()
  for (const { objectiveId, capabilityId } of objectiveCapRows) {
    const capability = capabilitiesById.get(capabilityId)
    if (!capability) continue
    const list = capabilitiesByObjective.get(objectiveId) ?? []
    list.push(capability)
    capabilitiesByObjective.set(objectiveId, list)
  }

  const initiativesByObjective = new Map<string, TraceInitiative[]>()
  for (const { objectiveId, initiative } of initiativeRows) {
    const list = initiativesByObjective.get(objectiveId) ?? []
    list.push({ id: initiative.id, name: initiative.name, status: initiative.status })
    initiativesByObjective.set(objectiveId, list)
  }

  const objectivesByGoal = new Map<string, Array<{ id: string; name: string; timeHorizon: string | null }>>()
  for (const { goalId, objective } of goalObjectiveRows) {
    const list = objectivesByGoal.get(goalId) ?? []
    list.push({ id: objective.id, name: objective.name, timeHorizon: objective.timeHorizon })
    objectivesByGoal.set(goalId, list)
  }

  // Direct course-of-action links (ADR-0005): operating model + delivery. These
  // junctions are same-org by construction (the link actions enforce it).
  const [stratCapRows, stratVsRows, stratInitRows] = await Promise.all([
    db.query.strategyCapabilities.findMany({ where: eq(strategyCapabilities.strategyId, id) }),
    db.query.strategyValueStreams.findMany({ where: eq(strategyValueStreams.strategyId, id), with: { valueStream: true } }),
    db.query.strategyInitiatives.findMany({ where: eq(strategyInitiatives.strategyId, id), with: { initiative: true } }),
  ])
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
  const directCapabilities = (await getCapabilitiesWithApps([...new Set(stratCapRows.map((r) => r.capabilityId))]))
    .sort(byName)
  const valueStreams = stratVsRows
    .map((r) => ({ id: r.valueStream.id, name: r.valueStream.name }))
    .sort(byName)
  const directInitiatives = stratInitRows
    .map((r) => ({ id: r.initiative.id, name: r.initiative.name, status: r.initiative.status }))
    .sort(byName)

  return {
    kind: 'strategy',
    id: row.id,
    name: row.name,
    summary: row.summary,
    planningHorizon: row.planningHorizon,
    status: row.status,
    goals: memberGoals.map((g) => ({
      id: g.id,
      name: g.name,
      planningHorizon: g.planningHorizon,
      status: g.status,
      objectives: (objectivesByGoal.get(g.id) ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        timeHorizon: o.timeHorizon,
        capabilities: capabilitiesByObjective.get(o.id) ?? [],
        initiatives: initiativesByObjective.get(o.id) ?? [],
      })),
    })),
    valueStreams,
    directCapabilities,
    directInitiatives,
  }
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
  const isViewer = session.user.role === 'viewer'

  const row = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, id),
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const [objectiveCapRows, initiativeRows, objectiveVsRows] = await Promise.all([
    db.query.objectiveCapabilities.findMany({
      where: eq(objectiveCapabilities.objectiveId, id),
    }),
    db.query.initiativeObjectives.findMany({
      where: eq(initiativeObjectives.objectiveId, id),
      with: { initiative: true },
    }),
    db.query.objectiveValueStreams.findMany({
      where: eq(objectiveValueStreams.objectiveId, id),
    }),
  ])
  const capabilityIds = objectiveCapRows.map(({ capabilityId }) => capabilityId)
  const [capabilityTraceRows, goalsByObjective, valueStreamSummaries] = await Promise.all([
    getCapabilitiesWithApps(capabilityIds),
    getGoalsByObjective([id]),
    getValueStreamSummaries(objectiveVsRows.map(({ valueStreamId }) => valueStreamId), isViewer),
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
    valueStreams: valueStreamSummaries,
  }
}

// ── Capability trace ──────────────────────────────────────────────────────────

export async function getCapabilityTrace(id: string): Promise<CapabilityTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const isViewer = session.user.role === 'viewer'

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

  // Upstream Strategies that directly impact this capability via the
  // course-of-action link (ADR-0005 / #831). Same-org by junction construction.
  // A proposed strategy is not a viewer-visible root, matching getStrategyTrace.
  const strategyCapRows = await db.query.strategyCapabilities.findMany({
    where: eq(strategyCapabilities.capabilityId, id),
    with: { strategy: true },
  })
  const upstreamStrategies = strategyCapRows
    .map(({ strategy }) => strategy)
    .filter((s) => !isViewer || s.status !== 'proposed')
    .map((s) => ({ id: s.id, name: s.name, status: s.status, planningHorizon: s.planningHorizon }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Value streams this capability participates in — directly (stream-level) or
  // through one of their stages (#809). Apps are still reached through the
  // capability, not a value-stream shortcut.
  const [vsDirectRows, vsStageCapRows] = await Promise.all([
    db.query.valueStreamCapabilities.findMany({ where: eq(valueStreamCapabilities.capabilityId, id) }),
    db.query.valueStreamStageCapabilities.findMany({ where: eq(valueStreamStageCapabilities.capabilityId, id) }),
  ])
  const stageIds = vsStageCapRows.map(({ stageId }) => stageId)
  const stageRows = stageIds.length > 0
    ? await db.query.valueStreamStages.findMany({
        where: inArray(valueStreamStages.id, stageIds),
        columns: { valueStreamId: true },
      })
    : []
  const valueStreamSummaries = await getValueStreamSummaries(
    [...vsDirectRows.map(({ valueStreamId }) => valueStreamId), ...stageRows.map(({ valueStreamId }) => valueStreamId)],
    isViewer,
  )

  return {
    kind: 'capability',
    id: row.id,
    name: row.name,
    domain: row.domain,
    description: row.description,
    status: row.status,
    strategies: upstreamStrategies,
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
    valueStreams: valueStreamSummaries,
  }
}

// ── Service trace ─────────────────────────────────────────────────────────────

export async function getServiceTrace(id: string): Promise<ServiceTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const isViewer = session.user.role === 'viewer'

  const row = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      servicePersonas: { with: { persona: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  const [serviceCapRows, serviceVsRows] = await Promise.all([
    db.query.serviceCapabilities.findMany({ where: eq(serviceCapabilities.serviceId, id) }),
    db.query.serviceValueStreams.findMany({ where: eq(serviceValueStreams.serviceId, id) }),
  ])
  const [capabilityTraceRows, valueStreamSummaries] = await Promise.all([
    getCapabilitiesWithApps(serviceCapRows.map(({ capabilityId }) => capabilityId)),
    getValueStreamSummaries(serviceVsRows.map(({ valueStreamId }) => valueStreamId), isViewer),
  ])

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
    valueStreams: valueStreamSummaries,
  }
}

// ── Value stream trace (#809) ───────────────────────────────────────────────────
//
// Value streams are a first-class trace root: stakeholders/personas and upstream
// objectives/services on the way in, ordered stages with their stage-level
// capabilities, and the applications reached *through* those capabilities (no
// value-stream-to-application shortcut). Stage context is preserved — stages are
// not flattened into a single capability list.

export async function getValueStreamTrace(id: string): Promise<ValueStreamTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const isViewer = session.user.role === 'viewer'

  const row = await db.query.valueStreams.findFirst({
    where: eq(valueStreams.id, id),
    with: {
      stages: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: { stageCapabilities: { with: { capability: true } } },
      },
      valueStreamPersonas: { with: { persona: true } },
      valueStreamCapabilities: { with: { capability: true } },
      objectiveValueStreams: { with: { objective: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null
  // A non-published value stream is not viewer-visible (matches getValueStream).
  if (isViewer && row.status !== 'published') return null

  // Services that deliver this value stream — no relation on valueStreams, so
  // resolved from the serviceValueStreams junction directly.
  const serviceVsRows = await db.query.serviceValueStreams.findMany({
    where: eq(serviceValueStreams.valueStreamId, id),
    with: { service: true },
  })

  // Viewers only traverse published capabilities; status lives on the joined
  // capability row.
  const capAllowed = (status: string) => !isViewer || status === 'published'
  const stageCapIds = row.stages.flatMap((s) =>
    s.stageCapabilities.filter((sc) => capAllowed(sc.capability.status)).map((sc) => sc.capabilityId),
  )
  const directCapIds = row.valueStreamCapabilities
    .filter((vc) => capAllowed(vc.capability.status))
    .map((vc) => vc.capabilityId)
  const capWithApps = await getCapabilitiesWithApps([...new Set([...stageCapIds, ...directCapIds])])
  const capById = new Map(capWithApps.map((c) => [c.id, c]))

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

  return {
    kind: 'value-stream',
    id: row.id,
    name: row.name,
    valueItem: row.valueItem,
    description: row.description,
    status: row.status,
    personas: row.valueStreamPersonas
      .map(({ persona: p }) => p)
      .filter((p) => !isViewer || p.status === 'published')
      .map((p) => ({ id: p.id, name: p.name, type: p.type }))
      .sort(byName),
    objectives: row.objectiveValueStreams
      .map(({ objective: o }) => o)
      .filter((o) => !isViewer || o.status === 'published')
      .map((o) => ({ id: o.id, name: o.name, timeHorizon: o.timeHorizon }))
      .sort(byName),
    services: serviceVsRows
      .map(({ service: s }) => s)
      .filter((s) => !isViewer || s.status === 'published')
      .map((s) => ({ id: s.id, name: s.name }))
      .sort(byName),
    stages: row.stages.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      order: s.order,
      capabilities: s.stageCapabilities
        .filter((sc) => capAllowed(sc.capability.status))
        .map((sc) => capById.get(sc.capabilityId))
        .filter((c): c is TraceCapability => Boolean(c)),
    })),
    applications: dedupeTraceRows(capWithApps.flatMap((c) => c.applications)),
  }
}

// ── Trace participation (#695) ────────────────────────────────────────────────
//
// Non-root entities (applications, initiatives, personas, value streams,
// ADRs, principles) appear inside trace chains but are not trace roots. Their
// detail pages still need a working "View traceability →" entry point, so
// /traceability?from=<kind>&id=<id> renders a participation panel: the
// record's one-hop connections to the native trace roots (capabilities,
// objectives, services), each linking into the existing root trace views.
// No new diagram — this is discoverability plumbing.

export interface TraceParticipation {
  kind: TraceParticipantKind
  id: string
  name: string
  /** One-hop connections to trace roots, viewer-visibility filtered. */
  connections: {
    capabilities: { id: string; name: string }[]
    objectives: { id: string; name: string }[]
    services: { id: string; name: string }[]
  }
}

type RootRow = { id: string; name: string; organizationId: string; visibility: string; status: string }

export async function getTraceParticipation(
  kind: TraceParticipantKind,
  id: string,
): Promise<TraceParticipation | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const viewerOrgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  // Subject record — same record-level gate the root trace loaders apply.
  const subject =
    kind === 'application' ? await db.query.applications.findFirst({ where: eq(applications.id, id) })
    : kind === 'initiative' ? await db.query.initiatives.findFirst({ where: eq(initiatives.id, id) })
    : kind === 'persona' ? await db.query.personas.findFirst({ where: eq(personas.id, id) })
    : kind === 'adr' ? await db.query.adrs.findFirst({ where: eq(adrs.id, id) })
    : await db.query.principles.findFirst({ where: eq(principles.id, id) })

  if (!subject) return null
  const visible = await canReadFederatedEntity(subject.organizationId, subject.visibility, viewerOrgId)
  if (!visible) return null

  // One-hop root connections per kind.
  const capabilityIds: string[] = []
  const objectiveIds: string[] = []
  const serviceIds: string[] = []

  if (kind === 'application') {
    const rows = await db.select({ id: applicationCapabilities.capabilityId })
      .from(applicationCapabilities).where(eq(applicationCapabilities.applicationId, id))
    capabilityIds.push(...rows.map(r => r.id))
  } else if (kind === 'initiative') {
    const [caps, objs] = await Promise.all([
      db.select({ id: initiativeCapabilities.capabilityId })
        .from(initiativeCapabilities).where(eq(initiativeCapabilities.initiativeId, id)),
      db.select({ id: initiativeObjectives.objectiveId })
        .from(initiativeObjectives).where(eq(initiativeObjectives.initiativeId, id)),
    ])
    capabilityIds.push(...caps.map(r => r.id))
    objectiveIds.push(...objs.map(r => r.id))
  } else if (kind === 'persona') {
    const [caps, svcs] = await Promise.all([
      db.select({ id: capabilityPersonas.capabilityId })
        .from(capabilityPersonas).where(eq(capabilityPersonas.personaId, id)),
      db.select({ id: servicePersonas.serviceId })
        .from(servicePersonas).where(eq(servicePersonas.personaId, id)),
    ])
    capabilityIds.push(...caps.map(r => r.id))
    serviceIds.push(...svcs.map(r => r.id))
  } else if (kind === 'adr') {
    const [caps, objs] = await Promise.all([
      db.select({ id: adrCapabilities.capabilityId })
        .from(adrCapabilities).where(eq(adrCapabilities.adrId, id)),
      db.select({ id: adrObjectives.objectiveId })
        .from(adrObjectives).where(eq(adrObjectives.adrId, id)),
    ])
    capabilityIds.push(...caps.map(r => r.id))
    objectiveIds.push(...objs.map(r => r.id))
  } else {
    const rows = await db.select({ id: principleCapabilities.capabilityId })
      .from(principleCapabilities).where(eq(principleCapabilities.principleId, id))
    capabilityIds.push(...rows.map(r => r.id))
  }

  // Connected roots a stakeholder may follow: same-org or instance-visible,
  // and published-only for viewers — matching the trace pages' promise that
  // relationships reflect published, visible records only.
  const rootVisible = (r: RootRow) =>
    (r.organizationId === viewerOrgId || r.visibility === 'instance') &&
    (!isViewer || r.status === 'published')

  const [capRows, objRows, svcRows] = await Promise.all([
    capabilityIds.length > 0
      ? db.select({ id: capabilities.id, name: capabilities.name, organizationId: capabilities.organizationId, visibility: capabilities.visibility, status: capabilities.status })
          .from(capabilities).where(inArray(capabilities.id, capabilityIds))
      : Promise.resolve([] as RootRow[]),
    objectiveIds.length > 0
      ? db.select({ id: strategicObjectives.id, name: strategicObjectives.name, organizationId: strategicObjectives.organizationId, visibility: strategicObjectives.visibility, status: strategicObjectives.status })
          .from(strategicObjectives).where(inArray(strategicObjectives.id, objectiveIds))
      : Promise.resolve([] as RootRow[]),
    serviceIds.length > 0
      ? db.select({ id: services.id, name: services.name, organizationId: services.organizationId, visibility: services.visibility, status: services.status })
          .from(services).where(inArray(services.id, serviceIds))
      : Promise.resolve([] as RootRow[]),
  ])

  const toRef = (r: RootRow) => ({ id: r.id, name: r.name })
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

  return {
    kind,
    id,
    name: kind === 'adr' ? (subject as { title: string }).title : (subject as { name: string }).name,
    connections: {
      capabilities: capRows.filter(rootVisible).map(toRef).sort(byName),
      objectives: objRows.filter(rootVisible).map(toRef).sort(byName),
      services: svcRows.filter(rootVisible).map(toRef).sort(byName),
    },
  }
}
