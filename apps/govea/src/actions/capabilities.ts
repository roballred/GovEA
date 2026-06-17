'use server'

import { db } from '@/db/client'
import { capabilities, capabilityPersonas, capabilityRelationships, entityTaxonomyValues, personas, applicationCapabilities, objectiveCapabilities } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { syncEntityTaxonomyValues, getEntityTaxonomyDefinitions, getEntityTaxonomyValues } from '@/lib/entity-taxonomy-helpers'
import { assertEntityInOrg, assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { notifySubscribers, notifyDomainOwner } from './notifications'
import { ensurePublishOpenDebtAck } from '@/lib/debt-publish-gate'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { ensureDomainOwnerOverwriteAck, assertUserInOrg } from '@/lib/domain-owner-gate'
import { ensurePublishReady } from '@/lib/publish-readiness-gate'
import { parseCsv, splitSemicolonList } from '@/lib/csv'
import { ensureDomainValue } from '@/lib/ensure-domain-value'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { flagLinksForVisibilityDrop, clearLinksFlag } from '@/lib/cross-org-link-helpers'

async function requireContributor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) throw new Error('Forbidden')
  return session
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export async function getCapability(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const capability = await db.query.capabilities.findFirst({
    where: eq(capabilities.id, id),
    with: {
      organization: true,
      capabilityPersonas: { with: { persona: true } },
      applicationCapabilities: { with: { application: true } },
      objectiveCapabilities: { with: { objective: true } },
      initiativeCapabilities: { with: { initiative: true } },
      strategyCapabilities: { with: { strategy: true } },
      adrCapabilities: { with: { adr: true } },
      principleCapabilities: { with: { principle: true } },
    },
  })

  if (!capability) return null
  const visible = await canReadFederatedEntity(capability.organizationId, capability.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && capability.status !== 'published') return null

  // Fetch relationships separately — avoids Drizzle relational schema cache for self-referential table
  const [childRels, parentRels] = await Promise.all([
    db.select({
      parentId: capabilityRelationships.parentId,
      childId: capabilityRelationships.childId,
    }).from(capabilityRelationships).where(eq(capabilityRelationships.parentId, id)),
    db.select({
      parentId: capabilityRelationships.parentId,
      childId: capabilityRelationships.childId,
    }).from(capabilityRelationships).where(eq(capabilityRelationships.childId, id)),
  ])

  // Fetch names for related caps
  const relatedIds = [...childRels.map(r => r.childId), ...parentRels.map(r => r.parentId)]
  const relatedCaps = relatedIds.length > 0
    ? await db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities)
        .where(inArray(capabilities.id, relatedIds))
    : []
  const capNameById = new Map(relatedCaps.map(c => [c.id, c.name]))

  const [taxonomyValues, taxonomyDefinitions] = await Promise.all([
    getEntityTaxonomyValues(capability.organizationId, 'capability', id),
    getEntityTaxonomyDefinitions(capability.organizationId, 'capability'),
  ])

  return {
    ...capability,
    childRelationships: childRels.map(r => ({ ...r, child: { id: r.childId, name: capNameById.get(r.childId) ?? '' } })),
    parentRelationships: parentRels.map(r => ({ ...r, parent: { id: r.parentId, name: capNameById.get(r.parentId) ?? '' } })),
    taxonomyValues,
    taxonomyDefinitions,
  }
}

