import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { organizations, users } from '@/db/schema'
import { count, eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
        <p className="text-muted-foreground mt-1">All tenant organisations registered on this instance.</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ org, userCount }) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={`/instance/orgs/${org.id}`}
                    className="font-medium hover:underline"
                  >
                    {org.name}
                  </Link>
                  {org.isSystemOrg && (
                    <span className="ml-2 text-xs text-muted-foreground">(system)</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{org.slug}</TableCell>
                <TableCell>{userCount}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {org.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    org.suspendedAt
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  )}>
                    {org.suspendedAt ? 'Suspended' : 'Active'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No organisations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
