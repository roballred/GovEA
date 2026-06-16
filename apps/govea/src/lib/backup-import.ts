/**
 * Operational backup IMPORT (#529 PR2).
 *
 * Takes an archive JSON produced by `buildArchiveExport` and replays it into
 * the destination organization, replacing the org&apos;s current content and
 * configuration. Companion to `lib/backup-export.ts`.
 *
 * Hard rules from the ac-backup-export capability:
 *   - Import is a destructive operation. The admin must confirm via the UI
 *     (typed token); this lib trusts the caller has done that.
 *   - Excluded entities (users, SMTP credentials, audit log, notifications,
 *     sessions, completeness snapshots) are NEVER touched by import. Users
 *     stay signed in. Audit history is preserved (it&apos;s append-only at the
 *     DB layer per #417).
 *
 * Design choices recorded for review:
 *   - **Archive shape only.** Recipe-only and content-only imports would
 *     each need their own partial-wipe logic; out of scope for PR2.
 *   - **UUIDs preserved.** Junctions reference parent rows by id; preserving
 *     the export&apos;s ids means we can replay junctions verbatim without
 *     remapping. The destination is wiped first, so collisions can&apos;t
 *     happen.
 *   - **createdBy / updatedBy forced to the importing admin.** Original
 *     createdBy UUIDs from the export may not exist in the destination
 *     user table; rather than fail or set null, we credit the importing
 *     admin so the audit trail is honest about who actually wrote the row.
 *   - **Cross-org links cleared.** They reference cross-tenant ids that
 *     won&apos;t survive the wipe. Federation has to be re-established after
 *     import — a documented consequence of restore, not a bug.
 *   - **Same-org restore only in PR2.** UUIDs are table-unique (not
 *     scoped per org), so importing into a different org would collide
 *     on primary keys against the source org&apos;s rows. Cross-org
 *     migration with UUID remapping is a future PR.
 */

import { eq, or } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  organizations,
  personas, capabilities, applications, services,
  valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas, valueStreamCapabilities,
  strategicObjectives, objectiveCapabilities, objectiveValueStreams,
  goals, goalObjectives,
  strategies, strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives,
  initiatives, initiativeCapabilities, initiativeApplications, initiativeObjectives,
  adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives,
  principles, principleCapabilities, principleAdrs,
  glossaryTerms, glossaryTermSources,
  serviceCapabilities, servicePersonas, serviceValueStreams,
  capabilityPersonas, applicationCapabilities, capabilityRelationships,
  taxonomyTerms, entityTaxonomyDefinitions, entityTaxonomyValues,
  customFieldSchemas,
  architectureDebtItems, debtCapabilities, debtApplications, debtInitiatives, debtAdrs,
  crossOrgLinks,
} from '@/db/schema'
import { writeAuditLog } from '@/lib/audit'
import { BACKUP_FORMAT_VERSION } from '@/lib/backup-export'

export interface ImportResult {
  inserted: Record<string, number>
  sourceOrgId: string
  sourceOrgSlug: string
}

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupImportError'
  }
}

// ── Envelope + payload validation ─────────────────────────────────────────

interface ArchiveBundle {
  envelope: {
    format: string
    shape: string
    exportedAt: string
    orgId: string
    orgName: string
    orgSlug: string
    excludes: string[]
  }
  recipe: {
    organization: Record<string, unknown>
    taxonomy: { terms: unknown[]; entityDefinitions: unknown[] }
    customFields: { schemas: unknown[] }
  }
  content: {
    personas: unknown[]
    capabilities: unknown[]
    applications: unknown[]
    services: unknown[]
    valueStreams: unknown[]
    objectives: unknown[]
    goals: unknown[]
    strategies: unknown[]
    initiatives: unknown[]
    adrs: unknown[]
    principles: unknown[]
    glossary: unknown[]
    architectureDebt: unknown[]
    relationships: Record<string, unknown[]>
  }
}

function parseArchive(jsonBody: string): ArchiveBundle {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonBody)
  } catch (e) {
    throw new BackupImportError(`Not valid JSON: ${(e as Error).message}`)
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BackupImportError('Archive root must be an object')
  }
  const obj = parsed as Record<string, unknown>
  const env = obj.envelope as ArchiveBundle['envelope'] | undefined
  if (!env || typeof env !== 'object') {
    throw new BackupImportError('Missing envelope')
  }
  if (env.format !== BACKUP_FORMAT_VERSION) {
    throw new BackupImportError(
      `Unsupported format version: ${env.format} (this build accepts ${BACKUP_FORMAT_VERSION})`,
    )
  }
  if (env.shape !== 'archive') {
    throw new BackupImportError(
      `Only 'archive' imports are supported in this release (got '${env.shape}')`,
    )
  }
  if (!obj.recipe || !obj.content) {
    throw new BackupImportError('Archive must contain both `recipe` and `content` keys')
  }
  return obj as unknown as ArchiveBundle
}

