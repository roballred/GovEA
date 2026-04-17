import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Server-only helper: returns the current org's enabledModules record.
 * Absent key → module is on (same semantics as isModuleEnabled).
 * Safe to call from any server component or server action.
 */
export async function getEnabledModules(): Promise<Record<string, boolean>> {
  const session = await auth()
  if (!session?.user?.organizationId) return {}
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.user.organizationId),
    columns: { enabledModules: true },
  })
  return org?.enabledModules ?? {}
}
