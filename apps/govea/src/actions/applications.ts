'use server'

import { db } from '@/db/client'
import { applications, applicationCapabilities, objectiveCapabilities, entityTaxonomyValues, capabilities } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { assertOwnership, canReadFederatedEntity, getConnectedOrgIds, listScopeFilter, type ListScope } from '@/lib/federation'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { notifySubscribers, notifyDomainOwner } from './notifications'
import { ensurePublishOpenDebtAck } from '@/lib/debt-publish-gate'
import { ensureNoDuplicateName } from '@/lib/duplicate-name-gate'
import { ensureDomainOwnerOverwriteAck, assertUserInOrg } from '@/lib/domain-owner-gate'
import { ensurePublishReady } from '@/lib/publish-readiness-gate'
import { autoFlagLifecycleDebt } from '@/lib/lifecycle-debt'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { syncEntityTaxonomyValues, getEntityTaxonomyValues, getEntityTaxonomyDefinitions } from '@/lib/entity-taxonomy-helpers'
import { getCustomFieldSchema } from './custom-fields'
import { parseCsv, splitSemicolonList } from '@/lib/csv'

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

// Extracts custom field values from FormData using the `customData.FieldName` prefix convention.
function extractCustomData(formData: FormData, fieldNames: string[]): Record<string, string> {
  const customData: Record<string, string> = {}
  for (const name of fieldNames) {
    const key = `customData.${name}`
    const values = formData.getAll(key) as string[]
    if (values.length > 1) {
      customData[name] = values.join(',') // multiselect
    } else if (values[0]) {
      customData[name] = values[0]
    }
  }
  return customData
}

export async function getApplication(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const application = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      organization: true,
      // Note: capability is fetched shallow (no objectiveCapabilities nesting) to avoid
      // PostgreSQL's 63-char identifier limit causing alias collisions on 4-level deep queries.
      // Objectives linked through capabilities are fetched separately below.
      applicationCapabilities: {
        with: { capability: true },
      },
      initiativeApplications: { with: { initiative: true } },
      adrApplications: { with: { adr: true } },
    },
  })

  if (!application) return null
  const visible = await canReadFederatedEntity(application.organizationId, application.visibility, session.user.organizationId!)
  if (!visible) return null
  if (session.user.role === 'viewer' && application.status !== 'published') return null

  const capabilityIds = application.applicationCapabilities.map(ac => ac.capabilityId)
  const [capabilityObjectives, taxonomyValues, taxonomyDefinitions, customFieldDefs] = await Promise.all([
    capabilityIds.length > 0
      ? db.query.objectiveCapabilities.findMany({
          where: inArray(objectiveCapabilities.capabilityId, capabilityIds),
          with: { objective: true },
        })
      : Promise.resolve([]),
    getEntityTaxonomyValues(application.organizationId, 'application', id),
    getEntityTaxonomyDefinitions(application.organizationId, 'application'),
    getCustomFieldSchema(application.organizationId, 'application'),
  ])

  return { ...application, capabilityObjectives, taxonomyValues, taxonomyDefinitions, customFieldDefs }
}

export async function getApplications(scope: ListScope = 'org') {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const organizationId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  const connectedOrgIds = scope === 'federated' ? await getConnectedOrgIds(organizationId) : []

  return db.query.applications.findMany({
    where: () => {
      const vis = listScopeFilter(applications, { orgId: organizationId, scope, connectedOrgIds })
      const statusFilter = isViewer ? eq(applications.status, 'published') : undefined
      return statusFilter ? and(vis, statusFilter)! : vis
    },
    with: {
      organization: true,
      applicationCapabilities: { with: { capability: true } },
    },
    orderBy: (a, { asc }) => [asc(a.name)],
  })
}

