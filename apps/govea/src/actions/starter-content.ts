'use server'

import { db } from '@/db/client'
import {
  personas, capabilities, applications, strategicObjectives, adrs,
  capabilityPersonas, applicationCapabilities, objectiveCapabilities, adrCapabilities,
} from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { EASYEA_STARTER, STARTER_CONTENT_MARKER, type StarterPack } from '@/lib/starter-content/easyea-starter'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export type StarterApplyResult = {
  packName: string
  personasCreated: number
  personasSkipped: number
  capabilitiesCreated: number
  capabilitiesSkipped: number
  applicationsCreated: number
  applicationsSkipped: number
  objectivesCreated: number
  objectivesSkipped: number
  adrsCreated: number
  adrsSkipped: number
}

/**
 * Apply a starter content pack to the caller's org (#587).
 *
 * Idempotent — names that already exist in the org are skipped, not
 * overwritten. The action returns per-entity created/skipped counts so
 * the UI can show "added N of M items" framing rather than pretending
 * everything is new on a re-run.
 *
 * Admin-gated: starter content is an org-shaping action, not routine
 * content editing.
 */
export async function applyStarterPack(packName: string): Promise<StarterApplyResult> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const pack = resolvePack(packName)
  if (!pack) throw new Error(`Unknown starter pack: ${packName}`)

  const result: StarterApplyResult = {
    packName: pack.packName,
    personasCreated: 0, personasSkipped: 0,
    capabilitiesCreated: 0, capabilitiesSkipped: 0,
    applicationsCreated: 0, applicationsSkipped: 0,
    objectivesCreated: 0, objectivesSkipped: 0,
    adrsCreated: 0, adrsSkipped: 0,
  }

  await db.transaction(async (tx) => {
    // ── Personas ────────────────────────────────────────────────────────
    const existingPersonas = await tx.select({ id: personas.id, name: personas.name })
      .from(personas).where(eq(personas.organizationId, orgId))
    const personaIdByName = new Map(existingPersonas.map(p => [p.name.toLowerCase(), p.id]))

    for (const p of pack.personas) {
      if (personaIdByName.has(p.name.toLowerCase())) {
        result.personasSkipped++
        continue
      }
      const [row] = await tx.insert(personas).values({
        organizationId: orgId, name: p.name, description: p.description, type: p.type,
        status: 'published', visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: personas.id, name: personas.name })
      personaIdByName.set(row.name.toLowerCase(), row.id)
      result.personasCreated++
    }

    // ── Capabilities + persona links ────────────────────────────────────
    const existingCaps = await tx.select({ id: capabilities.id, name: capabilities.name })
      .from(capabilities).where(eq(capabilities.organizationId, orgId))
    const capIdByName = new Map(existingCaps.map(c => [c.name.toLowerCase(), c.id]))

    for (const c of pack.capabilities) {
      if (capIdByName.has(c.name.toLowerCase())) {
        result.capabilitiesSkipped++
        continue
      }
      const [row] = await tx.insert(capabilities).values({
        organizationId: orgId, name: c.name, description: c.description, domain: c.domain,
        behaviors: c.behaviors, rules: c.rules, capabilityType: c.capabilityType,
        status: 'published', visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: capabilities.id, name: capabilities.name })
      capIdByName.set(row.name.toLowerCase(), row.id)
      result.capabilitiesCreated++

      const personaIds = c.personas
        .map(name => personaIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (personaIds.length > 0) {
        await tx.insert(capabilityPersonas).values(
          personaIds.map(personaId => ({ capabilityId: row.id, personaId }))
        )
      }
    }

    // ── Applications + capability links ─────────────────────────────────
    const existingApps = await tx.select({ id: applications.id, name: applications.name })
      .from(applications).where(eq(applications.organizationId, orgId))
    const appNameSet = new Set(existingApps.map(a => a.name.toLowerCase()))

    for (const a of pack.applications) {
      if (appNameSet.has(a.name.toLowerCase())) {
        result.applicationsSkipped++
        continue
      }
      const [row] = await tx.insert(applications).values({
        organizationId: orgId, name: a.name, description: a.description, vendor: a.vendor,
        hostingModel: a.hostingModel, lifecycleStatus: a.lifecycleStatus,
        status: 'published', visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: applications.id, name: applications.name })
      appNameSet.add(row.name.toLowerCase())
      result.applicationsCreated++

      const capIds = a.capabilities
        .map(name => capIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (capIds.length > 0) {
        await tx.insert(applicationCapabilities).values(
          capIds.map(capabilityId => ({ applicationId: row.id, capabilityId }))
        )
      }
    }

    // ── Objectives + capability links ───────────────────────────────────
    const existingObjs = await tx.select({ id: strategicObjectives.id, name: strategicObjectives.name })
      .from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId))
    const objNameSet = new Set(existingObjs.map(o => o.name.toLowerCase()))

    for (const o of pack.objectives) {
      if (objNameSet.has(o.name.toLowerCase())) {
        result.objectivesSkipped++
        continue
      }
      const [row] = await tx.insert(strategicObjectives).values({
        organizationId: orgId, name: o.name, description: o.description,
        successMetric: o.successMetric, timeHorizon: o.timeHorizon,
        status: 'published', visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: strategicObjectives.id, name: strategicObjectives.name })
      objNameSet.add(row.name.toLowerCase())
      result.objectivesCreated++

      const capIds = o.capabilities
        .map(name => capIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (capIds.length > 0) {
        await tx.insert(objectiveCapabilities).values(
          capIds.map(capabilityId => ({ objectiveId: row.id, capabilityId }))
        )
      }
    }

    // ── ADRs + capability links ─────────────────────────────────────────
    // Match existing ADRs by title (number is bumpable if the org already
    // has an ADR-001 of their own).
    const existingAdrs = await tx.select({ id: adrs.id, number: adrs.number, title: adrs.title })
      .from(adrs).where(eq(adrs.organizationId, orgId))
    const adrTitleSet = new Set(existingAdrs.map(a => a.title.toLowerCase()))
    const adrNumberSet = new Set(existingAdrs.map(a => a.number.toLowerCase()))

    for (const adr of pack.adrs) {
      if (adrTitleSet.has(adr.title.toLowerCase())) {
        result.adrsSkipped++
        continue
      }
      // If the canonical number is taken, find the next free slot.
      let number = adr.number
      let suffix = 1
      while (adrNumberSet.has(number.toLowerCase())) {
        number = `${adr.number}-${suffix}`
        suffix++
      }
      const [row] = await tx.insert(adrs).values({
        organizationId: orgId, number, title: adr.title,
        context: adr.context, decision: adr.decision, consequences: adr.consequences,
        status: adr.status, visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: adrs.id, title: adrs.title, number: adrs.number })
      adrTitleSet.add(row.title.toLowerCase())
      adrNumberSet.add(row.number.toLowerCase())
      result.adrsCreated++

      const capIds = adr.capabilities
        .map(name => capIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (capIds.length > 0) {
        await tx.insert(adrCapabilities).values(
          capIds.map(capabilityId => ({ adrId: row.id, capabilityId }))
        )
      }
    }

    await writeAuditLog(tx, {
      action: 'starter_content.apply',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      after: { ...result },
    })
  })

  // Revalidate the catalog routes the user will navigate to next.
  for (const path of ['/personas', '/capabilities', '/applications', '/objectives', '/adrs', '/dashboard', '/settings']) {
    revalidatePath(path)
  }

  return result
}

function resolvePack(packName: string): StarterPack | null {
  switch (packName) {
    case 'easyea-starter': return EASYEA_STARTER
    default: return null
  }
}

// Note: AVAILABLE_STARTER_PACKS and STARTER_CONTENT_MARKER live in the
// data module (`lib/starter-content/easyea-starter.ts`) so the UI can import
// them directly. `'use server'` files cannot export non-function constants.
