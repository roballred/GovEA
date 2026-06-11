import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { users, organizations, userOrganizationMemberships } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getUnlockedOrgIds } from '@/lib/break-glass'
import { InstanceUserTable, type MembershipRow } from './instance-user-table'

/**
 * Cross-tenant user-PII gating (#436). Instance admins see:
 *   - All platform admins (instanceRole = 'instance_admin'), regardless of
 *     org. Visible so platform-role management is possible without first
 *     elevating against every tenant.
 *   - Tenant users only for orgs the caller currently has an active,
 *     approved, non-expired break-glass session for.
 *
 * The `hiddenOrgCount` and `hiddenUserCount` props let the table render an
 * honest banner explaining what's been filtered, with a link to the orgs
 * list where break-glass is granted.
 */
export default async function InstanceUsersPage() {
  const session = await requireInstanceAdmin()

  const unlocked = await getUnlockedOrgIds(session.user.id)

  const [rows, orgRows, membershipRows] = await Promise.all([
    db
      .select({ user: users, org: organizations })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(desc(users.createdAt)),
    db.query.organizations.findMany({
      where: eq(organizations.isSystemOrg, false),
      columns: { id: true, name: true },
      orderBy: (org, { asc }) => [asc(org.name)],
    }),
    // #693 slice 4 — per-user org memberships for the cross-org management UI.
    db
      .select({
        userId: userOrganizationMemberships.userId,
        organizationId: userOrganizationMemberships.organizationId,
        role: userOrganizationMemberships.role,
        isActive: userOrganizationMemberships.isActive,
        isPrimary: userOrganizationMemberships.isPrimary,
        orgName: organizations.name,
      })
      .from(userOrganizationMemberships)
      .innerJoin(organizations, eq(organizations.id, userOrganizationMemberships.organizationId)),
  ])

  const membershipsByUser = new Map<string, MembershipRow[]>()
  for (const m of membershipRows) {
    const list = membershipsByUser.get(m.userId) ?? []
    list.push({
      organizationId: m.organizationId,
      orgName: m.orgName,
      role: m.role as MembershipRow['role'],
      isActive: m.isActive,
      isPrimary: m.isPrimary,
    })
    membershipsByUser.set(m.userId, list)
  }
  for (const list of membershipsByUser.values()) {
    list.sort((a, b) => a.orgName.localeCompare(b.orgName))
  }

  // Split visible vs hidden. Platform admins are always visible; tenant users
  // are visible only when their org is in the unlocked set.
  const visible: typeof rows = []
  const hiddenOrgIds = new Set<string>()
  let hiddenUserCount = 0
  for (const r of rows) {
    if (r.user.instanceRole === 'instance_admin') {
      visible.push(r)
      continue
    }
    const orgId = r.user.organizationId
    if (orgId && unlocked.has(orgId)) {
      visible.push(r)
    } else {
      hiddenUserCount++
      if (orgId) hiddenOrgIds.add(orgId)
    }
  }

  return (
    <InstanceUserTable
      currentUserId={session.user.id}
      organizations={orgRows}
      users={visible.map(({ user, org }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        instanceRole: user.instanceRole,
        isActive: user.isActive,
        organizationName: org?.name ?? null,
        memberships: membershipsByUser.get(user.id) ?? [],
      }))}
      hiddenUserCount={hiddenUserCount}
      hiddenOrgCount={hiddenOrgIds.size}
    />
  )
}
