import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/rbac'
import { db } from '@/db/client'
import { auditLog, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['When', 'Action', 'Entity', 'Performed by'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {entries.map(({ log, user: u }) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{log.action}</td>
                <td className="px-4 py-3 text-gray-600">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</td>
                <td className="px-4 py-3 text-gray-600">{u?.email ?? 'system'}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No audit entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
