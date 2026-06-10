'use server'

import { db } from '@/db/client'
import { applications, capabilities, applicationCapabilities, capabilityPersonas, initiativeCapabilities, initiativeApplications } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity } from '@/lib/federation'

export type RiskLevel = 'high' | 'medium' | 'none'

export type OrphanedCapability = {
  id: string
  name: string
  personaCount: number
}

export type ImpactPersona = {
  id: string
  name: string
  type: string | null
}

export type ImpactInitiative = {
  id: string
  name: string
  impact: string | null
  status: string
}

export type ApplicationImpact = {
  orphanedCapabilities: OrphanedCapability[]
  affectedPersonas: ImpactPersona[]
  activeInitiatives: ImpactInitiative[]
  riskLevel: RiskLevel
}

export type CapabilityImpact = {
  dependentPersonas: ImpactPersona[]
  soleCoveragePersonaIds: string[]
  activeInitiatives: ImpactInitiative[]
  riskLevel: RiskLevel
}

const EMPTY_APPLICATION_IMPACT: ApplicationImpact = {
  orphanedCapabilities: [], affectedPersonas: [], activeInitiatives: [], riskLevel: 'none',
}
const EMPTY_CAPABILITY_IMPACT: CapabilityImpact = {
  dependentPersonas: [], soleCoveragePersonaIds: [], activeInitiatives: [], riskLevel: 'none',
}

export async function getApplicationImpact(applicationId: string): Promise<ApplicationImpact> {
  // Access control (#738): these are `'use server'` endpoints addressable
  // directly, so they must enforce auth + tenant scoping themselves — the
  // page-level guard does not protect a direct action invocation. Mirror the
  // pattern in impact-analysis.ts: authenticate, then confirm the caller may
  // read this entity under federated-visibility rules before returning any
  // dependency data. Unreadable → empty result, never another org's data.
  const session = await auth()
  if (!session?.user) redirect('/login')

  const application = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    columns: { organizationId: true, visibility: true },
  })
  if (!application) return EMPTY_APPLICATION_IMPACT
  const visible = await canReadFederatedEntity(application.organizationId, application.visibility, session.user.organizationId!)
  if (!visible) return EMPTY_APPLICATION_IMPACT

  // Capabilities this application supports
  const linkedCapRows = await db.query.applicationCapabilities.findMany({
    where: eq(applicationCapabilities.applicationId, applicationId),
    with: { capability: { columns: { id: true, name: true } } },
  })
  const capIds = linkedCapRows.map(r => r.capabilityId)

  let orphanedCapabilities: OrphanedCapability[] = []
  const affectedPersonas: ImpactPersona[] = []

  if (capIds.length > 0) {
    // All applications supporting those capabilities
    const allSupportRows = await db.query.applicationCapabilities.findMany({
      where: inArray(applicationCapabilities.capabilityId, capIds),
    })

    // Map capabilityId → count of OTHER applications supporting it
    const otherSupporters = new Map<string, number>()
    for (const row of allSupportRows) {
      if (row.applicationId === applicationId) continue
      otherSupporters.set(row.capabilityId, (otherSupporters.get(row.capabilityId) ?? 0) + 1)
    }

    const orphanedCapIds = capIds.filter(id => !otherSupporters.has(id))

    if (orphanedCapIds.length > 0) {
      const personaRows = await db.query.capabilityPersonas.findMany({
        where: inArray(capabilityPersonas.capabilityId, orphanedCapIds),
        with: { persona: { columns: { id: true, name: true, type: true } } },
      })

      const personasByCapId = new Map<string, number>()
      const seenPersonaIds = new Set<string>()
      for (const row of personaRows) {
        personasByCapId.set(row.capabilityId, (personasByCapId.get(row.capabilityId) ?? 0) + 1)
        if (!seenPersonaIds.has(row.personaId)) {
          seenPersonaIds.add(row.personaId)
          affectedPersonas.push(row.persona)
        }
      }

      const capNameById = new Map(linkedCapRows.map(r => [r.capabilityId, r.capability.name]))
      orphanedCapabilities = orphanedCapIds.map(capId => ({
        id: capId,
        name: capNameById.get(capId)!,
        personaCount: personasByCapId.get(capId) ?? 0,
      }))
    }
  }

  // Initiatives that reference this application
  const initiativeRows = await db.query.initiativeApplications.findMany({
    where: eq(initiativeApplications.applicationId, applicationId),
    with: { initiative: { columns: { id: true, name: true, status: true } } },
  })
  const activeInitiatives: ImpactInitiative[] = initiativeRows.map(r => ({
    id: r.initiative.id,
    name: r.initiative.name,
    impact: r.impact,
    status: r.initiative.status,
  }))

  const riskLevel: RiskLevel =
    orphanedCapabilities.length > 0 && affectedPersonas.length > 0 ? 'high' :
    orphanedCapabilities.length > 0 || activeInitiatives.length > 0 ? 'medium' :
    'none'

  return { orphanedCapabilities, affectedPersonas, activeInitiatives, riskLevel }
}

export async function getCapabilityImpact(capabilityId: string): Promise<CapabilityImpact> {
  // Access control (#738) — see getApplicationImpact above.
  const session = await auth()
  if (!session?.user) redirect('/login')

  const capability = await db.query.capabilities.findFirst({
    where: eq(capabilities.id, capabilityId),
    columns: { organizationId: true, visibility: true },
  })
  if (!capability) return EMPTY_CAPABILITY_IMPACT
  const visible = await canReadFederatedEntity(capability.organizationId, capability.visibility, session.user.organizationId!)
  if (!visible) return EMPTY_CAPABILITY_IMPACT

  // Personas that rely on this capability
  const personaRows = await db.query.capabilityPersonas.findMany({
    where: eq(capabilityPersonas.capabilityId, capabilityId),
    with: { persona: { columns: { id: true, name: true, type: true } } },
  })
  const dependentPersonas: ImpactPersona[] = personaRows.map(r => r.persona)
  const personaIds = personaRows.map(r => r.personaId)

  let soleCoveragePersonaIds: string[] = []

  if (personaIds.length > 0) {
    const allCapRows = await db.query.capabilityPersonas.findMany({
      where: inArray(capabilityPersonas.personaId, personaIds),
    })
    const otherCapsForPersona = new Map<string, number>()
    for (const row of allCapRows) {
      if (row.capabilityId === capabilityId) continue
      otherCapsForPersona.set(row.personaId, (otherCapsForPersona.get(row.personaId) ?? 0) + 1)
    }
    soleCoveragePersonaIds = personaIds.filter(id => !otherCapsForPersona.has(id))
  }

  // Initiatives that reference this capability
  const initiativeRows = await db.query.initiativeCapabilities.findMany({
    where: eq(initiativeCapabilities.capabilityId, capabilityId),
    with: { initiative: { columns: { id: true, name: true, status: true } } },
  })
  const activeInitiatives: ImpactInitiative[] = initiativeRows.map(r => ({
    id: r.initiative.id,
    name: r.initiative.name,
    impact: r.impact,
    status: r.initiative.status,
  }))

  const riskLevel: RiskLevel =
    soleCoveragePersonaIds.length > 0 ? 'high' :
    dependentPersonas.length > 0 || activeInitiatives.length > 0 ? 'medium' :
    'none'

  return { dependentPersonas, soleCoveragePersonaIds, activeInitiatives, riskLevel }
}