export async function getCapabilities(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  const rows = await db.query.capabilities.findMany({
    where: () => {
      const vis = listScopeFilter(capabilities, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(capabilities.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      capabilityPersonas: { with: { persona: true } },
    },
    orderBy: (c, { asc }) => [asc(c.name)],
  })

  // Fetch capability relationships separately and attach — avoids relying on Drizzle
  // relational query schema cache for the self-referential junction table.
  if (rows.length === 0) return rows.map(r => ({ ...r, childRelationships: [], parentRelationships: [] }))
  const capIds = rows.map(r => r.id)
  const rels = await db.select().from(capabilityRelationships).where(
    and(
      inArray(capabilityRelationships.parentId, capIds),
    )
  )
  const parentRels = await db.select().from(capabilityRelationships).where(
    inArray(capabilityRelationships.childId, capIds)
  )
  const childRelMap = new Map<string, { parentId: string; childId: string }[]>()
  const parentRelMap = new Map<string, { parentId: string; childId: string }[]>()
  for (const r of rels) {
    const arr = childRelMap.get(r.parentId) ?? []
    arr.push(r)
    childRelMap.set(r.parentId, arr)
  }
  for (const r of parentRels) {
    const arr = parentRelMap.get(r.childId) ?? []
    arr.push(r)
    parentRelMap.set(r.childId, arr)
  }
  return rows.map(r => ({
    ...r,
    childRelationships:  childRelMap.get(r.id)  ?? [],
    parentRelationships: parentRelMap.get(r.id) ?? [],
  }))
}

export async function createCapability(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const behaviors = (formData.get('behaviors') as string) || null
  const rules = (formData.get('rules') as string) || null
  const capabilityType = (formData.get('capabilityType') as 'business' | 'technical') || null
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const personaIds = formData.getAll('personaIds') as string[]
  const parentId = (formData.get('parentId') as string) || null
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  // Verify every supplied junction target belongs to the caller's org.
  // Cross-org references are only allowed through crossOrgLinks (#415).
  for (const personaId of personaIds) {
    await assertEntityInOrg('persona', personaId, orgId)
  }
  if (parentId) {
    await assertEntityInOrg('capability', parentId, orgId)
  }
  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  // #566 — soft-warn on duplicate names. Throws unless the form sent
  // `acknowledgeDuplicate=on`. Client form catches + re-submits with ack.
  await ensureNoDuplicateName('capability', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  // Mutation + audit are wrapped in a single transaction so a DB-layer audit
  // failure rolls back the capability insert and its junction rows (#416).
  await db.transaction(async (tx) => {
    const [capability] = await tx.insert(capabilities).values({
      name,
      description,
      domain,
      behaviors,
      rules,
      capabilityType,
      status,
      visibility,
      domainOwnerUserId,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    if (personaIds.length > 0) {
      await tx.insert(capabilityPersonas).values(
        personaIds.map(personaId => ({ capabilityId: capability.id, personaId }))
      )
    }

    if (parentId) {
      await tx.insert(capabilityRelationships).values({ parentId, childId: capability.id }).onConflictDoNothing()
    }

    if (taxonomyTermIds.length > 0) {
      await syncEntityTaxonomyValues(tx, orgId, 'capability', capability.id, taxonomyTermIds)
    }

    await writeAuditLog(tx, {
      action: 'capability.create',
      entityType: 'capability',
      entityId: capability.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, description, domain, capabilityType, status, visibility, personaIds, parentId },
    })
  })
}

export async function editCapability(capabilityId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const domain = (formData.get('domain') as string) || null
  const behaviors = (formData.get('behaviors') as string) || null
  const rules = (formData.get('rules') as string) || null
  const capabilityType = (formData.get('capabilityType') as 'business' | 'technical') || null
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const personaIds = formData.getAll('personaIds') as string[]
  const parentId = (formData.get('parentId') as string) || null
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(before?.organizationId, orgId)

  // Verify every supplied junction target belongs to the caller's org.
  // Cross-org references are only allowed through crossOrgLinks (#415).
  for (const personaId of personaIds) {
    await assertEntityInOrg('persona', personaId, orgId)
  }
  if (parentId) {
    await assertEntityInOrg('capability', parentId, orgId)
  }
  // Domain owner must be a user in the caller's org. Cross-org owners are
  // not meaningful — domain ownership is an intra-org coordination signal.
  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  // Domain-owner overwrite gate (#581): if the object is owned by another
  // user, require explicit acknowledgment. The gate uses the pre-edit owner
  // (not the form field) — that's what the actor is overwriting.
  const acknowledgeOverwrite = formData.get('acknowledgeOverwrite') === 'on'
  const ownerAck = await ensureDomainOwnerOverwriteAck({
    beforeOwnerUserId: before?.domainOwnerUserId,
    actorUserId: session.user.id,
    acknowledged: acknowledgeOverwrite,
  })

  // Publish-time debt gate (#381 PR-3): when transitioning to 'published'
  // with linked critical/high open debt, require explicit ack from the form.
  const transitioningToPublished = before?.status !== 'published' && status === 'published'
  const acknowledgeOpenDebt = formData.get('acknowledgeOpenDebt') === 'on'
  const debtAck = await ensurePublishOpenDebtAck({
    entityType: 'capability',
    entityId: capabilityId,
    transitioningToPublished,
    acknowledged: acknowledgeOpenDebt,
  })

  // #567 Part B — publish-readiness gate. Only fires on the
  // transition-to-published edge. Counts applications + objectives
  // from the DB because those links live on separate detail-page
  // panels rather than in the edit form.
  let publishReadyResult = { missingFields: [] as string[] }
  if (transitioningToPublished) {
    const [appLinks, objLinks] = await Promise.all([
      db.select({ id: applicationCapabilities.applicationId }).from(applicationCapabilities)
        .where(eq(applicationCapabilities.capabilityId, capabilityId)),
      db.select({ id: objectiveCapabilities.objectiveId }).from(objectiveCapabilities)
        .where(eq(objectiveCapabilities.capabilityId, capabilityId)),
    ])
    publishReadyResult = ensurePublishReady({
      entityType: 'capability',
      formData,
      linkCounts: {
        personaCount: personaIds.length,
        applicationCount: appLinks.length,
        objectiveCount: objLinks.length,
      },
      transitioningToPublished,
      acknowledged: formData.get('acknowledgePublishIncomplete') === 'on',
    })
  }

  // Mutation + audit + cross-org-link flag/clear are all in one transaction
  // so a failure anywhere rolls back the entire edit (#416).
  await db.transaction(async (tx) => {
    await tx.update(capabilities).set({
      name,
      description,
      domain,
      behaviors,
      rules,
      capabilityType,
      status,
      visibility,
      domainOwnerUserId,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId)))

    // Replace persona links
    await tx.delete(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, capabilityId))
    if (personaIds.length > 0) {
      await tx.insert(capabilityPersonas).values(
        personaIds.map(personaId => ({ capabilityId, personaId }))
      )
    }

    // Replace parent relationship (remove existing, add new if set)
    await tx.delete(capabilityRelationships).where(eq(capabilityRelationships.childId, capabilityId))
    if (parentId) {
      await tx.insert(capabilityRelationships).values({ parentId, childId: capabilityId }).onConflictDoNothing()
    }

    await syncEntityTaxonomyValues(tx, orgId, 'capability', capabilityId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'capability.edit',
      entityType: 'capability',
      entityId: capabilityId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status, visibility: before?.visibility },
      after: { name, description, domain, capabilityType, status, visibility, personaIds, parentId },
    })

    // #581 — fan out to subscribers. Notify everyone but the actor.
    await notifySubscribers(tx, {
      organizationId: orgId,
      entityType: 'capability',
      entityId: capabilityId,
      action: 'capability.edit',
      actorUserId: session.user.id,
      summary: `${session.user.name ?? session.user.email ?? 'Someone'} updated ${name}`,
    })

    // #581 follow-up: when a non-owner overwrite was acknowledged, log it so
    // the audit log shows who overwrote whose record. Cross-references the
    // owner so a domain-owner persona review surfaces the row.
    if (ownerAck.gated) {
      await writeAuditLog(tx, {
        action: 'domain_owner.overwrite_acknowledged',
        entityType: 'capability',
        entityId: capabilityId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          ownerUserId: ownerAck.ownerUserId,
          ownerName: ownerAck.ownerName,
          ownerEmail: ownerAck.ownerEmail,
        },
      })
      // Bridge: notify the owner via the in-app inbox. Owners shouldn't
      // have to subscribe to their own records to hear about overwrites.
      await notifyDomainOwner(tx, {
        organizationId: orgId,
        entityType: 'capability',
        entityId: capabilityId,
        action: 'capability.edit_by_non_owner',
        actorUserId: session.user.id,
        ownerUserId: ownerAck.ownerUserId,
        summary: `${session.user.name ?? session.user.email ?? 'Someone'} edited your capability "${name}"`,
      })
    }

    // #381 PR-3: when the publish-debt gate was acknowledged, log it.
    if (debtAck.acknowledged) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_open_debt',
        entityType: 'capability',
        entityId: capabilityId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          criticalCount: debtAck.criticalCount,
          highCount: debtAck.highCount,
          publishedAt: new Date().toISOString(),
        },
      })
    }

    // #567 Part B: when the publish-readiness gate was acknowledged, log it
    // with the missing-field list so a later review can see what was waved.
    if (publishReadyResult.missingFields.length > 0) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_incomplete',
        entityType: 'capability',
        entityId: capabilityId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { missingFields: publishReadyResult.missingFields },
      })
    }

    // Flag or clear cross-org links when visibility changes.
    const prevVis = before?.visibility
    const visDropped = (prevVis === 'connections' || prevVis === 'instance') && visibility === 'org'
    const visRaised = prevVis === 'org' && (visibility === 'connections' || visibility === 'instance')
    if (visDropped) await flagLinksForVisibilityDrop(tx, 'capability', capabilityId, `"${name}" visibility was restricted to org-only — this link may no longer be accessible to the other org`)
    if (visRaised)  await clearLinksFlag(tx, 'capability', capabilityId)
  })
}

