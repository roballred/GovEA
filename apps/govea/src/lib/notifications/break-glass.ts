import type { BreakGlassSession } from '@/db/schema'

export type BreakGlassEvent = 'grant' | 'approval' | 'revoke'

export interface BreakGlassNotification {
  event: BreakGlassEvent
  session: Pick<BreakGlassSession,
    | 'id'
    | 'instanceAdminId'
    | 'targetOrgId'
    | 'reason'
    | 'grantedAt'
    | 'expiresAt'
    | 'requiresApproval'
    | 'approvedAt'
    | 'approvedBy'
  >
  actorUserId: string
}

type Sink = (n: BreakGlassNotification) => void | Promise<void>

let sink: Sink = defaultSink

export function setBreakGlassNotificationSink(next: Sink) {
  sink = next
}

export function resetBreakGlassNotificationSink() {
  sink = defaultSink
}

export async function notifyBreakGlassEvent(n: BreakGlassNotification): Promise<void> {
  try {
    await sink(n)
  } catch {
    // Notification failures must not roll back the surrounding transaction.
    // The audit log is the durable record; the notification is best-effort.
  }
}

function defaultSink(n: BreakGlassNotification): void {
  const banner = '⚠️  BREAK-GLASS'
  const lines = [
    `${banner} ${n.event.toUpperCase()}`,
    `  session=${n.session.id}`,
    `  actor=${n.actorUserId}`,
    `  granter=${n.session.instanceAdminId}`,
    `  targetOrg=${n.session.targetOrgId}`,
    `  expiresAt=${n.session.expiresAt.toISOString()}`,
    `  requiresApproval=${n.session.requiresApproval}`,
    `  approvedAt=${n.session.approvedAt?.toISOString() ?? '-'}`,
    `  reason=${JSON.stringify(n.session.reason)}`,
  ]
  console.warn(lines.join('\n'))
}
