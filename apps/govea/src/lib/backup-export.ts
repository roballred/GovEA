/**
 * Operational backup / export builder (#529).
 *
 * Three export shapes, sharing one collector so excludes (passwords, SMTP
 * credentials, audit log) are defined in exactly one place:
 *
 *   - recipe  — configuration only (org settings + taxonomy + custom field
 *               schemas + module enablement). No content rows. The "fresh
 *               install with the same shape" shape.
 *   - content — content rows only (personas, capabilities, applications,
 *               value streams, objectives, initiatives, ADRs, principles,
 *               glossary, services, debt items, plus their junction tables).
 *               No org settings or taxonomy definitions.
 *   - archive — both, in one bundle. The "restore my whole org elsewhere"
 *               shape.
 *
 * Distinct from #86 (data portability for external consumption). #86 is for
 * Power BI / Excel hand-offs; this is for "back up the system before an
 * upgrade and restore it after." The two are complementary surfaces; this
 * code is the operational half.
 *
 * Explicit excludes (per the ac-backup-export capability rules):
 *   - User passwords (`users.passwordHash`)
 *   - SMTP credentials (anything from `org-email-config`)
 *   - Audit log (immutable at the DB layer per #417; backed up separately)
 *   - Notifications inbox (transient operational state)
 *   - Sessions, break-glass sessions, act-as sessions (transient auth state)
 *   - Completeness snapshots (recomputable derived state)
 *
 * Returns a plain object so callers can JSON.stringify with their own
 * indentation preference.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
// Most junction tables are referenced only via `db.query.<key>.findMany({})`
// and never directly — so they're intentionally absent from this import
// block. Only tables we filter or eq-compare against go in.
import {
  organizations,
  personas, capabilities, applications, services,
  valueStreams,
  strategicObjectives,
  goals,
  strategies,
  initiatives,
  adrs,
  principles,
  glossaryTerms,
  taxonomyTerms, entityTaxonomyDefinitions, entityTaxonomyValues,
  customFieldSchemas,
  architectureDebtItems,
} from '@/db/schema'

export type BackupShape = 'recipe' | 'content' | 'archive'

export const BACKUP_FORMAT_VERSION = '1.0' as const

/**
 * What the consumer is told about the export at the envelope level.
 * Implementation-status: not consumed by the import path yet — import
 * arrives in PR2 of #529 with its own validator.
 */
interface BackupEnvelope {
  format: typeof BACKUP_FORMAT_VERSION
  shape: BackupShape
  exportedAt: string
  orgId: string
  orgName: string
  orgSlug: string
  /**
   * Excludes are listed verbatim in the envelope so anyone inspecting the
   * file knows what is intentionally absent — not "missing because of a
   * bug."
   */
  excludes: readonly string[]
}

const STANDARD_EXCLUDES = [
  'users.passwordHash',
  'email-config (SMTP credentials)',
  'audit_log (separate append-only backup)',
  'notifications',
  'sessions, break-glass-sessions, act-as-sessions',
  'completeness-snapshots (recomputable)',
] as const

// ── Configuration (recipe) collector ────────────────────────────────────────

/** Configuration export — no content rows. */
async function collectRecipe(orgId: string) {
  const [
    org,
    taxTermsRows,
    entityTaxDefs,
    fieldSchemas,
  ] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    db.query.taxonomyTerms.findMany({ where: eq(taxonomyTerms.organizationId, orgId) }),
    db.query.entityTaxonomyDefinitions.findMany({ where: eq(entityTaxonomyDefinitions.organizationId, orgId) }),
    db.query.customFieldSchemas.findMany({ where: eq(customFieldSchemas.organizationId, orgId) }),
  ])

  if (!org) throw new Error('Organization not found')

  // Strip volatile / sensitive bits from the org row itself before
  // including it in the export.
  const orgSettings = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    theme: org.theme,
    enabledModules: org.enabledModules,
    confidenceSettings: org.confidenceSettings,
    completenessSettings: org.completenessSettings,
    // securitySettings includes session lifetimes, password policy, etc. —
    // configuration, not credentials, so it IS included in the recipe.
    securitySettings: org.securitySettings,
    supportTier: org.supportTier,
  }

  return {
    organization: orgSettings,
    taxonomy: {
      terms: taxTermsRows,
      entityDefinitions: entityTaxDefs,
    },
    customFields: {
      schemas: fieldSchemas,
    },
  }
}