export async function deleteCapability(capabilityId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(eq(entityTaxonomyValues.entityType, 'capability'), eq(entityTaxonomyValues.entityId, capabilityId))
    )

    await tx.delete(capabilities).where(
      and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'capability.delete',
      entityType: 'capability',
      entityId: capabilityId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name },
    })
  })
}

// ── Import (#596) ────────────────────────────────────────────────────────────
//
// Capability CSV import. Mirrors the Applications import pattern (#444) so
// the audit's per-entity CSV plan stays consistent across the catalog:
//
//   - `name` is the upsert key. Existing rows match case-insensitively.
//   - `personas` column is a semicolon-joined name list resolved to ids by
//     looking up persona names in the caller's org.
//   - Pre-validate ALL rows before opening the transaction so the returned
//     counters reflect a complete pass — even if the second half fails.
//   - `dryRun: true` returns counters and errors without writing anything;
//     the table UI uses this for the import-preview step.

export type CapabilityImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const CAPABILITY_FIXED_COLUMNS = new Set([
  'name', 'description', 'domain', 'behaviors', 'rules',
  'capability_type', 'status', 'visibility', 'personas',
])
const VALID_CAPABILITY_TYPE = new Set(['', 'business', 'technical'])
const VALID_CAPABILITY_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_CAPABILITY_VISIBILITY = new Set(['org', 'connections', 'instance'])

