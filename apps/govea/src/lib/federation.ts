import { db } from '@/db/client'
import { orgConnections } from '@/db/schema'

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
