import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users } from '@/db/schema'
import { count, eq, desc } from 'drizzle-orm'
import { InstanceOrgsTable } from './instance-orgs-table'

export default async function InstanceOrgsPage() {
  await requireInstanceAdmin()

  const rows = await db
    .select({
      org: organizations,
      userCount: count(users.id),
    })
    .from(organizations)
    .leftJoin(users, eq(users.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(desc(organizations.createdAt))

  return (
    <InstanceOrgsTable
      orgs={rows.map(({ org, userCount }) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        userCount,
        createdAt: org.createdAt,
        suspendedAt: org.suspendedAt,
        isSystemOrg: org.isSystemOrg,
        supportTier: org.supportTier,
      }))}
    />
  )
}
