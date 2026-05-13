'use server'

import { db } from '@/db/client'
import {
  dataEntities, dataAttributes,
  dataEntityRelations, dataEntityAttributeLinks, dataAttributeShares,
} from '@/db/schema'
import { and, eq, or, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Auth gates ──────────────────────────────────────────────────────────────

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')
  return session
}

// ── Canonical ordering helper ───────────────────────────────────────────────

/**
 * Returns the pair (a, b) such that a < b lexicographically. Symmetric
 * relationships are stored once with the smaller UUID first; this prevents
 * (a,b) and (b,a) from coexisting as different rows.
 */
function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

class RelationshipValidationError extends Error {}

// ── Org-scoped existence helpers ────────────────────────────────────────────

async function assertEntitiesInOrg(ids: string[], orgId: string): Promise<void> {
  if (ids.length === 0) return
  const rows = await db
    .select({ id: dataEntities.id })
    .from(dataEntities)
    .where(and(eq(dataEntities.organizationId, orgId), inArray(dataEntities.id, ids)))
  if (rows.length !== new Set(ids).size) {
    throw new RelationshipValidationError('One or more entities not found in this organization')
  }
}

async function assertAttributesInOrg(ids: string[], orgId: string): Promise<void> {
  if (ids.length === 0) return
  const rows = await db
    .select({ id: dataAttributes.id })
    .from(dataAttributes)
    .where(and(eq(dataAttributes.organizationId, orgId), inArray(dataAttributes.id, ids)))
  if (rows.length !== new Set(ids).size) {
    throw new RelationshipValidationError('One or more attributes not found in this organization')
  }
}

// ── entity ↔ entity "is related" ────────────────────────────────────────────

export async function getRelatedEntityIds(entityId: string): Promise<string[]> {
  const rows = await db
    .select({
      left: dataEntityRelations.leftDataEntityId,
      right: dataEntityRelations.rightDataEntityId,
    })
    .from(dataEntityRelations)
    .where(
      or(
        eq(dataEntityRelations.leftDataEntityId, entityId),
        eq(dataEntityRelations.rightDataEntityId, entityId),
      ),
    )
  return rows.map(r => (r.left === entityId ? r.right : r.left))
}

/**
 * Replaces the set of related-entity IDs for `entityId` to exactly `relatedIds`.
 * Self-relations are silently filtered out. Caller must own `entityId`.
 */
export async function setRelatedEntities(entityId: string, relatedIds: string[]): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const sourceRow = await db.query.dataEntities.findFirst({
    where: and(eq(dataEntities.id, entityId), eq(dataEntities.organizationId, orgId)),
  })
  if (!sourceRow) throw new RelationshipValidationError('Entity not found in this organization')

  // De-duplicate, exclude self-relations.
  const cleaned = Array.from(new Set(relatedIds)).filter(id => id !== entityId)
  await assertEntitiesInOrg(cleaned, orgId)

  await db.transaction(async (tx) => {
    // Delete all existing relationships touching this entity (both sides).
    await tx.delete(dataEntityRelations).where(
      or(
        eq(dataEntityRelations.leftDataEntityId, entityId),
        eq(dataEntityRelations.rightDataEntityId, entityId),
      ),
    )
    // Re-insert canonical pairs.
    if (cleaned.length > 0) {
      const rows = cleaned.map(otherId => {
        const [left, right] = canonicalPair(entityId, otherId)
        return {
          organizationId: orgId,
          leftDataEntityId: left,
          rightDataEntityId: right,
          createdBy: session.user.id,
        }
      })
      await tx.insert(dataEntityRelations).values(rows)
    }
    await writeAuditLog(tx, {
      action: 'data_entity.set_relations',
      entityType: 'data_entity',
      entityId,
      userId: session.user.id,
      organizationId: orgId,
      after: { relatedCount: cleaned.length },
    })
  })

  revalidatePath(`/data/entities/${entityId}`)
}

// ── entity ↔ attribute "characterized by" ───────────────────────────────────

