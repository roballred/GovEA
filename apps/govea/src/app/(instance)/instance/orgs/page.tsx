import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, organizationSettings, users } from '@/db/schema'
import { count, eq, desc } from 'drizzle-orm'
import { InstanceOrgsTable } from './instance-orgs-table'

export default async function InstanceOrgsPage() {
  await requireInstanceAdmin()

  const rows = await db
    .select({
      org: organizations,
      settings: organizationSettings,
      userCount: count(users.id),
    })
    .from(organizations)
    .leftJoin(organizationSettings, eq(organizationSettings.organizationId, organizations.id))
    .leftJoin(users, eq(users.organizationId, organizations.id))
    .groupBy(organizations.id, organizationSettings.organizationId)
    .orderBy(desc(organizations.createdAt))

  return (
    <InstanceOrgsTable
      orgs={rows.map(({ org, settings, userCount }) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        userCount,
        createdAt: org.createdAt,
        suspendedAt: settings?.suspendedAt ?? null,
        isSystemOrg: settings?.isSystemOrg ?? false,
        supportTier: settings?.supportTier ?? null,
      }))}
    />
  )
}
