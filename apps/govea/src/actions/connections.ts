'use server'

import { db } from '@/db/client'
import { orgConnections, organizations } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { removeLinksForConnection } from '@/lib/cross-org-link-helpers'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export async function getConnections() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  return db.query.orgConnections.findMany({
    where: or(eq(orgConnections.fromOrgId, orgId), eq(orgConnections.toOrgId, orgId)),
  })
}

// All tenants on the instance except the caller's own org. Used for the connection-target picker.
// Restricted to admins because non-admins do not need to discover other tenants on the instance.
// System orgs are excluded — they're a platform-administration construct, not a tenant, and a
// "connection" request to the system org would be malformed (#542).
export async function getOtherOrganizations() {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  return db.query.organizations.findMany({
    where: (o, { and, ne, eq }) => and(ne(o.id, orgId), eq(o.isSystemOrg, false)),
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

  await db.transaction(async (tx) => {
    const [connection] = await tx.insert(orgConnections).values({
      fromOrgId: orgId,
      toOrgId: targetOrgId,
      status: 'pending',
      createdBy: session.user.id,
    }).returning()

    await writeAuditLog(tx, {
      action: 'connection.request',
      entityType: 'org_connection',
      entityId: connection.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { targetOrgId },
    })
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

  await db.transaction(async (tx) => {
    await tx.update(orgConnections).set({ status: 'active', updatedAt: new Date() })
      .where(eq(orgConnections.id, connectionId))

    await writeAuditLog(tx, {
      action: 'connection.accept',
      entityType: 'org_connection',
      entityId: connectionId,
      userId: session.user.id,
      organizationId: orgId,
    })
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

  await db.transaction(async (tx) => {
    await tx.update(orgConnections).set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(orgConnections.id, connectionId))

    await writeAuditLog(tx, {
      action: 'connection.reject',
      entityType: 'org_connection',
      entityId: connectionId,
      userId: session.user.id,
      organizationId: orgId,
    })
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

  await db.transaction(async (tx) => {
    await removeLinksForConnection(tx, connection.fromOrgId, connection.toOrgId, session.user.id, orgId)
    await tx.delete(orgConnections).where(eq(orgConnections.id, connectionId))

    await writeAuditLog(tx, {
      action: 'connection.remove',
      entityType: 'org_connection',
      entityId: connectionId,
      userId: session.user.id,
      organizationId: orgId,
    })
  })
}
