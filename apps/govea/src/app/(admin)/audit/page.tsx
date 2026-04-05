import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/rbac'
import { db } from '@/db/client'
import { auditLog, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function AuditPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin((session.user as any))) redirect('/dashboard')

  const entries = await db
    .select({ log: auditLog, user: users })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(eq(auditLog.organizationId, session.user.organizationId!))
    .orderBy(desc(auditLog.createdAt))
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">A record of all actions taken in this organization.</p>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Performed by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ log, user: u }) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{log.createdAt.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-muted-foreground">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</TableCell>
                <TableCell className="text-muted-foreground">{u?.email ?? 'system'}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No audit entries yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