// ── Content collector ──────────────────────────────────────────────────────

/** Content export — every persona-, capability-, app-, etc-shaped row. */
async function collectContent(orgId: string) {
  const orgFilter = eq(personas.organizationId, orgId)
  // Each collection is a flat array of rows. Junctions are collected
  // separately under `relationships` so a reader can replay them after the
  // primary rows are restored.
  const [
    personaRows, capabilityRows, applicationRows, serviceRows,
    valueStreamRows, valueStreamStageRows, valueStreamStageCapRows, valueStreamPersonaRows, valueStreamCapRows,
    objectiveRows, objectiveCapRows, objectiveVsRows,
    goalRows, goalObjectiveRows,
    strategyRows, strategyGoalRows, strategyCapRows, strategyVsRows, strategyIniRows,
    initiativeRows, initiativeCapRows, initiativeAppRows, initiativeObjRows,
    adrRows, adrCapRows, adrAppRows, adrIniRows, adrObjRows,
    principleRows, principleCapRows, principleAdrRows,
    glossaryRows, glossarySourceRows,
    serviceCapRows, servicePersonaRows, serviceVsRows,
    capabilityPersonaRows, applicationCapabilityRows, capabilityRelationshipRows,
    entityTaxValueRows,
    debtRows, debtCapRows, debtAppRows, debtIniRows, debtAdrRows,
  ] = await Promise.all([
    db.query.personas.findMany({ where: orgFilter }),
    db.query.capabilities.findMany({ where: eq(capabilities.organizationId, orgId) }),
    db.query.applications.findMany({ where: eq(applications.organizationId, orgId) }),
    db.query.services.findMany({ where: eq(services.organizationId, orgId) }),
    db.query.valueStreams.findMany({ where: eq(valueStreams.organizationId, orgId) }),
    db.query.valueStreamStages.findMany({}),
    db.query.valueStreamStageCapabilities.findMany({}),
    db.query.valueStreamPersonas.findMany({}),
    db.query.valueStreamCapabilities.findMany({}),
    db.query.strategicObjectives.findMany({ where: eq(strategicObjectives.organizationId, orgId) }),
    db.query.objectiveCapabilities.findMany({}),
    db.query.objectiveValueStreams.findMany({}),
    db.query.goals.findMany({ where: eq(goals.organizationId, orgId) }),
    db.query.goalObjectives.findMany({}),
    db.query.strategies.findMany({ where: eq(strategies.organizationId, orgId) }),
    db.query.strategyGoals.findMany({}),
    db.query.strategyCapabilities.findMany({}),
    db.query.strategyValueStreams.findMany({}),
    db.query.strategyInitiatives.findMany({}),
    db.query.initiatives.findMany({ where: eq(initiatives.organizationId, orgId) }),
    db.query.initiativeCapabilities.findMany({}),
    db.query.initiativeApplications.findMany({}),
    db.query.initiativeObjectives.findMany({}),
    db.query.adrs.findMany({ where: eq(adrs.organizationId, orgId) }),
    db.query.adrCapabilities.findMany({}),
    db.query.adrApplications.findMany({}),
    db.query.adrInitiatives.findMany({}),
    db.query.adrObjectives.findMany({}),
    db.query.principles.findMany({ where: eq(principles.organizationId, orgId) }),
    db.query.principleCapabilities.findMany({}),
    db.query.principleAdrs.findMany({}),
    db.query.glossaryTerms.findMany({ where: eq(glossaryTerms.organizationId, orgId) }),
    db.query.glossaryTermSources.findMany({}),
    db.query.serviceCapabilities.findMany({}),
    db.query.servicePersonas.findMany({}),
    db.query.serviceValueStreams.findMany({}),
    db.query.capabilityPersonas.findMany({}),
    db.query.applicationCapabilities.findMany({}),
    db.query.capabilityRelationships.findMany({}),
    db.query.entityTaxonomyValues.findMany({ where: eq(entityTaxonomyValues.organizationId, orgId) }),
    db.query.architectureDebtItems.findMany({ where: eq(architectureDebtItems.organizationId, orgId) }),
    db.query.debtCapabilities.findMany({}),
    db.query.debtApplications.findMany({}),
    db.query.debtInitiatives.findMany({}),
    db.query.debtAdrs.findMany({}),
  ])

  // Filter the unscoped junction tables to rows whose parent entity belongs
  // to this org. (Drizzle's relational findMany on junctions doesn't
  // automatically constrain by parent org; we do that here so the export
  // file only contains org-relevant links.)
  // Cast each row array down to the minimum shape we need for the id-set
  // building below — drizzle's relational findMany returns untyped rows for
  // tables that don't have a relations entry. The .id field is part of every
  // row in our schema by construction.
  const personaIds = new Set((personaRows as Array<{ id: string }>).map(r => r.id))
  const capIds = new Set((capabilityRows as Array<{ id: string }>).map(r => r.id))
  const appIds = new Set((applicationRows as Array<{ id: string }>).map(r => r.id))
  const svcIds = new Set((serviceRows as Array<{ id: string }>).map(r => r.id))
  const vsIds = new Set((valueStreamRows as Array<{ id: string }>).map(r => r.id))
  const objIds = new Set((objectiveRows as Array<{ id: string }>).map(r => r.id))
  const goalIds = new Set((goalRows as Array<{ id: string }>).map(r => r.id))
  const stratIds = new Set((strategyRows as Array<{ id: string }>).map(r => r.id))
  const iniIds = new Set((initiativeRows as Array<{ id: string }>).map(r => r.id))
  const adrIds = new Set((adrRows as Array<{ id: string }>).map(r => r.id))
  const principleIds = new Set((principleRows as Array<{ id: string }>).map(r => r.id))
  const glossaryIds = new Set((glossaryRows as Array<{ id: string }>).map(r => r.id))
  const debtIds = new Set((debtRows as Array<{ id: string }>).map(r => r.id))

  return {
    personas: personaRows,
    capabilities: capabilityRows,
    applications: applicationRows,
    services: serviceRows,
    valueStreams: valueStreamRows,
    objectives: objectiveRows,
    goals: goalRows,
    strategies: strategyRows,
    initiatives: initiativeRows,
    adrs: adrRows,
    principles: principleRows,
    glossary: glossaryRows,
    architectureDebt: debtRows,
    relationships: {
      capabilityPersonas: (capabilityPersonaRows as Array<{ capabilityId: string; personaId: string }>).filter(r => capIds.has(r.capabilityId) && personaIds.has(r.personaId)),
      applicationCapabilities: (applicationCapabilityRows as Array<{ applicationId: string; capabilityId: string }>).filter(r => appIds.has(r.applicationId) && capIds.has(r.capabilityId)),
      capabilityRelationships: (capabilityRelationshipRows as Array<{ parentId: string; childId: string }>).filter(r => capIds.has(r.parentId) && capIds.has(r.childId)),
      valueStreamStages: (valueStreamStageRows as Array<{ valueStreamId: string }>).filter(r => vsIds.has(r.valueStreamId)),
      valueStreamStageCapabilities: (valueStreamStageCapRows as Array<{ capabilityId: string }>).filter(r => capIds.has(r.capabilityId)),
      valueStreamPersonas: (valueStreamPersonaRows as Array<{ valueStreamId: string; personaId: string }>).filter(r => vsIds.has(r.valueStreamId) && personaIds.has(r.personaId)),
      valueStreamCapabilities: (valueStreamCapRows as Array<{ valueStreamId: string; capabilityId: string }>).filter(r => vsIds.has(r.valueStreamId) && capIds.has(r.capabilityId)),
      objectiveCapabilities: (objectiveCapRows as Array<{ objectiveId: string; capabilityId: string }>).filter(r => objIds.has(r.objectiveId) && capIds.has(r.capabilityId)),
      objectiveValueStreams: (objectiveVsRows as Array<{ objectiveId: string; valueStreamId: string }>).filter(r => objIds.has(r.objectiveId) && vsIds.has(r.valueStreamId)),
      goalObjectives: (goalObjectiveRows as Array<{ goalId: string; objectiveId: string }>).filter(r => goalIds.has(r.goalId) && objIds.has(r.objectiveId)),
      strategyGoals: (strategyGoalRows as Array<{ strategyId: string; goalId: string }>).filter(r => stratIds.has(r.strategyId) && goalIds.has(r.goalId)),
      strategyCapabilities: (strategyCapRows as Array<{ strategyId: string; capabilityId: string }>).filter(r => stratIds.has(r.strategyId) && capIds.has(r.capabilityId)),
      strategyValueStreams: (strategyVsRows as Array<{ strategyId: string; valueStreamId: string }>).filter(r => stratIds.has(r.strategyId) && vsIds.has(r.valueStreamId)),
      strategyInitiatives: (strategyIniRows as Array<{ strategyId: string; initiativeId: string }>).filter(r => stratIds.has(r.strategyId) && iniIds.has(r.initiativeId)),
      initiativeCapabilities: (initiativeCapRows as Array<{ initiativeId: string; capabilityId: string }>).filter(r => iniIds.has(r.initiativeId) && capIds.has(r.capabilityId)),
      initiativeApplications: (initiativeAppRows as Array<{ initiativeId: string; applicationId: string }>).filter(r => iniIds.has(r.initiativeId) && appIds.has(r.applicationId)),
      initiativeObjectives: (initiativeObjRows as Array<{ initiativeId: string; objectiveId: string }>).filter(r => iniIds.has(r.initiativeId) && objIds.has(r.objectiveId)),
      adrCapabilities: (adrCapRows as Array<{ adrId: string; capabilityId: string }>).filter(r => adrIds.has(r.adrId) && capIds.has(r.capabilityId)),
      adrApplications: (adrAppRows as Array<{ adrId: string; applicationId: string }>).filter(r => adrIds.has(r.adrId) && appIds.has(r.applicationId)),
      adrInitiatives: (adrIniRows as Array<{ adrId: string; initiativeId: string }>).filter(r => adrIds.has(r.adrId) && iniIds.has(r.initiativeId)),
      adrObjectives: (adrObjRows as Array<{ adrId: string; objectiveId: string }>).filter(r => adrIds.has(r.adrId) && objIds.has(r.objectiveId)),
      principleCapabilities: (principleCapRows as Array<{ principleId: string; capabilityId: string }>).filter(r => principleIds.has(r.principleId) && capIds.has(r.capabilityId)),
      principleAdrs: (principleAdrRows as Array<{ principleId: string; adrId: string }>).filter(r => principleIds.has(r.principleId) && adrIds.has(r.adrId)),
      glossaryTermSources: (glossarySourceRows as Array<{ termId: string }>).filter(r => glossaryIds.has(r.termId)),
      // Service + debt junctions: drizzle's relational findMany without an
      // explicit relations entry returns untyped rows. Annotate the filter
      // callback parameter so strict-mode TS can infer; the shape matches
      // the table's columns by construction.
      serviceCapabilities: (serviceCapRows as Array<{ serviceId: string; capabilityId: string }>).filter(r => svcIds.has(r.serviceId) && capIds.has(r.capabilityId)),
      servicePersonas: (servicePersonaRows as Array<{ serviceId: string; personaId: string }>).filter(r => svcIds.has(r.serviceId) && personaIds.has(r.personaId)),
      serviceValueStreams: (serviceVsRows as Array<{ serviceId: string; valueStreamId: string }>).filter(r => svcIds.has(r.serviceId) && vsIds.has(r.valueStreamId)),
      entityTaxonomyValues: entityTaxValueRows,
      debtCapabilities: (debtCapRows as Array<{ debtItemId: string; capabilityId: string }>).filter(r => debtIds.has(r.debtItemId) && capIds.has(r.capabilityId)),
      debtApplications: (debtAppRows as Array<{ debtItemId: string; applicationId: string }>).filter(r => debtIds.has(r.debtItemId) && appIds.has(r.applicationId)),
      debtInitiatives: (debtIniRows as Array<{ debtItemId: string; initiativeId: string }>).filter(r => debtIds.has(r.debtItemId) && iniIds.has(r.initiativeId)),
      debtAdrs: (debtAdrRows as Array<{ debtItemId: string; adrId: string }>).filter(r => debtIds.has(r.debtItemId) && adrIds.has(r.adrId)),
    },
  }
}

