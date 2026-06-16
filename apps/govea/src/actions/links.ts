'use server'

/**
 * Individual link / unlink actions for every many-to-many junction.
 *
 * Each pair follows the same pattern:
 *   1. Require contributor role
 *   2. Verify org ownership of the "source" entity
 *   3. Insert (onConflictDoNothing) or delete the junction row
 *   4. Revalidate the source entity's detail page
 */

import { db } from '@/db/client'
import {
  capabilities,
  capabilityPersonas,
  applications,
  applicationCapabilities,
  personas,
  valueStreams,
  valueStreamPersonas,
  valueStreamCapabilities,
  strategicObjectives,
  objectiveCapabilities,
  objectiveValueStreams,
  goals,
  goalObjectives,
  strategies,
  strategyGoals,
  strategyCapabilities,
  strategyValueStreams,
  strategyInitiatives,
  initiatives,
  initiativeCapabilities,
  initiativeObjectives,
  initiativeApplications,
  adrs,
  adrCapabilities,
  adrApplications,
  adrInitiatives,
  adrObjectives,
  principles,
  principleCapabilities,
  principleAdrs,
  services,
  serviceCapabilities,
  servicePersonas,
  serviceValueStreams,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { assertOwnership, assertEntityInOrg } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')
  return session
}

// ── Capability ↔ Persona ────────────────────────────────────────────────────

