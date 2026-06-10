import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { escapeCsv } from '@/lib/csv'
import { getFailedLoginEvents, getPlatformAuditEvents } from '@/lib/audit-view'

/**
 * Instance audit telemetry CSV export — #720. Instance-admin only; spans all
 * orgs (instance security review). No secrets exported — only derived IP, user
 * agent, and safe categorical fields.
 *
 * Two scopes via the `scope` query param:
 *   - default / `failed-logins` — failed-login events (email, ip, user_agent, reason)
 *   - `platform` — platform-administration events (action, entity, actor, ip, user_agent)
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!isInstanceAdmin(session.user)) return new Response('Forbidden', { status: 403 })

  const scope = new URL(req.url).searchParams.get('scope')
  const date = new Date().toISOString().slice(0, 10)

  if (scope === 'platform') {
    const events = await getPlatformAuditEvents({ sinceDays: 30 })
    const headers = ['when', 'action', 'entity_type', 'entity_id', 'actor_email', 'ip', 'user_agent']
    const lines = events.map(e => [
      e.createdAt.toISOString(),
      e.action,
      e.entityType ?? '',
      e.entityId ?? '',
      e.actorEmail ?? '',
      e.ip ?? '',
      e.userAgent ?? '',
    ].map(escapeCsv).join(','))
    const csv = [headers.map(escapeCsv).join(','), ...lines].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="platform-events-${date}.csv"`,
      },
    })
  }

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

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="failed-logins-${date}.csv"`,
    },
  })
}