// CSV parser lives in `@/lib/csv` — shared with personas + ADRs per #596.

export async function importCapabilities(formData: FormData, dryRun = false): Promise<CapabilityImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  // Pre-fetch existing capabilities for upsert + persona name → id lookup.
  // Both fetches scoped to the caller's org. Cross-org persona references
  // are intentionally not resolved here — same rule as createCapability.
  const [existing, orgPersonas] = await Promise.all([
    db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.personas.findMany({
      where: eq(personas.organizationId, orgId),
      columns: { id: true, name: true },
    }),
  ])
  const existingByName = new Map(existing.map(c => [c.name.toLowerCase(), c.id]))
  const personaIdByName = new Map(orgPersonas.map(p => [p.name.toLowerCase(), p.id]))

  type ValidRow = {
    name: string
    description: string | null
    domain: string | null
    behaviors: string | null
    rules: string | null
    capabilityType: 'business' | 'technical' | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    personaIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []
  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2 // 1-indexed accounting for header row
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const capabilityTypeRaw = (row['capability_type'] || '').trim().toLowerCase()
    const status = (row['status'] || 'draft').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()

    if (!VALID_CAPABILITY_TYPE.has(capabilityTypeRaw)) {
      errors.push(`Row ${rowNum}: invalid capability_type "${capabilityTypeRaw}" (expected "business", "technical", or empty)`)
      skipped++; continue
    }
    if (!VALID_CAPABILITY_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_CAPABILITY_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`)
      skipped++; continue
    }

    // Resolve personas — unknown names report as warnings, not row failures.
    // The capability still imports; just without the unresolvable links.
    const personaIds: string[] = []
    const personaNames = splitSemicolonList(row['personas'])
    for (const personaName of personaNames) {
      const id = personaIdByName.get(personaName.toLowerCase())
      if (id) personaIds.push(id)
      else errors.push(`Row ${rowNum}: persona "${personaName}" not found in this org — skipped`)
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++

    validRows.push({
      name,
      description: row['description'] || null,
      domain: row['domain'] || null,
      behaviors: row['behaviors'] || null,
      rules: row['rules'] || null,
      capabilityType: (capabilityTypeRaw || null) as 'business' | 'technical' | null,
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      personaIds,
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      // #717 — ensure each imported domain exists as a "Domain" taxonomy value
      // (created if absent, deduped case-insensitively) the same way the form
      // combobox does, and normalize each row's domain to the canonical name so
      // the stored text matches the taxonomy value. Without this the domain
      // showed on the capability but was orphaned (not in the dropdown/filter).
      const canonicalDomain = new Map<string, string>()
      for (const r of validRows) {
        if (r.domain && !canonicalDomain.has(r.domain)) {
          canonicalDomain.set(r.domain, await ensureDomainValue(tx, orgId, r.domain, session.user.id))
        }
      }
      for (const r of validRows) {
        if (r.domain) r.domain = canonicalDomain.get(r.domain) ?? r.domain
      }

      for (const r of validRows) {
        let capId = r.existingId
        if (capId) {
          await tx.update(capabilities).set({
            description: r.description,
            domain: r.domain,
            behaviors: r.behaviors,
            rules: r.rules,
            capabilityType: r.capabilityType,
            status: r.status,
            visibility: r.visibility,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(capabilities.id, capId), eq(capabilities.organizationId, orgId)))
          // Replace persona links wholesale — same semantics as editCapability.
          await tx.delete(capabilityPersonas).where(eq(capabilityPersonas.capabilityId, capId))
        } else {
          const [inserted] = await tx.insert(capabilities).values({
            name: r.name,
            description: r.description,
            domain: r.domain,
            behaviors: r.behaviors,
            rules: r.rules,
            capabilityType: r.capabilityType,
            status: r.status,
            visibility: r.visibility,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: capabilities.id })
          capId = inserted.id
        }
        if (r.personaIds.length > 0) {
          await tx.insert(capabilityPersonas).values(
            r.personaIds.map(personaId => ({ capabilityId: capId!, personaId }))
          )
        }
      }

      await writeAuditLog(tx, {
        action: 'capability.import',
        entityType: 'capability',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}

export async function markCapabilityReviewed(capabilityId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.capabilities.findFirst({ where: eq(capabilities.id, capabilityId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.update(capabilities).set({
      lastReviewedBy: session.user.id,
      lastReviewedAt: now,
    }).where(and(eq(capabilities.id, capabilityId), eq(capabilities.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'capability.reviewed',
      entityType: 'capability',
      entityId: capabilityId,
      userId: session.user.id,
      organizationId: orgId,
      after: { lastReviewedAt: now.toISOString() },
    })
  })

  revalidatePath(`/capabilities/${capabilityId}`)
}
