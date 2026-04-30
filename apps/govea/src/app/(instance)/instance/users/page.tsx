import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { users, organizations } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { InstanceUserTable } from './instance-user-table'

export default async function InstanceUsersPage() {
  const session = await requireInstanceAdmin()

  const [rows, orgRows] = await Promise.all([
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
  ])

  return (
    <InstanceUserTable
      currentUserId={session.user.id}
      organizations={orgRows}
      users={rows.map(({ user, org }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        instanceRole: user.instanceRole,
        isActive: user.isActive,
        organizationName: org?.name ?? null,
      }))}
    />
  )
}