export async function linkCapabilityPersona(capabilityId: string, personaId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await assertEntityInOrg('persona', personaId, user.organizationId!)
  await db.insert(capabilityPersonas).values({ capabilityId, personaId }).onConflictDoNothing()
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function unlinkCapabilityPersona(capabilityId: string, personaId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await db.delete(capabilityPersonas).where(
    and(eq(capabilityPersonas.capabilityId, capabilityId), eq(capabilityPersonas.personaId, personaId))
  )
  revalidatePath(`/capabilities/${capabilityId}`)
}

// ── Capability ↔ Application ────────────────────────────────────────────────

export async function linkCapabilityApplication(capabilityId: string, applicationId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await assertEntityInOrg('application', applicationId, user.organizationId!)
  await db.insert(applicationCapabilities).values({ capabilityId, applicationId }).onConflictDoNothing()
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function unlinkCapabilityApplication(capabilityId: string, applicationId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await db.delete(applicationCapabilities).where(
    and(eq(applicationCapabilities.capabilityId, capabilityId), eq(applicationCapabilities.applicationId, applicationId))
  )
  revalidatePath(`/capabilities/${capabilityId}`)
}

// ── Capability ↔ Objective ──────────────────────────────────────────────────

export async function linkCapabilityObjective(capabilityId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await assertEntityInOrg('objective', objectiveId, user.organizationId!)
  await db.insert(objectiveCapabilities).values({ capabilityId, objectiveId }).onConflictDoNothing()
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function unlinkCapabilityObjective(capabilityId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await db.delete(objectiveCapabilities).where(
    and(eq(objectiveCapabilities.capabilityId, capabilityId), eq(objectiveCapabilities.objectiveId, objectiveId))
  )
  revalidatePath(`/capabilities/${capabilityId}`)
}

// ── Capability ↔ Initiative ─────────────────────────────────────────────────

export async function linkCapabilityInitiative(capabilityId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await assertEntityInOrg('initiative', initiativeId, user.organizationId!)
  await db.insert(initiativeCapabilities).values({ capabilityId, initiativeId }).onConflictDoNothing()
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function unlinkCapabilityInitiative(capabilityId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await db.delete(initiativeCapabilities).where(
    and(eq(initiativeCapabilities.capabilityId, capabilityId), eq(initiativeCapabilities.initiativeId, initiativeId))
  )
  revalidatePath(`/capabilities/${capabilityId}`)
}

// ── Capability ↔ ADR ────────────────────────────────────────────────────────

export async function linkCapabilityAdr(capabilityId: string, adrId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await assertEntityInOrg('adr', adrId, user.organizationId!)
  await db.insert(adrCapabilities).values({ capabilityId, adrId }).onConflictDoNothing()
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function unlinkCapabilityAdr(capabilityId: string, adrId: string) {
  const { user } = await requireContributor()
  const cap = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(cap?.organizationId, user.organizationId!)
  await db.delete(adrCapabilities).where(
    and(eq(adrCapabilities.capabilityId, capabilityId), eq(adrCapabilities.adrId, adrId))
  )
  revalidatePath(`/capabilities/${capabilityId}`)
}

// ── Application ↔ Capability ────────────────────────────────────────────────

export async function linkApplicationCapability(applicationId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(applicationCapabilities).values({ applicationId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/applications/${applicationId}`)
}

export async function unlinkApplicationCapability(applicationId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await db.delete(applicationCapabilities).where(
    and(eq(applicationCapabilities.applicationId, applicationId), eq(applicationCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/applications/${applicationId}`)
}

// ── Application ↔ Initiative ────────────────────────────────────────────────

export async function linkApplicationInitiative(applicationId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await assertEntityInOrg('initiative', initiativeId, user.organizationId!)
  await db.insert(initiativeApplications).values({ applicationId, initiativeId }).onConflictDoNothing()
  revalidatePath(`/applications/${applicationId}`)
}

export async function unlinkApplicationInitiative(applicationId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await db.delete(initiativeApplications).where(
    and(eq(initiativeApplications.applicationId, applicationId), eq(initiativeApplications.initiativeId, initiativeId))
  )
  revalidatePath(`/applications/${applicationId}`)
}

// ── Application ↔ ADR ───────────────────────────────────────────────────────

export async function linkApplicationAdr(applicationId: string, adrId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await assertEntityInOrg('adr', adrId, user.organizationId!)
  await db.insert(adrApplications).values({ applicationId, adrId }).onConflictDoNothing()
  revalidatePath(`/applications/${applicationId}`)
}

export async function unlinkApplicationAdr(applicationId: string, adrId: string) {
  const { user } = await requireContributor()
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(app?.organizationId, user.organizationId!)
  await db.delete(adrApplications).where(
    and(eq(adrApplications.applicationId, applicationId), eq(adrApplications.adrId, adrId))
  )
  revalidatePath(`/applications/${applicationId}`)
}

// ── Persona ↔ Capability ────────────────────────────────────────────────────

export async function linkPersonaCapability(personaId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const p = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(capabilityPersonas).values({ personaId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/personas/${personaId}`)
}

export async function unlinkPersonaCapability(personaId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const p = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await db.delete(capabilityPersonas).where(
    and(eq(capabilityPersonas.personaId, personaId), eq(capabilityPersonas.capabilityId, capabilityId))
  )
  revalidatePath(`/personas/${personaId}`)
}

// ── Persona ↔ Value Stream ──────────────────────────────────────────────────

export async function linkPersonaValueStream(personaId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const p = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await assertEntityInOrg('value_stream', valueStreamId, user.organizationId!)
  await db.insert(valueStreamPersonas).values({ personaId, valueStreamId }).onConflictDoNothing()
  revalidatePath(`/personas/${personaId}`)
}

export async function unlinkPersonaValueStream(personaId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const p = await db.query.personas.findFirst({ where: eq(personas.id, personaId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await db.delete(valueStreamPersonas).where(
    and(eq(valueStreamPersonas.personaId, personaId), eq(valueStreamPersonas.valueStreamId, valueStreamId))
  )
  revalidatePath(`/personas/${personaId}`)
}

// ── Value Stream ↔ Persona ──────────────────────────────────────────────────

export async function linkValueStreamPersona(valueStreamId: string, personaId: string) {
  const { user } = await requireContributor()
  const vs = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })
  assertOwnership(vs?.organizationId, user.organizationId!)
  await assertEntityInOrg('persona', personaId, user.organizationId!)
  await db.insert(valueStreamPersonas).values({ valueStreamId, personaId }).onConflictDoNothing()
  revalidatePath(`/value-streams/${valueStreamId}`)
}

export async function unlinkValueStreamPersona(valueStreamId: string, personaId: string) {
  const { user } = await requireContributor()
  const vs = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })
  assertOwnership(vs?.organizationId, user.organizationId!)
  await db.delete(valueStreamPersonas).where(
    and(eq(valueStreamPersonas.valueStreamId, valueStreamId), eq(valueStreamPersonas.personaId, personaId))
  )
  revalidatePath(`/value-streams/${valueStreamId}`)
}

// ── Value Stream ↔ Capability (direct, stream-level — #734) ──────────────────

export async function linkValueStreamCapability(valueStreamId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const vs = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })
  assertOwnership(vs?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(valueStreamCapabilities).values({ valueStreamId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/value-streams/${valueStreamId}`)
}

export async function unlinkValueStreamCapability(valueStreamId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const vs = await db.query.valueStreams.findFirst({ where: eq(valueStreams.id, valueStreamId) })
  assertOwnership(vs?.organizationId, user.organizationId!)
  await db.delete(valueStreamCapabilities).where(
    and(eq(valueStreamCapabilities.valueStreamId, valueStreamId), eq(valueStreamCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/value-streams/${valueStreamId}`)
}

// ── Goal ↔ Objective ───────────────────────────────────────────────────────

export async function linkGoalObjective(goalId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const goal = await db.query.goals.findFirst({ where: eq(goals.id, goalId) })
  assertOwnership(goal?.organizationId, user.organizationId!)
  await assertEntityInOrg('objective', objectiveId, user.organizationId!)
  await db.insert(goalObjectives).values({ goalId, objectiveId }).onConflictDoNothing()
  revalidatePath(`/goals/${goalId}`)
  revalidatePath(`/objectives/${objectiveId}`)
}

export async function unlinkGoalObjective(goalId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const goal = await db.query.goals.findFirst({ where: eq(goals.id, goalId) })
  assertOwnership(goal?.organizationId, user.organizationId!)
  await db.delete(goalObjectives).where(
    and(eq(goalObjectives.goalId, goalId), eq(goalObjectives.objectiveId, objectiveId))
  )
  revalidatePath(`/goals/${goalId}`)
  revalidatePath(`/objectives/${objectiveId}`)
}

// ── Strategy ↔ Goal (strategy_goals junction — a Strategy pursues Goals) ──────

/**
 * Link a Strategy to a Goal it pursues (ADR-0005). Many-to-many: a goal can be
 * pursued by several strategies. Both ends are org-checked.
 */
export async function linkStrategyGoal(strategyId: string, goalId: string) {
  const { user } = await requireContributor()
  const strategy = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(strategy?.organizationId, user.organizationId!)
  await assertEntityInOrg('goal', goalId, user.organizationId!)
  await db.insert(strategyGoals).values({ strategyId, goalId }).onConflictDoNothing()
  revalidatePath(`/strategies/${strategyId}`)
  revalidatePath(`/goals/${goalId}`)
}

export async function unlinkStrategyGoal(strategyId: string, goalId: string) {
  const { user } = await requireContributor()
  const strategy = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(strategy?.organizationId, user.organizationId!)
  await db.delete(strategyGoals).where(
    and(eq(strategyGoals.strategyId, strategyId), eq(strategyGoals.goalId, goalId)),
  )
  revalidatePath(`/strategies/${strategyId}`)
  revalidatePath(`/goals/${goalId}`)
}

// ── Strategy ↔ Capability / Value Stream / Initiative (operating-model + delivery)

async function strategyOwnedBy(strategyId: string, orgId: string) {
  const strategy = await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
  assertOwnership(strategy?.organizationId, orgId)
}

export async function linkStrategyCapability(strategyId: string, capabilityId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(strategyCapabilities).values({ strategyId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/strategies/${strategyId}`)
}

export async function unlinkStrategyCapability(strategyId: string, capabilityId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await db.delete(strategyCapabilities).where(
    and(eq(strategyCapabilities.strategyId, strategyId), eq(strategyCapabilities.capabilityId, capabilityId)),
  )
  revalidatePath(`/strategies/${strategyId}`)
}

export async function linkStrategyValueStream(strategyId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await assertEntityInOrg('value_stream', valueStreamId, user.organizationId!)
  await db.insert(strategyValueStreams).values({ strategyId, valueStreamId }).onConflictDoNothing()
  revalidatePath(`/strategies/${strategyId}`)
}

export async function unlinkStrategyValueStream(strategyId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await db.delete(strategyValueStreams).where(
    and(eq(strategyValueStreams.strategyId, strategyId), eq(strategyValueStreams.valueStreamId, valueStreamId)),
  )
  revalidatePath(`/strategies/${strategyId}`)
}

export async function linkStrategyInitiative(strategyId: string, initiativeId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await assertEntityInOrg('initiative', initiativeId, user.organizationId!)
  await db.insert(strategyInitiatives).values({ strategyId, initiativeId }).onConflictDoNothing()
  revalidatePath(`/strategies/${strategyId}`)
}

export async function unlinkStrategyInitiative(strategyId: string, initiativeId: string) {
  const { user } = await requireContributor()
  await strategyOwnedBy(strategyId, user.organizationId!)
  await db.delete(strategyInitiatives).where(
    and(eq(strategyInitiatives.strategyId, strategyId), eq(strategyInitiatives.initiativeId, initiativeId)),
  )
  revalidatePath(`/strategies/${strategyId}`)
}

// ── Reverse Strategy affordances (#829) ──────────────────────────────────────
//
// Same junctions, driven from the *other* entity's detail page. Each delegates
// to the strategy-first action (which org-checks both ends) and revalidates the
// source page. The argument order is (sourceId, strategyId) so a page can bind
// its own id: `linkCapabilityStrategy.bind(null, capabilityId)`.

export async function linkGoalStrategy(goalId: string, strategyId: string) {
  await linkStrategyGoal(strategyId, goalId) // revalidates both /goals and /strategies
}
export async function unlinkGoalStrategy(goalId: string, strategyId: string) {
  await unlinkStrategyGoal(strategyId, goalId)
}

export async function linkCapabilityStrategy(capabilityId: string, strategyId: string) {
  await linkStrategyCapability(strategyId, capabilityId)
  revalidatePath(`/capabilities/${capabilityId}`)
}
export async function unlinkCapabilityStrategy(capabilityId: string, strategyId: string) {
  await unlinkStrategyCapability(strategyId, capabilityId)
  revalidatePath(`/capabilities/${capabilityId}`)
}

export async function linkValueStreamStrategy(valueStreamId: string, strategyId: string) {
  await linkStrategyValueStream(strategyId, valueStreamId)
  revalidatePath(`/value-streams/${valueStreamId}`)
}
export async function unlinkValueStreamStrategy(valueStreamId: string, strategyId: string) {
  await unlinkStrategyValueStream(strategyId, valueStreamId)
  revalidatePath(`/value-streams/${valueStreamId}`)
}

export async function linkInitiativeStrategy(initiativeId: string, strategyId: string) {
  await linkStrategyInitiative(strategyId, initiativeId)
  revalidatePath(`/initiatives/${initiativeId}`)
}
export async function unlinkInitiativeStrategy(initiativeId: string, strategyId: string) {
  await unlinkStrategyInitiative(strategyId, initiativeId)
  revalidatePath(`/initiatives/${initiativeId}`)
}

// ── Objective ↔ Capability ──────────────────────────────────────────────────

export async function linkObjectiveCapability(objectiveId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const obj = await db.query.strategicObjectives.findFirst({ where: eq(strategicObjectives.id, objectiveId) })
  assertOwnership(obj?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(objectiveCapabilities).values({ objectiveId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/objectives/${objectiveId}`)
}

export async function unlinkObjectiveCapability(objectiveId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const obj = await db.query.strategicObjectives.findFirst({ where: eq(strategicObjectives.id, objectiveId) })
  assertOwnership(obj?.organizationId, user.organizationId!)
  await db.delete(objectiveCapabilities).where(
    and(eq(objectiveCapabilities.objectiveId, objectiveId), eq(objectiveCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/objectives/${objectiveId}`)
}

// ── Objective ↔ Value Stream ────────────────────────────────────────────────

export async function linkObjectiveValueStream(objectiveId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const obj = await db.query.strategicObjectives.findFirst({ where: eq(strategicObjectives.id, objectiveId) })
  assertOwnership(obj?.organizationId, user.organizationId!)
  await assertEntityInOrg('value_stream', valueStreamId, user.organizationId!)
  await db.insert(objectiveValueStreams).values({ objectiveId, valueStreamId }).onConflictDoNothing()
  revalidatePath(`/objectives/${objectiveId}`)
}

export async function unlinkObjectiveValueStream(objectiveId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const obj = await db.query.strategicObjectives.findFirst({ where: eq(strategicObjectives.id, objectiveId) })
  assertOwnership(obj?.organizationId, user.organizationId!)
  await db.delete(objectiveValueStreams).where(
    and(eq(objectiveValueStreams.objectiveId, objectiveId), eq(objectiveValueStreams.valueStreamId, valueStreamId))
  )
  revalidatePath(`/objectives/${objectiveId}`)
}

// ── Initiative ↔ Capability ─────────────────────────────────────────────────

export async function linkInitiativeCapability(initiativeId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(initiativeCapabilities).values({ initiativeId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/initiatives/${initiativeId}`)
}

export async function unlinkInitiativeCapability(initiativeId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await db.delete(initiativeCapabilities).where(
    and(eq(initiativeCapabilities.initiativeId, initiativeId), eq(initiativeCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/initiatives/${initiativeId}`)
}

// ── Initiative ↔ Objective ──────────────────────────────────────────────────

export async function linkInitiativeObjective(initiativeId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await assertEntityInOrg('objective', objectiveId, user.organizationId!)
  await db.insert(initiativeObjectives).values({ initiativeId, objectiveId }).onConflictDoNothing()
  revalidatePath(`/initiatives/${initiativeId}`)
}

export async function unlinkInitiativeObjective(initiativeId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await db.delete(initiativeObjectives).where(
    and(eq(initiativeObjectives.initiativeId, initiativeId), eq(initiativeObjectives.objectiveId, objectiveId))
  )
  revalidatePath(`/initiatives/${initiativeId}`)
}

// ── Initiative ↔ Application ────────────────────────────────────────────────

export async function linkInitiativeApplication(initiativeId: string, applicationId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await assertEntityInOrg('application', applicationId, user.organizationId!)
  await db.insert(initiativeApplications).values({ initiativeId, applicationId }).onConflictDoNothing()
  revalidatePath(`/initiatives/${initiativeId}`)
}

export async function unlinkInitiativeApplication(initiativeId: string, applicationId: string) {
  const { user } = await requireContributor()
  const init = await db.query.initiatives.findFirst({ where: eq(initiatives.id, initiativeId) })
  assertOwnership(init?.organizationId, user.organizationId!)
  await db.delete(initiativeApplications).where(
    and(eq(initiativeApplications.initiativeId, initiativeId), eq(initiativeApplications.applicationId, applicationId))
  )
  revalidatePath(`/initiatives/${initiativeId}`)
}

// ── ADR ↔ Capability ────────────────────────────────────────────────────────

export async function linkAdrCapability(adrId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(adrCapabilities).values({ adrId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/adrs/${adrId}`)
}

export async function unlinkAdrCapability(adrId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await db.delete(adrCapabilities).where(
    and(eq(adrCapabilities.adrId, adrId), eq(adrCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/adrs/${adrId}`)
}

// ── ADR ↔ Application ───────────────────────────────────────────────────────

export async function linkAdrApplication(adrId: string, applicationId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await assertEntityInOrg('application', applicationId, user.organizationId!)
  await db.insert(adrApplications).values({ adrId, applicationId }).onConflictDoNothing()
  revalidatePath(`/adrs/${adrId}`)
}

export async function unlinkAdrApplication(adrId: string, applicationId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await db.delete(adrApplications).where(
    and(eq(adrApplications.adrId, adrId), eq(adrApplications.applicationId, applicationId))
  )
  revalidatePath(`/adrs/${adrId}`)
}

// ── ADR ↔ Initiative ────────────────────────────────────────────────────────

export async function linkAdrInitiative(adrId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await assertEntityInOrg('initiative', initiativeId, user.organizationId!)
  await db.insert(adrInitiatives).values({ adrId, initiativeId }).onConflictDoNothing()
  revalidatePath(`/adrs/${adrId}`)
}

export async function unlinkAdrInitiative(adrId: string, initiativeId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await db.delete(adrInitiatives).where(
    and(eq(adrInitiatives.adrId, adrId), eq(adrInitiatives.initiativeId, initiativeId))
  )
  revalidatePath(`/adrs/${adrId}`)
}

// ── ADR ↔ Objective ─────────────────────────────────────────────────────────

export async function linkAdrObjective(adrId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await assertEntityInOrg('objective', objectiveId, user.organizationId!)
  await db.insert(adrObjectives).values({ adrId, objectiveId }).onConflictDoNothing()
  revalidatePath(`/adrs/${adrId}`)
}

export async function unlinkAdrObjective(adrId: string, objectiveId: string) {
  const { user } = await requireContributor()
  const adr = await db.query.adrs.findFirst({ where: eq(adrs.id, adrId) })
  assertOwnership(adr?.organizationId, user.organizationId!)
  await db.delete(adrObjectives).where(
    and(eq(adrObjectives.adrId, adrId), eq(adrObjectives.objectiveId, objectiveId))
  )
  revalidatePath(`/adrs/${adrId}`)
}

// ── Principle ↔ Capability ──────────────────────────────────────────────────

export async function linkPrincipleCapability(principleId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const p = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(principleCapabilities).values({ principleId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/principles/${principleId}`)
}

export async function unlinkPrincipleCapability(principleId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const p = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await db.delete(principleCapabilities).where(
    and(eq(principleCapabilities.principleId, principleId), eq(principleCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/principles/${principleId}`)
}

// ── Principle ↔ ADR ─────────────────────────────────────────────────────────

export async function linkPrincipleAdr(principleId: string, adrId: string) {
  const { user } = await requireContributor()
  const p = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await assertEntityInOrg('adr', adrId, user.organizationId!)
  await db.insert(principleAdrs).values({ principleId, adrId }).onConflictDoNothing()
  revalidatePath(`/principles/${principleId}`)
}

export async function unlinkPrincipleAdr(principleId: string, adrId: string) {
  const { user } = await requireContributor()
  const p = await db.query.principles.findFirst({ where: eq(principles.id, principleId) })
  assertOwnership(p?.organizationId, user.organizationId!)
  await db.delete(principleAdrs).where(
    and(eq(principleAdrs.principleId, principleId), eq(principleAdrs.adrId, adrId))
  )
  revalidatePath(`/principles/${principleId}`)
}

// ── Service ↔ Capability ────────────────────────────────────────────────────

export async function linkServiceCapability(serviceId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await assertEntityInOrg('capability', capabilityId, user.organizationId!)
  await db.insert(serviceCapabilities).values({ serviceId, capabilityId }).onConflictDoNothing()
  revalidatePath(`/services/${serviceId}`)
}

export async function unlinkServiceCapability(serviceId: string, capabilityId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await db.delete(serviceCapabilities).where(
    and(eq(serviceCapabilities.serviceId, serviceId), eq(serviceCapabilities.capabilityId, capabilityId))
  )
  revalidatePath(`/services/${serviceId}`)
}

// ── Service ↔ Persona ───────────────────────────────────────────────────────

export async function linkServicePersona(serviceId: string, personaId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await assertEntityInOrg('persona', personaId, user.organizationId!)
  await db.insert(servicePersonas).values({ serviceId, personaId }).onConflictDoNothing()
  revalidatePath(`/services/${serviceId}`)
}

export async function unlinkServicePersona(serviceId: string, personaId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await db.delete(servicePersonas).where(
    and(eq(servicePersonas.serviceId, serviceId), eq(servicePersonas.personaId, personaId))
  )
  revalidatePath(`/services/${serviceId}`)
}

// ── Service ↔ Value Stream ──────────────────────────────────────────────────

export async function linkServiceValueStream(serviceId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await assertEntityInOrg('value_stream', valueStreamId, user.organizationId!)
  await db.insert(serviceValueStreams).values({ serviceId, valueStreamId }).onConflictDoNothing()
  revalidatePath(`/services/${serviceId}`)
}

export async function unlinkServiceValueStream(serviceId: string, valueStreamId: string) {
  const { user } = await requireContributor()
  const svc = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
  assertOwnership(svc?.organizationId, user.organizationId!)
  await db.delete(serviceValueStreams).where(
    and(eq(serviceValueStreams.serviceId, serviceId), eq(serviceValueStreams.valueStreamId, valueStreamId))
  )
  revalidatePath(`/services/${serviceId}`)
}
