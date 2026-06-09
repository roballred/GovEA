import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { escapeCsv } from '@/lib/csv'
import { getFailedLoginEvents } from '@/lib/audit-view'

/**
 * Failed-login telemetry CSV export — #720 slice 3. Instance-admin only; spans
 * all orgs (instance security review). Includes the slice-1 telemetry fields
 * (ip, user_agent, reason) on each failed-login event. No secrets exported.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!isInstanceAdmin(session.user)) return new Response('Forbidden', { status: 403 })

  const events = await getFailedLoginEvents({ sinceDays: 30 })

  const headers = ['when', 'action', 'email', 'ip', 'user_agent', 'reason', 'organization_id']
  const lines = events.map(e => [
    e.createdAt.toISOString(),
    e.action,
    e.email ?? '',
    e.ip ?? '',
    e.userAgent ?? '',
    e.reason ?? '',
    e.organizationId ?? '',
  ].map(escapeCsv).join(','))
  const csv = [headers.map(escapeCsv).join(','), ...lines].join('\n')

  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="failed-logins-${date}.csv"`,
    },
  })
}
