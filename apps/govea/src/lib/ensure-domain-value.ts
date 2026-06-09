import { db } from '@/db/client'
import { taxonomyTerms } from '@/db/schema'
import { writeAuditLog } from '@/lib/audit'

// Transaction handle type (same shape db.transaction hands its callback).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Idempotently ensures `name` exists as a value under the org's "Domain"
 * taxonomy type, creating the type first if needed. Case-insensitive dedupe.
 * Returns the **canonical** value name (the existing row's name on a match, so
 * callers can normalize their stored `domain` text to it).
 *
 * Auth-free and transaction-scoped on purpose: shared by `createDomainValue`
 * (the form combobox path) and `importCapabilities` (the CSV path) so both
 * create the taxonomy value identically. Lives in lib/ — not actions/ — because
 * it takes a `tx` and must not be exposed as an RPC server action (#427).
 */
export async function ensureDomainValue(
  tx: Tx,
  orgId: string,
  name: string,
  actorUserId?: string | null,
): Promise<string> {
  const trimmed = name.trim()

  let domainType = await tx.query.taxonomyTerms.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(eq(t.organizationId, orgId), isNull(t.parentId), eq(t.slug, 'domain')),
  })
  if (!domainType) {
    const [created] = await tx.insert(taxonomyTerms).values({
      organizationId: orgId, name: 'Domain', slug: 'domain', parentId: null,
    }).returning()
    domainType = created
  }

  const existing = await tx.query.taxonomyTerms.findFirst({
    where: (t, { eq, and, sql }) =>
      and(
        eq(t.organizationId, orgId),
        eq(t.parentId, domainType!.id),
        sql`lower(${t.name}) = lower(${trimmed})`,
      ),
  })
  if (existing) return existing.name

  const [entry] = await tx.insert(taxonomyTerms).values({
    organizationId: orgId, name: trimmed, slug: toSlug(trimmed), parentId: domainType.id,
  }).returning()

  await writeAuditLog(tx, {
    action: 'taxonomy.create',
    entityType: 'taxonomy_term',
    entityId: entry.id,
    userId: actorUserId ?? null,
    organizationId: orgId,
    after: { name: trimmed, parentId: domainType.id },
  })

  return entry.name
}