// ── Insert helpers ────────────────────────────────────────────────────────
//
// Each helper takes raw export rows (with their original ids), normalises
// them for insert by overriding createdBy/updatedBy and rewriting
// organizationId to the destination, then inserts. Returns the count.

interface InsertCtx {
  destOrgId: string
  userId: string
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
}

function normalize<T extends Record<string, unknown>>(
  row: T,
  ctx: InsertCtx,
  opts?: { overrideOrgId?: boolean },
): T {
  const out: Record<string, unknown> = { ...row }
  if (opts?.overrideOrgId !== false) out.organizationId = ctx.destOrgId
  if ('createdBy' in out) out.createdBy = ctx.userId
  if ('updatedBy' in out) out.updatedBy = ctx.userId
  // Drizzle expects Date objects, not strings; coerce known timestamp fields.
  for (const key of ['createdAt', 'updatedAt', 'lastReviewedAt', 'lastExportAt']) {
    const v = out[key]
    if (typeof v === 'string') out[key] = new Date(v)
  }
  return out as T
}

// ── Replayer ──────────────────────────────────────────────────────────────

/**
 * Wipe destination org content + recipe; replay archive into the same org.
 * Single transaction. Throws BackupImportError on validation failure or
 * raw error on FK / constraint failure.
 *
 * Returns counts of inserted rows per entity, for the audit + UI summary.
 */
