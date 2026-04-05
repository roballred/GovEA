'use server'

import { db } from '@/db/client'
import { orgConnections, organizations } from '@/db/schema'
import { eq, or, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user as any)) throw new Error('Forbidden')
  return session
}

export async function getConnections(orgId: string) {
  return db.query.orgConnections.findMany({
    where: or(eq(orgConnections.fromOrgId, orgId), eq(orgConnections.toOrgId, orgId)),
  })
}

// All orgs on the instance except the current org
export async function getOtherOrganizations(orgId: string) {
  return db.query.organizations.findMany({
    where: ne(organizations.id, orgId),
    orderBy: (o, { asc }) => [asc(o.name)],
  })
}

export async function requestConnection(targetOrgId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  // Check for existing connection in either direction
  const existing = await db.query.orgConnections.findFirst({
    where: or(
      and(eq(orgConnections.fromOrgId, orgId), eq(orgConnections.toOrgId, targetOrgId)),
      and(eq(orgConnections.fromOrgId, targetOrgId), eq(orgConnections.toOrgId, orgId)),
    ),
  })
  if (existing) throw new Error('Connection already exists or is pending')

  const [connection] = await db.insert(orgConnections).values({
    fromOrgId: orgId,
    toOrgId: targetOrgId,
    status: 'pending',
    createdBy: session.user.id,
  }).returning()

  await writeAuditLog({
    action: 'connection.request',
    entityType: 'org_connection',
    entityId: connection.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { targetOrgId },
  })
}

export async function acceptConnection(connectionId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  // Only the target org can accept
  const connection = await db.query.orgConnections.findFirst({
    where: and(eq(orgConnections.id, connectionId), eq(orgConnections.toOrgId, orgId)),
  })
  if (!connection) throw new Error('Connection not found or not authorized')

  await db.update(orgConnections).set({ status: 'active', updatedAt: new Date() })
    .where(eq(orgConnections.id, connectionId))

  await writeAuditLog({
    action: 'connection.accept',
    entityType: 'org_connection',
    entityId: connectionId,
    userId: session.user.id,
    organizationId: orgId,
  })
}

export async function rejectConnection(connectionId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  // Only the target org can reject
  const connection = await db.query.orgConnections.findFirst({
    where: and(eq(orgConnections.id, connectionId), eq(orgConnections.toOrgId, orgId)),
  })
  if (!connection) throw new Error('Connection not found or not authorized')

  await db.update(orgConnections).set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(orgConnections.id, connectionId))

  await writeAuditLog({
    action: 'connection.reject',
    entityType: 'org_connection',
    entityId: connectionId,
    userId: session.user.id,
    organizationId: orgId,
  })
}

export async function removeConnection(connectionId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  // Either org can remove an active connection
  const connection = await db.query.orgConnections.findFirst({
    where: and(
      eq(orgConnections.id, connectionId),
      or(eq(orgConnections.fromOrgId, orgId), eq(orgConnections.toOrgId, orgId)),
    ),
  })
  if (!connection) throw new Error('Connection not found or not authorized')

  await db.delete(orgConnections).where(eq(orgConnections.id, connectionId))

  await writeAuditLog({
    action: 'connection.remove',
    entityType: 'org_connection',
    entityId: connectionId,
    userId: session.user.id,
    organizationId: orgId,
  })
}