export async function createApplication(formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const vendor = (formData.get('vendor') as string) || null
  const version = (formData.get('version') as string) || null
  const hostingModel = (formData.get('hostingModel') as string) || null
  const lifecycleStatus = (formData.get('lifecycleStatus') as 'active' | 'sunset' | 'decommissioned' | 'planned') ?? 'active'
  const status = (formData.get('status') as 'draft' | 'published' | 'archived') ?? 'draft'
  const visibility = (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  // #566 — soft-warn on duplicate names.
  await ensureNoDuplicateName('application', orgId, name, formData.get('acknowledgeDuplicate') === 'on')

  const fieldDefs = await getCustomFieldSchema(orgId, 'application')
  const customData = extractCustomData(formData, fieldDefs.map(f => f.name))

  let newApplicationId: string
  await db.transaction(async (tx) => {
    const [application] = await tx.insert(applications).values({
      name,
      description,
      vendor,
      version,
      hostingModel,
      lifecycleStatus,
      status,
      visibility,
      customData,
      domainOwnerUserId,
      organizationId: orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning()

    newApplicationId = application.id

    if (capabilityIds.length > 0) {
      await tx.insert(applicationCapabilities).values(
        capabilityIds.map(capabilityId => ({ applicationId: application.id, capabilityId }))
      )
    }

    if (taxonomyTermIds.length > 0) {
      await syncEntityTaxonomyValues(tx, orgId, 'application', application.id, taxonomyTermIds)
    }

    await writeAuditLog(tx, {
      action: 'application.create',
      entityType: 'application',
      entityId: application.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, vendor, lifecycleStatus, status, visibility, capabilityIds },
    })
  })

  await autoFlagLifecycleDebt({
    applicationId: newApplicationId!,
    applicationName: name,
    organizationId: orgId,
    lifecycleStatus,
  })
}

export async function editApplication(applicationId: string, formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const vendor = (formData.get('vendor') as string) || null
  const version = (formData.get('version') as string) || null
  const hostingModel = (formData.get('hostingModel') as string) || null
  const lifecycleStatus = formData.get('lifecycleStatus') as 'active' | 'sunset' | 'decommissioned' | 'planned'
  const status = formData.get('status') as 'draft' | 'published' | 'archived'
  const visibility = formData.get('visibility') as 'org' | 'connections' | 'instance'
  const capabilityIds = formData.getAll('capabilityIds') as string[]
  const taxonomyTermIds = formData.getAll('taxonomyTermIds') as string[]
  const domainOwnerUserId = (formData.get('domainOwnerUserId') as string) || null

  const before = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(before?.organizationId, orgId)

  if (domainOwnerUserId) {
    await assertUserInOrg(domainOwnerUserId, orgId)
  }

  const fieldDefs = await getCustomFieldSchema(orgId, 'application')
  const customData = extractCustomData(formData, fieldDefs.map(f => f.name))

  // Domain-owner overwrite gate (#581) — see capabilities.ts for context.
  const acknowledgeOverwrite = formData.get('acknowledgeOverwrite') === 'on'
  const ownerAck = await ensureDomainOwnerOverwriteAck({
    beforeOwnerUserId: before?.domainOwnerUserId,
    actorUserId: session.user.id,
    acknowledged: acknowledgeOverwrite,
  })

  // Publish-time debt gate (#381 PR-3)
  const transitioningToPublished = before?.status !== 'published' && status === 'published'
  const acknowledgeOpenDebt = formData.get('acknowledgeOpenDebt') === 'on'
  const debtAck = await ensurePublishOpenDebtAck({
    entityType: 'application',
    entityId: applicationId,
    transitioningToPublished,
    acknowledged: acknowledgeOpenDebt,
  })

  // #567 Part B — publish-readiness. capabilityIds is in the form.
  const publishReadyResult = ensurePublishReady({
    entityType: 'application',
    formData,
    linkCounts: { capabilityCount: capabilityIds.length },
    transitioningToPublished,
    acknowledged: formData.get('acknowledgePublishIncomplete') === 'on',
  })

  await db.transaction(async (tx) => {
    await tx.update(applications).set({
      name,
      description,
      vendor,
      version,
      hostingModel,
      lifecycleStatus,
      status,
      visibility,
      customData,
      domainOwnerUserId,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(and(eq(applications.id, applicationId), eq(applications.organizationId, orgId)))

    await tx.delete(applicationCapabilities).where(eq(applicationCapabilities.applicationId, applicationId))
    if (capabilityIds.length > 0) {
      await tx.insert(applicationCapabilities).values(
        capabilityIds.map(capabilityId => ({ applicationId, capabilityId }))
      )
    }

    await syncEntityTaxonomyValues(tx, orgId, 'application', applicationId, taxonomyTermIds)

    await writeAuditLog(tx, {
      action: 'application.edit',
      entityType: 'application',
      entityId: applicationId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, status: before?.status, visibility: before?.visibility },
      after: { name, vendor, lifecycleStatus, status, visibility, capabilityIds },
    })

    // #581 — notify subscribers of this app's change.
    await notifySubscribers(tx, {
      organizationId: orgId,
      entityType: 'application',
      entityId: applicationId,
      action: 'application.edit',
      actorUserId: session.user.id,
      summary: `${session.user.name ?? session.user.email ?? 'Someone'} updated ${name}`,
    })

    // #581 follow-up: domain-owner overwrite acknowledgment audit row.
    if (ownerAck.gated) {
      await writeAuditLog(tx, {
        action: 'domain_owner.overwrite_acknowledged',
        entityType: 'application',
        entityId: applicationId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          ownerUserId: ownerAck.ownerUserId,
          ownerName: ownerAck.ownerName,
          ownerEmail: ownerAck.ownerEmail,
        },
      })
      await notifyDomainOwner(tx, {
        organizationId: orgId,
        entityType: 'application',
        entityId: applicationId,
        action: 'application.edit_by_non_owner',
        actorUserId: session.user.id,
        ownerUserId: ownerAck.ownerUserId,
        summary: `${session.user.name ?? session.user.email ?? 'Someone'} edited your application "${name}"`,
      })
    }

    if (debtAck.acknowledged) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_open_debt',
        entityType: 'application',
        entityId: applicationId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: {
          criticalCount: debtAck.criticalCount,
          highCount: debtAck.highCount,
          publishedAt: new Date().toISOString(),
        },
      })
    }

    if (publishReadyResult.missingFields.length > 0) {
      await writeAuditLog(tx, {
        action: 'publish.acknowledged_incomplete',
        entityType: 'application',
        entityId: applicationId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { missingFields: publishReadyResult.missingFields },
      })
    }
  })

  await autoFlagLifecycleDebt({
    applicationId,
    applicationName: name,
    organizationId: orgId,
    lifecycleStatus,
  })
}

