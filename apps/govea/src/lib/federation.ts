import { db } from '@/db/client'

/**
 * Throws if the entity's org doesn't match the caller's org.
 * Use before any write to content fetched without an org filter.
 */
export function assertOwnership(
  entityOrgId: string | null | undefined,
  callerOrgId: string,
): void {
  if (!entityOrgId || entityOrgId !== callerOrgId) {
    throw new Error('Forbidden: content owned by another organization')
  }
}

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
