import { db } from '@/db/client'
import { taxonomyTerms, entityTaxonomyDefinitions, glossaryTerms, principles } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit'
import type { Recipe, InstallResult } from './types'

/**
 * Installs a recipe into an org, **idempotently** (#671). Re-running adds
 * nothing duplicate and updates curated fields in place. Everything happens in
 * one transaction. The engine is framework-agnostic — it only knows how to
 * upsert the generic content types a recipe carries.
 *
 * Keys (matching the existing seed pattern, since taxonomy uniqueness is
 * enforced by an apply-triggers index rather than a schema constraint):
 *   - taxonomy type:  (org, parentId=null, slug)
 *   - taxonomy term:  (org, parentId=typeId, slug)
 *   - binding:        (org, entityType, taxonomyTypeId)  [etd_org_entity_type_uniq]
 *   - glossary term:  (org, term)
 *   - principle:      (org, name)
 *
 * Installed glossary/principles are created `published` — a recipe is curated
 * starter content meant to be usable immediately (admins can unpublish/edit).
 */
export async function installRecipe(
  orgId: string,
  recipe: Recipe,
  actorUserId?: string | null,
): Promise<InstallResult> {
  const result: InstallResult = {
    taxonomyTypes: 0, taxonomyTerms: 0, bindings: 0, glossaryTerms: 0, principles: 0,
  }

  await db.transaction(async (tx) => {
    for (const type of recipe.taxonomyTypes ?? []) {
      // Upsert the type (a parent term with parentId = null).
      const [existingType] = await tx
        .select({ id: taxonomyTerms.id })
        .from(taxonomyTerms)
        .where(and(
          eq(taxonomyTerms.organizationId, orgId),
          isNull(taxonomyTerms.parentId),
          eq(taxonomyTerms.slug, type.slug),
        ))
        .limit(1)

      let typeId: string
      if (existingType) {
        typeId = existingType.id
        await tx.update(taxonomyTerms)
          .set({ name: type.name, description: type.description ?? null, audience: type.audience ?? null, updatedAt: new Date() })
          .where(eq(taxonomyTerms.id, typeId))
      } else {
        const [ins] = await tx.insert(taxonomyTerms).values({
          organizationId: orgId, parentId: null, name: type.name, slug: type.slug,
          description: type.description ?? null, audience: type.audience ?? null,
        }).returning({ id: taxonomyTerms.id })
        typeId = ins.id
        result.taxonomyTypes++
      }

      // Upsert each term under the type.
      for (const term of type.terms ?? []) {
        const [existingTerm] = await tx
          .select({ id: taxonomyTerms.id })
          .from(taxonomyTerms)
          .where(and(
            eq(taxonomyTerms.organizationId, orgId),
            eq(taxonomyTerms.parentId, typeId),
            eq(taxonomyTerms.slug, term.slug),
          ))
          .limit(1)
        if (existingTerm) {
          await tx.update(taxonomyTerms)
            .set({ name: term.name, description: term.description ?? null, updatedAt: new Date() })
            .where(eq(taxonomyTerms.id, existingTerm.id))
        } else {
          await tx.insert(taxonomyTerms).values({
            organizationId: orgId, parentId: typeId, name: term.name, slug: term.slug,
            description: term.description ?? null,
          })
          result.taxonomyTerms++
        }
      }

      // Bind the type to entity types (idempotent via etd_org_entity_type_uniq).
      for (const b of type.bindings ?? []) {
        const before = await tx
          .select({ id: entityTaxonomyDefinitions.id })
          .from(entityTaxonomyDefinitions)
          .where(and(
            eq(entityTaxonomyDefinitions.organizationId, orgId),
            eq(entityTaxonomyDefinitions.entityType, b.entityType),
            eq(entityTaxonomyDefinitions.taxonomyTypeId, typeId),
          ))
          .limit(1)
        await tx.insert(entityTaxonomyDefinitions).values({
          organizationId: orgId, entityType: b.entityType, taxonomyTypeId: typeId,
          selectionMode: b.selectionMode ?? 'single', required: b.required ?? false, sortOrder: 0,
        }).onConflictDoNothing()
        if (before.length === 0) result.bindings++
      }
    }

    // Glossary terms — keyed by (org, term).
    for (const g of recipe.glossaryTerms ?? []) {
      const [ex] = await tx.select({ id: glossaryTerms.id }).from(glossaryTerms)
        .where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.term, g.term))).limit(1)
      if (ex) {
        await tx.update(glossaryTerms)
          .set({ definition: g.definition, domain: g.domain ?? null, updatedAt: new Date() })
          .where(eq(glossaryTerms.id, ex.id))
      } else {
        await tx.insert(glossaryTerms).values({
          organizationId: orgId, term: g.term, definition: g.definition, domain: g.domain ?? null,
          status: 'published', visibility: 'org', createdBy: actorUserId ?? null, updatedBy: actorUserId ?? null,
        })
        result.glossaryTerms++
      }
    }

    // Principles — keyed by (org, name).
    for (const p of recipe.principles ?? []) {
      const [ex] = await tx.select({ id: principles.id }).from(principles)
        .where(and(eq(principles.organizationId, orgId), eq(principles.name, p.name))).limit(1)
      const fields = {
        title: p.title ?? null, description: p.description ?? null, rationale: p.rationale ?? null,
        implications: p.implications ?? null, principleType: p.principleType ?? 'architecture',
      }
      if (ex) {
        await tx.update(principles).set({ ...fields, updatedAt: new Date() }).where(eq(principles.id, ex.id))
      } else {
        await tx.insert(principles).values({
          organizationId: orgId, name: p.name, ...fields,
          status: 'published', visibility: 'org', createdBy: actorUserId ?? null, updatedBy: actorUserId ?? null,
        })
        result.principles++
      }
    }

    await writeAuditLog(tx, {
      action: 'recipe.install',
      entityType: 'recipe',
      userId: actorUserId ?? null,
      organizationId: orgId,
      after: { recipe: recipe.slug, version: recipe.version, ...result },
    })
  })

  return result
}