export async function deleteApplication(applicationId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(before?.organizationId, orgId)

  await db.transaction(async (tx) => {
    await tx.delete(entityTaxonomyValues).where(
      and(
        eq(entityTaxonomyValues.organizationId, orgId),
        eq(entityTaxonomyValues.entityType, 'application'),
        eq(entityTaxonomyValues.entityId, applicationId),
      )
    )

    await tx.delete(applications).where(
      and(eq(applications.id, applicationId), eq(applications.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'application.delete',
      entityType: 'application',
      entityId: applicationId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name },
    })
  })
}

export async function markApplicationReviewed(applicationId: string, _formData: FormData) {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const record = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
  assertOwnership(record?.organizationId, orgId)

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.update(applications).set({
      lastReviewedBy: session.user.id,
      lastReviewedAt: now,
    }).where(and(eq(applications.id, applicationId), eq(applications.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'application.reviewed',
      entityType: 'application',
      entityId: applicationId,
      userId: session.user.id,
      organizationId: orgId,
      after: { lastReviewedAt: now.toISOString() },
    })
  })

  revalidatePath(`/applications/${applicationId}`)
}

// ── Import ────────────────────────────────────────────────────────────────────

export type ImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// `capabilities` is a relationship column (semicolon-joined capability names),
// not a custom field — exclude it from custom-field detection. #696 also
// consolidated this action onto the shared `@/lib/csv` parser (multi-line-cell
// support + delimiter sniffing), replacing the old line-based local parser.
const FIXED_COLUMNS = new Set(['name', 'description', 'vendor', 'version', 'hosting_model', 'lifecycle_status', 'status', 'visibility', 'capabilities'])
const VALID_LIFECYCLE = new Set(['active', 'sunset', 'decommissioned', 'planned'])
const VALID_STATUS = new Set(['draft', 'published', 'archived'])
const VALID_VISIBILITY = new Set(['org', 'connections', 'instance'])

