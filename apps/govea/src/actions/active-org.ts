'use server'

import { db } from '@/db/client'
import { users, userOrganizationMemberships, organizations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
import type { Role } from '@/lib/rbac'

export interface MyOrganization {
  organizationId: string
  name: string
  role: Role
  isCurrent: boolean
}

/**
 * Lists the caller's active organization memberships (with org name + the role
 * they hold there), flagging the currently-active one. Drives the org switcher
 * (#693 slice 3b). Returns [] for an unauthenticated caller.
 */
export async function getMyActiveOrganizations(): Promise<MyOrganization[]> {
  const session = await auth()
  if (!session?.user) return []
  const currentOrgId = session.user.organizationId

  const rows = await db
    .select({
      organizationId: userOrganizationMemberships.organizationId,
      role: userOrganizationMemberships.role,
      name: organizations.name,
    })
    .from(userOrganizationMemberships)
    .innerJoin(organizations, eq(organizations.id, userOrganizationMemberships.organizationId))
    .where(and(
      eq(userOrganizationMemberships.userId, session.user.id),
      eq(userOrganizationMemberships.isActive, true),
    ))

  return rows
    .map(r => ({
      organizationId: r.organizationId,
      name: r.name,
      role: r.role as Role,
      isCurrent: r.organizationId === currentOrgId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Switches the caller's active organization, persisting it as
 * `users.last_active_organization_id`. #693 slice 3a.
 *
 * Server-authoritative: succeeds only if the caller has an *active* membership
 * in the target org — the client's claim is never trusted. After this resolves,
 * the client calls the NextAuth session `update()` so the JWT re-resolves the
 * active org/role (see the `trigger === 'update'` branch in lib/auth.ts).
 */
export async function switchActiveOrganization(organizationId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id

  const [membership] = await db
    .select({ id: userOrganizationMemberships.id })
    .from(userOrganizationMemberships)
    .where(and(
      eq(userOrganizationMemberships.userId, userId),
      eq(userOrganizationMemberships.organizationId, organizationId),
      eq(userOrganizationMemberships.isActive, true),
    ))
    .limit(1)

  if (!membership) {
    throw new Error('You are not an active member of that organization.')
  }

  const from = session.user.organizationId ?? null

  await db.update(users)
    .set({ lastActiveOrganizationId: organizationId, updatedAt: new Date() })
    .where(eq(users.id, userId))

  await writeAuditLog(db, {
    action: 'auth.switch_active_org',
    entityType: 'user',
    entityId: userId,
    userId,
    organizationId,
    metadata: { from, to: organizationId },
  })
}