export async function importArchive(
  destOrgId: string,
  importingUserId: string,
  jsonBody: string,
): Promise<ImportResult> {
  const bundle = parseArchive(jsonBody)
  const { envelope, recipe, content } = bundle

  // PR2 constraint: same-org only. Cross-org restore would collide on
  // primary keys against the source org's rows. Future PR can regenerate
  // UUIDs + rewrite junction references for the migration case.
  if (envelope.orgId !== destOrgId) {
    throw new BackupImportError(
      `Archive is for org ${envelope.orgSlug} (${envelope.orgId}); ` +
      `import target is a different organization. Cross-org restore is ` +
      `not yet supported in this release.`,
    )
  }

  const inserted: Record<string, number> = {}

  await db.transaction(async (tx) => {
    const ctx: InsertCtx = { destOrgId, userId: importingUserId, tx }

    // 1. Wipe destination org's cross-org links (both directions).
    await tx.delete(crossOrgLinks).where(
      or(eq(crossOrgLinks.sourceOrgId, destOrgId), eq(crossOrgLinks.targetOrgId, destOrgId)),
    )

    // 2. Wipe content top-level rows (cascades junctions, value-stream stages
    //    + stage caps + personas, glossary sources, debt junctions, etc).
    //    Per-table eq() — drizzle column identity is per-table, no shared filter.
    await tx.delete(architectureDebtItems).where(eq(architectureDebtItems.organizationId, destOrgId))
    await tx.delete(principles).where(eq(principles.organizationId, destOrgId))
    await tx.delete(adrs).where(eq(adrs.organizationId, destOrgId))
    await tx.delete(initiatives).where(eq(initiatives.organizationId, destOrgId))
    // Strategies before goals: strategy_goals cascades from either side, but
    // deleting strategies first keeps the wipe order parent-before-children.
    await tx.delete(strategies).where(eq(strategies.organizationId, destOrgId))
    await tx.delete(goals).where(eq(goals.organizationId, destOrgId))
    await tx.delete(strategicObjectives).where(eq(strategicObjectives.organizationId, destOrgId))
    await tx.delete(valueStreams).where(eq(valueStreams.organizationId, destOrgId))
    await tx.delete(services).where(eq(services.organizationId, destOrgId))
    await tx.delete(glossaryTerms).where(eq(glossaryTerms.organizationId, destOrgId))
    await tx.delete(applications).where(eq(applications.organizationId, destOrgId))
    await tx.delete(capabilities).where(eq(capabilities.organizationId, destOrgId))
    await tx.delete(personas).where(eq(personas.organizationId, destOrgId))

    // 3. Wipe recipe rows.
    await tx.delete(entityTaxonomyValues).where(eq(entityTaxonomyValues.organizationId, destOrgId))
    await tx.delete(entityTaxonomyDefinitions).where(eq(entityTaxonomyDefinitions.organizationId, destOrgId))
    await tx.delete(taxonomyTerms).where(eq(taxonomyTerms.organizationId, destOrgId))
    await tx.delete(customFieldSchemas).where(eq(customFieldSchemas.organizationId, destOrgId))

    // 4. Update org row with recipe.organization settings (preserves
    //    columns we don't restore: name/slug, FKs, suspendedAt, etc).
    const orgSettings = recipe.organization as Record<string, unknown>
    await tx.update(organizations).set({
      theme: orgSettings.theme as string ?? 'govea',
      enabledModules: orgSettings.enabledModules as Record<string, boolean> ?? {},
      // jsonb columns serialize/deserialize as plain objects.
      confidenceSettings: orgSettings.confidenceSettings as never ?? null,
      completenessSettings: orgSettings.completenessSettings as never ?? null,
      securitySettings: orgSettings.securitySettings as never ?? null,
      updatedAt: new Date(),
    }).where(eq(organizations.id, destOrgId))

    // 5. Recipe inserts (config first so taxonomy is available for content).
    if (recipe.customFields.schemas.length) {
      await tx.insert(customFieldSchemas).values(
        (recipe.customFields.schemas as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.customFieldSchemas = recipe.customFields.schemas.length
    }
    if (recipe.taxonomy.terms.length) {
      await tx.insert(taxonomyTerms).values(
        (recipe.taxonomy.terms as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.taxonomyTerms = recipe.taxonomy.terms.length
    }
    if (recipe.taxonomy.entityDefinitions.length) {
      await tx.insert(entityTaxonomyDefinitions).values(
        (recipe.taxonomy.entityDefinitions as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.entityTaxonomyDefinitions = recipe.taxonomy.entityDefinitions.length
    }

    // 6. Content parents (top-level rows).
    if (content.personas.length) {
      await tx.insert(personas).values(
        (content.personas as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.personas = content.personas.length
    }
    if (content.capabilities.length) {
      await tx.insert(capabilities).values(
        (content.capabilities as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.capabilities = content.capabilities.length
    }
    if (content.applications.length) {
      await tx.insert(applications).values(
        (content.applications as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.applications = content.applications.length
    }
    if (content.services.length) {
      await tx.insert(services).values(
        (content.services as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.services = content.services.length
    }
    if (content.valueStreams.length) {
      await tx.insert(valueStreams).values(
        (content.valueStreams as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.valueStreams = content.valueStreams.length
    }
    if (content.objectives.length) {
      await tx.insert(strategicObjectives).values(
        (content.objectives as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.objectives = content.objectives.length
    }
    if (content.goals.length) {
      await tx.insert(goals).values(
        (content.goals as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.goals = content.goals.length
    }
    if (content.strategies.length) {
      await tx.insert(strategies).values(
        (content.strategies as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.strategies = content.strategies.length
    }
    if (content.initiatives.length) {
      await tx.insert(initiatives).values(
        (content.initiatives as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.initiatives = content.initiatives.length
    }

    // ADRs: two-phase. Insert with supersededBy=null first, then update each
    // to its actual supersededBy id (so the FK references an already-inserted
    // row regardless of input order).
    if (content.adrs.length) {
      const adrRows = (content.adrs as Record<string, unknown>[]).map(r => normalize(r, ctx))
      const adrSupersedes = adrRows
        .map(r => ({ id: r.id as string, supersededBy: r.supersededBy as string | null | undefined }))
        .filter(r => r.supersededBy)
      // Insert with supersededBy nulled out.
      const firstPass = adrRows.map(r => ({ ...r, supersededBy: null }))
      await tx.insert(adrs).values(firstPass as never)
      // Resolve supersession chain.
      for (const { id, supersededBy } of adrSupersedes) {
        await tx.update(adrs).set({ supersededBy }).where(eq(adrs.id, id))
      }
      inserted.adrs = adrRows.length
    }

    if (content.principles.length) {
      await tx.insert(principles).values(
        (content.principles as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.principles = content.principles.length
    }
    if (content.glossary.length) {
      await tx.insert(glossaryTerms).values(
        (content.glossary as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.glossary = content.glossary.length
    }
    if (content.architectureDebt.length) {
      await tx.insert(architectureDebtItems).values(
        (content.architectureDebt as Record<string, unknown>[]).map(r => normalize(r, ctx)) as never,
      )
      inserted.architectureDebt = content.architectureDebt.length
    }

    // 7. Junctions + scoped extras.
    const rel = content.relationships
    const replayJunction = async (
      table: Parameters<typeof tx.insert>[0],
      key: keyof typeof rel,
      overrideOrgId: boolean,
    ) => {
      const rows = (rel[key] ?? []) as Record<string, unknown>[]
      if (rows.length === 0) return
      const values = rows.map(r => normalize(r, ctx, { overrideOrgId }))
      await tx.insert(table).values(values as never)
      inserted[key as string] = rows.length
    }

    // Junctions with no organizationId column: overrideOrgId=false.
    await replayJunction(capabilityPersonas, 'capabilityPersonas', false)
    await replayJunction(applicationCapabilities, 'applicationCapabilities', false)
    await replayJunction(capabilityRelationships, 'capabilityRelationships', false)
    await replayJunction(valueStreamStages, 'valueStreamStages', false)
    await replayJunction(valueStreamStageCapabilities, 'valueStreamStageCapabilities', false)
    await replayJunction(valueStreamPersonas, 'valueStreamPersonas', false)
    await replayJunction(valueStreamCapabilities, 'valueStreamCapabilities', false)
    await replayJunction(objectiveCapabilities, 'objectiveCapabilities', false)
    await replayJunction(objectiveValueStreams, 'objectiveValueStreams', false)
    await replayJunction(goalObjectives, 'goalObjectives', false)
    await replayJunction(strategyGoals, 'strategyGoals', false)
    await replayJunction(strategyCapabilities, 'strategyCapabilities', false)
    await replayJunction(strategyValueStreams, 'strategyValueStreams', false)
    await replayJunction(strategyInitiatives, 'strategyInitiatives', false)
    await replayJunction(initiativeCapabilities, 'initiativeCapabilities', false)
    await replayJunction(initiativeApplications, 'initiativeApplications', false)
    await replayJunction(initiativeObjectives, 'initiativeObjectives', false)
    await replayJunction(adrCapabilities, 'adrCapabilities', false)
    await replayJunction(adrApplications, 'adrApplications', false)
    await replayJunction(adrInitiatives, 'adrInitiatives', false)
    await replayJunction(adrObjectives, 'adrObjectives', false)
    await replayJunction(principleCapabilities, 'principleCapabilities', false)
    await replayJunction(principleAdrs, 'principleAdrs', false)
    await replayJunction(glossaryTermSources, 'glossaryTermSources', false)
    await replayJunction(serviceCapabilities, 'serviceCapabilities', false)
    await replayJunction(servicePersonas, 'servicePersonas', false)
    await replayJunction(serviceValueStreams, 'serviceValueStreams', false)
    await replayJunction(debtCapabilities, 'debtCapabilities', false)
    await replayJunction(debtApplications, 'debtApplications', false)
    await replayJunction(debtInitiatives, 'debtInitiatives', false)
    await replayJunction(debtAdrs, 'debtAdrs', false)

    // entityTaxonomyValues HAS organizationId — override to destination.
    await replayJunction(entityTaxonomyValues, 'entityTaxonomyValues', true)

    // 8. Audit log. organizationId is the destination; before captures the
    //    source envelope so the operator can see what was restored.
    await writeAuditLog(tx, {
      action: 'admin_backup.import_archive',
      entityType: 'organization',
      entityId: destOrgId,
      userId: importingUserId,
      organizationId: destOrgId,
      before: {
        sourceOrgId: envelope.orgId,
        sourceOrgSlug: envelope.orgSlug,
        exportedAt: envelope.exportedAt,
        format: envelope.format,
      },
      after: { inserted },
    })
  })

  return {
    inserted,
    sourceOrgId: envelope.orgId,
    sourceOrgSlug: envelope.orgSlug,
  }
}

/**
 * Updates `lastImportAt` + `lastImportBytes` on the destination org row.
 * Mirrors the recordExport bookkeeping shape for symmetry on the dashboard.
 */
export async function recordImport(orgId: string, bytes: number): Promise<void> {
  await db
    .update(organizations)
    .set({ lastImportAt: new Date(), lastImportBytes: bytes })
    .where(eq(organizations.id, orgId))
}