export async function importApplications(formData: FormData, dryRun = false): Promise<ImportResult> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!

  const file = formData.get('csvFile') as File | null
  if (!file) return { created: 0, updated: 0, skipped: 0, errors: ['No file provided'] }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ['CSV has no data rows'] }

  const fieldDefs = await getCustomFieldSchema(orgId, 'application')
  const customFieldNames = new Set(fieldDefs.map(f => f.name))

  // Pre-fetch existing applications by name (upsert key) and the org's
  // capabilities for name → id relationship resolution. Both scoped to the
  // caller's org — cross-org capability references are not resolved, same rule
  // as the Capability import's persona handling (#696).
  const [existing, orgCapabilities] = await Promise.all([
    db.query.applications.findMany({
      where: eq(applications.organizationId, orgId),
      columns: { id: true, name: true },
    }),
    db.query.capabilities.findMany({
      where: eq(capabilities.organizationId, orgId),
      columns: { id: true, name: true },
    }),
  ])
  const existingByName = new Map(existing.map(a => [a.name.toLowerCase(), a.id]))
  const capabilityIdByName = new Map(orgCapabilities.map(c => [c.name.toLowerCase(), c.id]))

  let created = 0, updated = 0, skipped = 0
  const errors: string[] = []

  // Validate all rows up front so counters reflect a complete pass before opening a tx.
  type ValidRow = {
    name: string
    description: string | null
    vendor: string | null
    version: string | null
    hostingModel: string | null
    lifecycleStatus: 'active' | 'sunset' | 'decommissioned' | 'planned'
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    customData: Record<string, string>
    capabilityIds: string[]
    existingId: string | undefined
  }
  const validRows: ValidRow[] = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2 // 1-indexed, accounting for header row
    const name = row['name']?.trim()
    if (!name) { errors.push(`Row ${rowNum}: missing required field "name"`); skipped++; continue }

    const lifecycleStatus = (row['lifecycle_status'] || 'active').trim().toLowerCase()
    const status = (row['status'] || 'draft').trim().toLowerCase()
    const visibility = (row['visibility'] || 'org').trim().toLowerCase()

    if (!VALID_LIFECYCLE.has(lifecycleStatus)) {
      errors.push(`Row ${rowNum}: invalid lifecycle_status "${lifecycleStatus}"`)
      skipped++; continue
    }
    if (!VALID_STATUS.has(status)) {
      errors.push(`Row ${rowNum}: invalid status "${status}"`)
      skipped++; continue
    }
    if (!VALID_VISIBILITY.has(visibility)) {
      errors.push(`Row ${rowNum}: invalid visibility "${visibility}"`)
      skipped++; continue
    }

    const customData: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      if (!FIXED_COLUMNS.has(key) && customFieldNames.has(key) && val) {
        customData[key] = val
      }
    }

    // Resolve capability links by name — unknown names report as warnings, not
    // row failures. The application still imports; just without the bad links.
    const capabilityIds: string[] = []
    for (const capName of splitSemicolonList(row['capabilities'])) {
      const capId = capabilityIdByName.get(capName.toLowerCase())
      if (capId) capabilityIds.push(capId)
      else errors.push(`Row ${rowNum}: capability "${capName}" not found in this org — skipped`)
    }

    const existingId = existingByName.get(name.toLowerCase())
    if (existingId) updated++; else created++
    validRows.push({
      name,
      description: row['description'] || null,
      vendor: row['vendor'] || null,
      version: row['version'] || null,
      hostingModel: row['hosting_model'] || null,
      lifecycleStatus: lifecycleStatus as 'active' | 'sunset' | 'decommissioned' | 'planned',
      status: status as 'draft' | 'published' | 'archived',
      visibility: visibility as 'org' | 'connections' | 'instance',
      customData,
      capabilityIds: [...new Set(capabilityIds)],
      existingId,
    })
  }

  if (!dryRun && (created > 0 || updated > 0)) {
    await db.transaction(async (tx) => {
      for (const r of validRows) {
        let appId = r.existingId
        if (appId) {
          await tx.update(applications).set({
            description: r.description,
            vendor: r.vendor,
            version: r.version,
            hostingModel: r.hostingModel,
            lifecycleStatus: r.lifecycleStatus,
            status: r.status,
            visibility: r.visibility,
            customData: r.customData,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(and(eq(applications.id, appId), eq(applications.organizationId, orgId)))
          // Replace capability links wholesale — same semantics as editApplication.
          await tx.delete(applicationCapabilities).where(eq(applicationCapabilities.applicationId, appId))
        } else {
          const [inserted] = await tx.insert(applications).values({
            name: r.name,
            description: r.description,
            vendor: r.vendor,
            version: r.version,
            hostingModel: r.hostingModel,
            lifecycleStatus: r.lifecycleStatus,
            status: r.status,
            visibility: r.visibility,
            customData: r.customData,
            organizationId: orgId,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: applications.id })
          appId = inserted.id
        }
        if (r.capabilityIds.length > 0) {
          await tx.insert(applicationCapabilities).values(
            r.capabilityIds.map(capabilityId => ({ applicationId: appId!, capabilityId }))
          )
        }
      }

      await writeAuditLog(tx, {
        action: 'application.import',
        entityType: 'application',
        entityId: orgId,
        userId: session.user.id,
        organizationId: orgId,
        after: { created, updated, skipped, dryRun, errorCount: errors.length },
      })
    })
  }

  return { created, updated, skipped, errors }
}
