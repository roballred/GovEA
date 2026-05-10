'use server'

import { db } from '@/db/client'
import {
  architectureDebtItems,
  debtApplications, debtCapabilities, debtAdrs, debtInitiatives,
  type DebtType, type DebtSeverity, type DebtStatus,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { canEdit, isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { canReadFederatedEntity } from '@/lib/federation'
import { detectSecuritySensitive } from '@/lib/debt-classification'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Auth gates ──────────────────────────────────────────────────────────────

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

// ── Form input parsing ──────────────────────────────────────────────────────

interface DebtFormInput {
  title: string
  description: string | null
  debtType: DebtType
  severity: DebtSeverity
  status: DebtStatus
  visibility: 'org' | 'connections' | 'instance'
  targetResolutionDate: string | null
  acceptanceRationale: string | null
  /** Caller's explicit security_sensitive choice. Auto-detection may upgrade
   *  this to true; the caller can downgrade only via overrideSecuritySensitive. */
  securitySensitive: boolean
  /** When true, the caller is explicitly downgrading from auto-flagged true → false.
   *  Recorded in the audit trail. */
  overrideSecuritySensitive: boolean
  applicationIds: string[]
  capabilityIds: string[]
  adrIds: string[]
  initiativeIds: string[]
}

function parseFormInput(formData: FormData): DebtFormInput {
  const ids = (key: string) =>
    (formData.getAll(key) as string[]).filter(v => typeof v === 'string' && v.length > 0)

  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: ((formData.get('description') as string) ?? '').trim() || null,
    debtType: formData.get('debtType') as DebtType,
    severity: formData.get('severity') as DebtSeverity,
    status: (formData.get('status') as DebtStatus) ?? 'draft',
    visibility: (formData.get('visibility') as 'org' | 'connections' | 'instance') ?? 'org',
    targetResolutionDate: ((formData.get('targetResolutionDate') as string) ?? '').trim() || null,
    acceptanceRationale: ((formData.get('acceptanceRationale') as string) ?? '').trim() || null,
    securitySensitive: formData.get('securitySensitive') === 'on',
    overrideSecuritySensitive: formData.get('overrideSecuritySensitive') === 'on',
    applicationIds: ids('applicationIds'),
    capabilityIds: ids('capabilityIds'),
    adrIds: ids('adrIds'),
    initiativeIds: ids('initiativeIds'),
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

class DebtValidationError extends Error {}

function validate(input: DebtFormInput): void {
  if (!input.title) throw new DebtValidationError('Title is required')
  if (!input.debtType) throw new DebtValidationError('Debt type is required')
  if (!input.severity) throw new DebtValidationError('Severity is required')

  // Spec: "Resolving a debt item requires linking it to an initiative or
  // explicitly marking it `accepted` with rationale".
  if (input.status === 'accepted' && !input.acceptanceRationale) {
    throw new DebtValidationError('Acceptance rationale is required when status is accepted')
  }

  // Spec: "Debt items must be linked to at least one architecture object".
  const totalLinks =
    input.applicationIds.length +
    input.capabilityIds.length +
    input.adrIds.length +
    input.initiativeIds.length
  if (totalLinks === 0) {
    throw new DebtValidationError('Debt item must be linked to at least one architecture object')
  }
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * List debt items for the caller's org, federated reads included where
 * visibility allows. Security-sensitive items are filtered out for viewers
 * regardless of status.
 */
export async function getDebtItems(filters?: {
  status?: DebtStatus
  severity?: DebtSeverity
  type?: DebtType
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!
  const role = session.user.role

  // Conservative: viewers only see published items; contributors+admins see all states.
  const viewerStatuses: DebtStatus[] = ['published']
  const allStatuses: DebtStatus[] = ['draft', 'published', 'in-progress', 'resolved', 'accepted', 'archived']

  const conditions = [eq(architectureDebtItems.organizationId, orgId)]
  if (filters?.status) conditions.push(eq(architectureDebtItems.status, filters.status))
  if (filters?.severity) conditions.push(eq(architectureDebtItems.severity, filters.severity))
  if (filters?.type) conditions.push(eq(architectureDebtItems.debtType, filters.type))

  const rows = await db
    .select()
    .from(architectureDebtItems)
    .where(and(...conditions))
    .orderBy(architectureDebtItems.createdAt)

  return rows.filter(r => {
    // Viewer can only see published items
    if (role === 'viewer' && !viewerStatuses.includes(r.status)) return false
    // Spec: security_sensitive items are restricted to Admin + Contributor regardless of status
    if (r.securitySensitive && role === 'viewer') return false
    // Honor allStatuses just in case the enum drifts (defensive)
    if (!allStatuses.includes(r.status)) return false
    return true
  })
}

export async function getDebtItem(id: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const item = await db.query.architectureDebtItems.findFirst({
    where: eq(architectureDebtItems.id, id),
  })
  if (!item) return null

  // Federation read gate
  const visible = await canReadFederatedEntity(
    item.organizationId,
    item.visibility,
    session.user.organizationId!,
  )
  if (!visible) return null

  // Viewers: only see published items
  if (session.user.role === 'viewer' && item.status !== 'published') return null

  // Security-sensitive items are restricted to Admin + Contributor (spec §Rules)
  if (item.securitySensitive && session.user.role === 'viewer') return null

  // Resolve link IDs (kept as a single round-trip; UI will hydrate names)
  const [appLinks, capLinks, adrLinks, initLinks] = await Promise.all([
    db.select({ id: debtApplications.applicationId }).from(debtApplications).where(eq(debtApplications.debtItemId, id)),
    db.select({ id: debtCapabilities.capabilityId }).from(debtCapabilities).where(eq(debtCapabilities.debtItemId, id)),
    db.select({ id: debtAdrs.adrId }).from(debtAdrs).where(eq(debtAdrs.debtItemId, id)),
    db.select({ id: debtInitiatives.initiativeId }).from(debtInitiatives).where(eq(debtInitiatives.debtItemId, id)),
  ])

  return {
    ...item,
    applicationIds: appLinks.map(r => r.id),
    capabilityIds: capLinks.map(r => r.id),
    adrIds: adrLinks.map(r => r.id),
    initiativeIds: initLinks.map(r => r.id),
  }
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function createDebtItem(formData: FormData): Promise<string> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseFormInput(formData)
  validate(input)

  const detected = detectSecuritySensitive(input)
  // Security gating per spec: detection cannot be silently overridden.
  // If the caller said `false` but detection says `true`, the user must
  // tick `overrideSecuritySensitive` explicitly. Otherwise we save as true.
  let securitySensitive = input.securitySensitive
  let overrideRecorded = false
  if (detected && !input.securitySensitive) {
    if (input.overrideSecuritySensitive) {
      // explicit downgrade — keep false but record the override
      securitySensitive = false
      overrideRecorded = true
    } else {
      // No override granted — auto-flag wins
      securitySensitive = true
    }
  }

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(architectureDebtItems).values({
      organizationId: orgId,
      title: input.title,
      description: input.description,
      debtType: input.debtType,
      severity: input.severity,
      status: input.status,
      securitySensitive,
      targetResolutionDate: input.targetResolutionDate,
      acceptanceRationale: input.acceptanceRationale,
      visibility: input.visibility,
      source: 'human',
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning({ id: architectureDebtItems.id })

    if (input.applicationIds.length) {
      await tx.insert(debtApplications).values(
        input.applicationIds.map(applicationId => ({ debtItemId: row.id, applicationId })),
      )
    }
    if (input.capabilityIds.length) {
      await tx.insert(debtCapabilities).values(
        input.capabilityIds.map(capabilityId => ({ debtItemId: row.id, capabilityId })),
      )
    }
    if (input.adrIds.length) {
      await tx.insert(debtAdrs).values(
        input.adrIds.map(adrId => ({ debtItemId: row.id, adrId })),
      )
    }
    if (input.initiativeIds.length) {
      await tx.insert(debtInitiatives).values(
        input.initiativeIds.map(initiativeId => ({ debtItemId: row.id, initiativeId })),
      )
    }

    await writeAuditLog(tx, {
      action: 'debt.create',
      entityType: 'architecture_debt_item',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: {
        title: input.title,
        debtType: input.debtType,
        severity: input.severity,
        status: input.status,
        securitySensitive,
        autoDetectedSensitive: detected,
        overrideApplied: overrideRecorded,
      },
    })

    if (overrideRecorded) {
      await writeAuditLog(tx, {
        action: 'debt.security_classification_override',
        entityType: 'architecture_debt_item',
        entityId: row.id,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { from: 'auto-flagged-true', to: 'human-set-false', debtType: input.debtType },
      })
    }

    return row.id
  })

  revalidatePath('/debt')
  return id
}

export async function editDebtItem(debtItemId: string, formData: FormData): Promise<void> {
  const session = await requireContributor()
  const orgId = session.user.organizationId!
  const input = parseFormInput(formData)
  validate(input)

  const before = await db.query.architectureDebtItems.findFirst({
    where: and(
      eq(architectureDebtItems.id, debtItemId),
      eq(architectureDebtItems.organizationId, orgId),
    ),
  })
  if (!before) throw new Error('Not found')

  const detected = detectSecuritySensitive(input)
  let securitySensitive = input.securitySensitive
  let overrideRecorded = false
  if (detected && !input.securitySensitive) {
    if (input.overrideSecuritySensitive) {
      securitySensitive = false
      overrideRecorded = true
    } else {
      securitySensitive = true
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(architectureDebtItems).set({
      title: input.title,
      description: input.description,
      debtType: input.debtType,
      severity: input.severity,
      status: input.status,
      securitySensitive,
      targetResolutionDate: input.targetResolutionDate,
      acceptanceRationale: input.acceptanceRationale,
      visibility: input.visibility,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).where(eq(architectureDebtItems.id, debtItemId))

    // Replace junction sets — simple semantics, one PR-1 round-trip per type.
    await tx.delete(debtApplications).where(eq(debtApplications.debtItemId, debtItemId))
    await tx.delete(debtCapabilities).where(eq(debtCapabilities.debtItemId, debtItemId))
    await tx.delete(debtAdrs).where(eq(debtAdrs.debtItemId, debtItemId))
    await tx.delete(debtInitiatives).where(eq(debtInitiatives.debtItemId, debtItemId))

    if (input.applicationIds.length) {
      await tx.insert(debtApplications).values(input.applicationIds.map(applicationId => ({ debtItemId, applicationId })))
    }
    if (input.capabilityIds.length) {
      await tx.insert(debtCapabilities).values(input.capabilityIds.map(capabilityId => ({ debtItemId, capabilityId })))
    }
    if (input.adrIds.length) {
      await tx.insert(debtAdrs).values(input.adrIds.map(adrId => ({ debtItemId, adrId })))
    }
    if (input.initiativeIds.length) {
      await tx.insert(debtInitiatives).values(input.initiativeIds.map(initiativeId => ({ debtItemId, initiativeId })))
    }

    await writeAuditLog(tx, {
      action: 'debt.update',
      entityType: 'architecture_debt_item',
      entityId: debtItemId,
      userId: session.user.id,
      organizationId: orgId,
      before: {
        title: before.title, status: before.status, severity: before.severity, securitySensitive: before.securitySensitive,
      },
      after: {
        title: input.title, status: input.status, severity: input.severity, securitySensitive,
        autoDetectedSensitive: detected, overrideApplied: overrideRecorded,
      },
    })

    if (overrideRecorded) {
      await writeAuditLog(tx, {
        action: 'debt.security_classification_override',
        entityType: 'architecture_debt_item',
        entityId: debtItemId,
        userId: session.user.id,
        organizationId: orgId,
        metadata: { from: 'auto-flagged-true', to: 'human-set-false', debtType: input.debtType },
      })
    }
  })

  revalidatePath(`/debt/${debtItemId}`)
  revalidatePath('/debt')
}

export async function deleteDebtItem(debtItemId: string): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.architectureDebtItems.findFirst({
    where: and(
      eq(architectureDebtItems.id, debtItemId),
      eq(architectureDebtItems.organizationId, orgId),
    ),
  })
  if (!before) throw new Error('Not found')

  await db.transaction(async (tx) => {
    await tx.delete(architectureDebtItems).where(eq(architectureDebtItems.id, debtItemId))
    await writeAuditLog(tx, {
      action: 'debt.delete',
      entityType: 'architecture_debt_item',
      entityId: debtItemId,
      userId: session.user.id,
      organizationId: orgId,
      before: { title: before.title, status: before.status, severity: before.severity },
    })
  })

  revalidatePath('/debt')
}

