'use server'

import { db } from '@/db/client'
import {
  strategicObjectives, capabilities, services,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
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
  capabilities: TraceCapability[]
  directApplications: TraceApp[]
  initiatives: TraceInitiative[]
}

export interface CapabilityTrace {
  kind: 'capability'
  id: string; name: string; domain: string | null; description: string | null; status: string
  objectives: TraceObjective[]
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
  directApplications: TraceApp[]
}

export type TraceData = ObjectiveTrace | CapabilityTrace | ServiceTrace

// ── Objective trace ───────────────────────────────────────────────────────────

export async function getObjectiveTrace(id: string): Promise<ObjectiveTrace | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db.query.strategicObjectives.findFirst({
    where: eq(strategicObjectives.id, id),
    with: {
      objectiveCapabilities: {
        with: {
          capability: {
            with: {
              applicationCapabilities: { with: { application: true } },
            },
          },
        },
      },
      objectiveApplications: { with: { application: true } },
      initiativeObjectives: { with: { initiative: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

  return {
    kind: 'objective',
    id: row.id,
    name: row.name,
    description: row.description,
    successMetric: row.successMetric,
    timeHorizon: row.timeHorizon,
    status: row.status,
    capabilities: row.objectiveCapabilities.map(({ capability: c }) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      applications: c.applicationCapabilities.map(({ application: a }) => ({
        id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus,
      })),
    })),
    directApplications: row.objectiveApplications.map(({ application: a }) => ({
      id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus,
    })),
    initiatives: row.initiativeObjectives.map(({ initiative: i }) => ({
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

  return {
    kind: 'capability',
    id: row.id,
    name: row.name,
    domain: row.domain,
    description: row.description,
    status: row.status,
    objectives: row.objectiveCapabilities.map(({ objective: o }) => ({
      id: o.id, name: o.name, timeHorizon: o.timeHorizon,
    })),
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
      serviceCapabilities: {
        with: {
          capability: {
            with: {
              applicationCapabilities: { with: { application: true } },
            },
          },
        },
      },
      serviceApplications: { with: { application: true } },
    },
  })

  if (!row) return null
  const visible = await canReadFederatedEntity(row.organizationId, row.visibility, session.user.organizationId!)
  if (!visible) return null

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
    capabilities: row.serviceCapabilities.map(({ capability: c }) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      applications: c.applicationCapabilities.map(({ application: a }) => ({
        id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus,
      })),
    })),
    directApplications: row.serviceApplications.map(({ application: a }) => ({
      id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus,
    })),
  }
}
