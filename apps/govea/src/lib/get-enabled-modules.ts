import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { mergeModuleSettings, type ModuleStateMap } from '@/lib/modules'

/**
 * Server-only helper: returns the instance-wide disabled module map.
 */
export async function getInstanceDisabledModules(): Promise<ModuleStateMap> {
  const row = await db.query.instanceSettings.findFirst({
    columns: { disabledModules: true },
  })
  return row?.disabledModules ?? {}
}

/**
 * Server-only helper: returns current-org module settings split by scope.
 */
export async function getCurrentModuleSettings(): Promise<{
  orgEnabledModules: ModuleStateMap
  instanceDisabledModules: ModuleStateMap
  effectiveEnabledModules: ModuleStateMap
}> {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return {
      orgEnabledModules: {},
      instanceDisabledModules: await getInstanceDisabledModules(),
      effectiveEnabledModules: {},
    }
  }

  const [org, global] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, session.user.organizationId),
      columns: { enabledModules: true },
    }),
    getInstanceDisabledModules(),
  ])

  const orgEnabledModules = org?.enabledModules ?? {}
  return {
    orgEnabledModules,
    instanceDisabledModules: global,
    effectiveEnabledModules: mergeModuleSettings(orgEnabledModules, global),
  }
}

/**
 * Server-only helper: returns the current org's effective enabledModules
 * record after applying instance-wide disable overrides.
 */
export async function getEnabledModules(): Promise<ModuleStateMap> {
  const { effectiveEnabledModules } = await getCurrentModuleSettings()
  return effectiveEnabledModules
}
