'use server'

import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { themes } from '@/lib/themes'
import { MODULE_DEFS, type ModuleKey } from '@/lib/modules'
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

  await db.update(organizations)
    .set({ theme: themeId, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  await writeAuditLog({
    action: 'settings.theme_changed',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: orgId,
    before: { theme: before?.theme },
    after: { theme: themeId },
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

  await db.update(organizations)
    .set({ enabledModules: after, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  await writeAuditLog({
    action: 'settings.module_toggled',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: orgId,
    before: { [key]: before[key] ?? true },
    after: { [key]: enabled },
  })

  revalidatePath('/', 'layout')
}