// ── Top-level builders ─────────────────────────────────────────────────────

interface BuiltExport {
  filename: string
  body: string
  bytes: number
}

function envelope(orgId: string, orgName: string, orgSlug: string, shape: BackupShape): BackupEnvelope {
  return {
    format: BACKUP_FORMAT_VERSION,
    shape,
    exportedAt: new Date().toISOString(),
    orgId,
    orgName,
    orgSlug,
    excludes: STANDARD_EXCLUDES,
  }
}

function makeFilename(orgSlug: string, shape: BackupShape, exportedAt: string): string {
  // ISO-8601 with `:` replaced by `-` so the filename is safe across OSes
  // without losing the timestamp at file-system level.
  const safeStamp = exportedAt.replace(/[:.]/g, '-')
  return `govea-${orgSlug}-${shape}-${safeStamp}.json`
}

/** Builds a recipe-only export (config + taxonomy + custom-field schemas). */
export async function buildRecipeExport(orgId: string): Promise<BuiltExport> {
  const recipe = await collectRecipe(orgId)
  const env = envelope(orgId, recipe.organization.name, recipe.organization.slug, 'recipe')
  const body = JSON.stringify({ envelope: env, recipe }, null, 2)
  return {
    filename: makeFilename(recipe.organization.slug, 'recipe', env.exportedAt),
    body,
    bytes: Buffer.byteLength(body, 'utf8'),
  }
}

