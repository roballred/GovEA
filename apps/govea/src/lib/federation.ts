import { db } from '@/db/client'

export async function getConnectedOrgIds(organizationId: string): Promise<string[]> {
  const connections = await db.query.orgConnections.findMany({
    where: (oc, { and, or, eq }) => and(
      or(eq(oc.fromOrgId, organizationId), eq(oc.toOrgId, organizationId)),
      eq(oc.status, 'active')
    ),
  })
  return connections.map(c =>
    c.fromOrgId === organizationId ? c.toOrgId : c.fromOrgId
  )
}

/**
 * Asserts that the entity's owning org matches the calling user's org.
 * Throws if the entity is missing or owned by a different organization.
 * Call this before any mutation to enforce cross-org write protection.
 */
export function assertOwnership(
  entityOrgId: string | null | undefined,
  callerOrgId: string,
): void {
  if (!entityOrgId || entityOrgId !== callerOrgId) {
    throw new Error('Forbidden: content owned by another organization')
  }
}
