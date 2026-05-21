'use server'

/**
 * Lightweight org-user lookup callable by any signed-in user (#581).
 *
 * Used by the domain-owner picker on capability/application/ADR edit forms.
 * `getUsers()` (in actions/users.ts) is admin-only because it backs the user
 * management page — we need a non-admin variant that returns just the
 * fields a picker needs.
 *
 * Returns active users in the caller's org, sorted by name. Inactive users
 * are filtered out so a deactivated employee can't be silently picked as a
 * new domain owner.
 */
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export type OrgUserPickerRow = {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'contributor' | 'viewer'
}

export async function getOrgUsersForPicker(): Promise<OrgUserPickerRow[]> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId
  if (!orgId) return []

  return db.query.users.findMany({
    where: and(eq(users.organizationId, orgId), eq(users.isActive, 'true')),
    columns: { id: true, name: true, email: true, role: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  })
}