export async function getCharacterizingAttributeIds(entityId: string): Promise<string[]> {
  const rows = await db
    .select({ id: dataEntityAttributeLinks.dataAttributeId })
    .from(dataEntityAttributeLinks)
    .where(eq(dataEntityAttributeLinks.dataEntityId, entityId))
  return rows.map(r => r.id)
}

export async function getEntitiesCharacterizedBy(attributeId: string): Promise<string[]> {
  const rows = await db
    .select({ id: dataEntityAttributeLinks.dataEntityId })
    .from(dataEntityAttributeLinks)
    .where(eq(dataEntityAttributeLinks.dataAttributeId, attributeId))
  return rows.map(r => r.id)
}

/**
 * Replaces the set of attributes that characterize `entityId`. Caller must
 * own the entity; all listed attributes must belong to the same org.
 */
export async function setCharacterizingAttributes(
  entityId: string,
  attributeIds: string[],
): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const sourceRow = await db.query.dataEntities.findFirst({
    where: and(eq(dataEntities.id, entityId), eq(dataEntities.organizationId, orgId)),
  })
  if (!sourceRow) throw new RelationshipValidationError('Entity not found in this organization')

  const cleaned = Array.from(new Set(attributeIds))
  await assertAttributesInOrg(cleaned, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(dataEntityAttributeLinks)
      .where(eq(dataEntityAttributeLinks.dataEntityId, entityId))
    if (cleaned.length > 0) {
      await tx.insert(dataEntityAttributeLinks).values(
        cleaned.map(aid => ({
          organizationId: orgId,
          dataEntityId: entityId,
          dataAttributeId: aid,
          createdBy: session.user.id,
        })),
      )
    }
    await writeAuditLog(tx, {
      action: 'data_entity.set_characterizing_attributes',
      entityType: 'data_entity',
      entityId,
      userId: session.user.id,
      organizationId: orgId,
      after: { attributeCount: cleaned.length },
    })
  })

  revalidatePath(`/data/entities/${entityId}`)
}

// ── attribute ↔ attribute "shares" ──────────────────────────────────────────

export async function getSharedAttributeIds(attributeId: string): Promise<string[]> {
  const rows = await db
    .select({
      left: dataAttributeShares.leftDataAttributeId,
      right: dataAttributeShares.rightDataAttributeId,
    })
    .from(dataAttributeShares)
    .where(
      or(
        eq(dataAttributeShares.leftDataAttributeId, attributeId),
        eq(dataAttributeShares.rightDataAttributeId, attributeId),
      ),
    )
  return rows.map(r => (r.left === attributeId ? r.right : r.left))
}

export async function setSharedAttributes(
  attributeId: string,
  sharedIds: string[],
): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const sourceRow = await db.query.dataAttributes.findFirst({
    where: and(eq(dataAttributes.id, attributeId), eq(dataAttributes.organizationId, orgId)),
  })
  if (!sourceRow) throw new RelationshipValidationError('Attribute not found in this organization')

  const cleaned = Array.from(new Set(sharedIds)).filter(id => id !== attributeId)
  await assertAttributesInOrg(cleaned, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(dataAttributeShares).where(
      or(
        eq(dataAttributeShares.leftDataAttributeId, attributeId),
        eq(dataAttributeShares.rightDataAttributeId, attributeId),
      ),
    )
    if (cleaned.length > 0) {
      const rows = cleaned.map(otherId => {
        const [left, right] = canonicalPair(attributeId, otherId)
        return {
          organizationId: orgId,
          leftDataAttributeId: left,
          rightDataAttributeId: right,
          createdBy: session.user.id,
        }
      })
      await tx.insert(dataAttributeShares).values(rows)
    }
    await writeAuditLog(tx, {
      action: 'data_attribute.set_shares',
      entityType: 'data_attribute',
      entityId: attributeId,
      userId: session.user.id,
      organizationId: orgId,
      after: { sharedCount: cleaned.length },
    })
  })

  revalidatePath(`/data/attributes/${attributeId}`)
}
