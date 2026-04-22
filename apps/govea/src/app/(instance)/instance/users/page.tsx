import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { users, organizations } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmWithReason } from '@/components/confirm-with-reason'
import { promoteInstanceAdmin, demoteInstanceAdmin } from '@/actions/instance'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function InstanceUsersPage() {
  const session = await requireInstanceAdmin()

  const rows = await db
    .select({ user: users, org: organizations })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .orderBy(desc(users.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">All users across all tenant organisations.</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Platform role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ user: u, org }) => {
              const isMe = u.id === session.user.id
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{org?.name ?? '—'}</TableCell>
                  <TableCell><span className="capitalize text-sm">{u.role}</span></TableCell>
                  <TableCell>
                    {u.instanceRole === 'instance_admin' ? (
                      <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 dark:bg-violet-950 dark:border-violet-700 px-1.5 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-300">
                        platform admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      u.isActive === 'true'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {u.isActive === 'true' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isMe && (
                      u.instanceRole === 'instance_admin' ? (
                        <ConfirmWithReason
                          trigger={<Button variant="outline" size="sm">Demote</Button>}
                          title={`Demote "${u.name ?? u.email}"`}
                          description="This will remove platform admin access. Enter a reason for the audit log."
                          confirmLabel="Remove Platform Access"
                          destructive
                          onConfirm={async (reason) => {
                            'use server'
                            void reason
                            await demoteInstanceAdmin(u.id)
                          }}
                        />
                      ) : (
                        <ConfirmWithReason
                          trigger={<Button variant="outline" size="sm">Promote</Button>}
                          title={`Promote "${u.name ?? u.email}"`}
                          description="This will grant platform admin access across all organisations. Enter a reason for the audit log."
                          confirmLabel="Grant Platform Access"
                          onConfirm={async (reason) => {
                            'use server'
                            void reason
                            await promoteInstanceAdmin(u.id)
                          }}
                        />
                      )
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
