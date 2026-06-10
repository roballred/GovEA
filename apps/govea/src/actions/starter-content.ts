'use server'

import { db } from '@/db/client'
import {
  personas, capabilities, applications, strategicObjectives, adrs, initiatives,
  capabilityPersonas, applicationCapabilities, objectiveCapabilities, adrCapabilities, initiativeCapabilities,
  taxonomyTerms,
} from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { installRecipe } from '@/lib/recipes/install'
import { getRecipe } from '@/lib/recipes/catalog'
import { syncEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import type { InstallResult } from '@/lib/recipes/types'
import { TOGAF_STARTER, type StarterPack } from '@/lib/starter-content/togaf-starter'

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
  initiativesCreated: number
  initiativesSkipped: number
  /** Counts from the recipe install that runs before the sample content (#749). */
  recipe: InstallResult
}

/**
 * Apply a starter content pack to the caller's org (#587, #749).
 *
 * The pack is **recipe-backed** (#749): it first installs the pack's recipe
 * (TOGAF taxonomy types/terms/bindings + glossary + principles) via
 * installRecipe(), then lays down a coherent sample repository and tags the new
 * capabilities/applications/initiatives to the recipe's taxonomy terms by stable
 * slug. There is no second hard-coded framework path — the report presets read
 * the same taxonomy this install produces.
 *
 * Idempotent — names that already exist in the org are skipped, not
 * overwritten (and skipped entities are not re-tagged, so the admin's own
 * classifications are never clobbered). The recipe install is itself idempotent.
 * The action returns per-entity created/skipped counts so the UI can show
 * "added N of M items" framing rather than pretending everything is new.
 *
 * Admin-gated: starter content is an org-shaping action, not routine
 * content editing.
 */
export async function applyStarterPack(packName: string): Promise<StarterApplyResult> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const pack = resolvePack(packName)
  if (!pack) throw new Error(`Unknown starter pack: ${packName}`)

  const recipe = getRecipe(pack.recipeSlug)
  if (!recipe) throw new Error(`Unknown recipe for starter pack: ${pack.recipeSlug}`)

  // 1) Install the recipe first (own transaction, idempotent) so its taxonomy
  //    terms exist and are committed before we resolve + tag against them.
  const recipeResult = await installRecipe(orgId, recipe, session.user.id)

  const result: StarterApplyResult = {
    packName: pack.packName,
    personasCreated: 0, personasSkipped: 0,
    capabilitiesCreated: 0, capabilitiesSkipped: 0,
    applicationsCreated: 0, applicationsSkipped: 0,
    objectivesCreated: 0, objectivesSkipped: 0,
    adrsCreated: 0, adrsSkipped: 0,
    initiativesCreated: 0, initiativesSkipped: 0,
    recipe: recipeResult,
  }

  await db.transaction(async (tx) => {
    // ── Resolve recipe taxonomy term slugs → ids (for tagging below) ─────
    // Generic: walk the recipe's own types so a term slug only resolves
    // within the recipe that defined it (no cross-type slug collisions).
    const termBySlug = new Map<string, string>()
    for (const type of recipe.taxonomyTypes ?? []) {
      const [parent] = await tx.select({ id: taxonomyTerms.id })
        .from(taxonomyTerms)
        .where(and(
          eq(taxonomyTerms.organizationId, orgId),
          isNull(taxonomyTerms.parentId),
          eq(taxonomyTerms.slug, type.slug),
        ))
        .limit(1)
      if (!parent) continue
      const children = await tx.select({ id: taxonomyTerms.id, slug: taxonomyTerms.slug })
        .from(taxonomyTerms)
        .where(and(eq(taxonomyTerms.organizationId, orgId), eq(taxonomyTerms.parentId, parent.id)))
      for (const c of children) termBySlug.set(c.slug, c.id)
    }
    const resolveTerms = (slugs: (string | undefined)[]): string[] =>
      slugs.map(s => (s ? termBySlug.get(s) : undefined)).filter((id): id is string => Boolean(id))

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

    // ── Capabilities + persona links + taxonomy tags ────────────────────
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

      // Tag with TOGAF Architecture Domain(s) + ADM Phase (#749).
      const termIds = resolveTerms([...c.togafDomains, c.admPhase])
      if (termIds.length > 0) {
        await syncEntityTaxonomyValues(tx, orgId, 'capability', row.id, termIds)
      }
    }

    // ── Applications + capability links + taxonomy tags ─────────────────
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

      // Tag with TOGAF Architecture Domain(s) (#749).
      const termIds = resolveTerms(a.togafDomains)
      if (termIds.length > 0) {
        await syncEntityTaxonomyValues(tx, orgId, 'application', row.id, termIds)
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

    // ── Initiatives + capability links + ADM Phase tag (#749) ───────────
    const existingInits = await tx.select({ id: initiatives.id, name: initiatives.name })
      .from(initiatives).where(eq(initiatives.organizationId, orgId))
    const initNameSet = new Set(existingInits.map(i => i.name.toLowerCase()))

    for (const init of pack.initiatives) {
      if (initNameSet.has(init.name.toLowerCase())) {
        result.initiativesSkipped++
        continue
      }
      const [row] = await tx.insert(initiatives).values({
        organizationId: orgId, name: init.name, description: init.description,
        status: init.status, startDate: init.startDate, endDate: init.endDate,
        visibility: 'org',
        createdBy: session.user.id, updatedBy: session.user.id,
      }).returning({ id: initiatives.id, name: initiatives.name })
      initNameSet.add(row.name.toLowerCase())
      result.initiativesCreated++

      const capIds = init.capabilities
        .map(name => capIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (capIds.length > 0) {
        await tx.insert(initiativeCapabilities).values(
          capIds.map(capabilityId => ({ initiativeId: row.id, capabilityId, impact: null }))
        )
      }

      const termIds = resolveTerms([init.admPhase])
      if (termIds.length > 0) {
        await syncEntityTaxonomyValues(tx, orgId, 'initiative', row.id, termIds)
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

  // Revalidate the catalog + report routes the user will navigate to next.
  for (const path of [
    '/personas', '/capabilities', '/applications', '/objectives', '/adrs', '/initiatives',
    '/glossary', '/principles', '/reports', '/dashboard', '/settings',
  ]) {
    revalidatePath(path)
  }

  return result
}

function resolvePack(packName: string): StarterPack | null {
  switch (packName) {
    case 'togaf-starter': return TOGAF_STARTER
    default: return null
  }
}

// Note: AVAILABLE_STARTER_PACKS and STARTER_CONTENT_MARKER live in the
// data module (`lib/starter-content/togaf-starter.ts`) so the UI can import
// them directly. `'use server'` files cannot export non-function constants.
