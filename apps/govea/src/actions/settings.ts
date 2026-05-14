'use server'

import { db } from '@/db/client'
import { organizations, type ConfidenceSettings, type CompletenessSettings, DEFAULT_COMPLETENESS_SETTINGS } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { themes } from '@/lib/themes'
import { MODULE_DEFS, type ModuleKey, type ModuleGroup } from '@/lib/modules'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateOrgTheme(themeId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  const orgId = session.user.organizationId!

  // Validate theme ID
  const valid = themes.find(t => t.id === themeId)
  if (!valid) throw new Error('Invalid theme')

  const before = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  })

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ theme: themeId, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'settings.theme_changed',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      before: { theme: before?.theme },
      after: { theme: themeId },
    })
  })

  revalidatePath('/', 'layout')
}

/**
 * Toggles a single module on or off for the current org.
 * Absent key = on, so we only store explicit `false` values.
 */
export async function setModuleEnabled(key: ModuleKey, enabled: boolean) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  // Validate key against known modules
  if (!MODULE_DEFS.find(m => m.key === key)) throw new Error('Unknown module')

  const orgId = session.user.organizationId!

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  })

  const before = org?.enabledModules ?? {}
  const after = { ...before, [key]: enabled }

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ enabledModules: after, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'settings.module_toggled',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      before: { [key]: before[key] ?? true },
      after: { [key]: enabled },
    })
  })

  revalidatePath('/', 'layout')
}

export async function setGroupModulesEnabled(group: ModuleGroup, enabled: boolean) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  const keys = MODULE_DEFS.filter(m => m.group === group && m.href !== null).map(m => m.key)
  if (keys.length === 0) throw new Error('Unknown group')

  const orgId = session.user.organizationId!
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
  const before = org?.enabledModules ?? {}
  const after = { ...before }
  for (const key of keys) after[key] = enabled

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ enabledModules: after, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'settings.group_toggled',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      before: Object.fromEntries(keys.map(k => [k, before[k] ?? true])),
      after: Object.fromEntries(keys.map(k => [k, enabled])),
    })
  })

  revalidatePath('/', 'layout')
}

export async function updateConfidenceSettings(input: ConfidenceSettings) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  const { enabled, narrative, suppressBelowPercent, authenticatedVisibility, publicVisibility } = input

  if (suppressBelowPercent < 0 || suppressBelowPercent > 100) {
    throw new Error('suppressBelowPercent must be between 0 and 100')
  }

  const orgId = session.user.organizationId!

  const before = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { confidenceSettings: true },
  })

  // Resolve `enabled` for back-compat: if the form submits new visibility
  // fields, derive `enabled` from `authenticatedVisibility`. Otherwise honor
  // whatever the form provided.
  const resolvedAuthVis = authenticatedVisibility ?? enabled
  const resolvedPubVis = publicVisibility ?? false

  const next: ConfidenceSettings = {
    enabled: resolvedAuthVis,
    narrative: narrative?.trim() || null,
    suppressBelowPercent,
    authenticatedVisibility: resolvedAuthVis,
    publicVisibility: resolvedPubVis,
  }

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ confidenceSettings: next, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'settings.confidence_updated',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      before: { confidenceSettings: before?.confidenceSettings },
      after: { confidenceSettings: next },
    })
  })

  revalidatePath('/', 'layout')
}

export async function updateCompletenessSettings(input: Partial<CompletenessSettings>) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  const orgId = session.user.organizationId!

  const before = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { completenessSettings: true },
  })
  const current = before?.completenessSettings ?? DEFAULT_COMPLETENESS_SETTINGS

  const stalenessDays = input.stalenessDays ?? current.stalenessDays
  if (![3 * 30, 6 * 30, 12 * 30, 24 * 30, 90].includes(stalenessDays) && (stalenessDays < 30 || stalenessDays > 730)) {
    throw new Error('stalenessDays must be between 30 and 730')
  }

  const domainTargets = input.domainTargets ?? current.domainTargets
  for (const [domain, target] of Object.entries(domainTargets)) {
    if (typeof target !== 'number' || target < 0 || target > 100) {
      throw new Error(`domainTargets[${domain}] must be 0–100`)
    }
  }

  const rankingWeights = input.rankingWeights ?? current.rankingWeights

  const next: CompletenessSettings = {
    stalenessDays,
    domainTargets,
    rankingWeights,
  }

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ completenessSettings: next, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    await writeAuditLog(tx, {
      action: 'settings.completeness_updated',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      before: { completenessSettings: before?.completenessSettings },
      after: { completenessSettings: next },
    })
  })

  revalidatePath('/dashboard')
  revalidatePath('/settings')
}