/** Builds a content-only export (rows + relationships; no config). */
export async function buildContentExport(orgId: string): Promise<BuiltExport> {
  const [org, content] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    collectContent(orgId),
  ])
  if (!org) throw new Error('Organization not found')
  const env = envelope(orgId, org.name, org.slug, 'content')
  const body = JSON.stringify({ envelope: env, content }, null, 2)
  return {
    filename: makeFilename(org.slug, 'content', env.exportedAt),
    body,
    bytes: Buffer.byteLength(body, 'utf8'),
  }
}

/** Builds a combined archive (recipe + content in one envelope). */
export async function buildArchiveExport(orgId: string): Promise<BuiltExport> {
  const [recipe, content] = await Promise.all([
    collectRecipe(orgId),
    collectContent(orgId),
  ])
  const env = envelope(orgId, recipe.organization.name, recipe.organization.slug, 'archive')
  const body = JSON.stringify({ envelope: env, recipe, content }, null, 2)
  return {
    filename: makeFilename(recipe.organization.slug, 'archive', env.exportedAt),
    body,
    bytes: Buffer.byteLength(body, 'utf8'),
  }
}

/**
 * Updates `organizations.lastExportAt` / `lastExportBytes` after a successful
 * export. Called from the route handlers; kept here so the export-time
 * bookkeeping lives next to the exporters themselves.
 */
export async function recordExport(orgId: string, bytes: number): Promise<void> {
  await db
    .update(organizations)
    .set({ lastExportAt: new Date(), lastExportBytes: bytes })
    .where(eq(organizations.id, orgId))
}

