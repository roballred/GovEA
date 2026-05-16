import { getActiveOrgNotice } from '@/lib/admin-notices'
import type { AdminNotice, NoticeSeverity } from '@/db/schema'
import { DismissibleNotice } from './dismissible-notice'

const SEVERITY_STYLES: Record<NoticeSeverity, string> = {
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  critical: 'bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800',
}

const SEVERITY_LABELS: Record<NoticeSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
}

/**
 * Renders the active org-scoped notice for `orgId`, or nothing.
 *
 * - `critical` notices are pinned (no dismiss control).
 * - `info` / `warning` notices are wrapped in `<DismissibleNotice>` so users
 *   can hide them for the current session. Dismissal is keyed on the notice
 *   id + updatedAt — editing the notice yields a new key, so an updated
 *   notice reappears for a previously-dismissing user.
 */
export async function AdminNoticeBanner({ orgId }: { orgId: string }) {
  const notice = await getActiveOrgNotice(orgId)
  if (!notice) return null

  const severity = notice.severity as NoticeSeverity
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info
  const content = <NoticeBody notice={notice} severity={severity} styles={styles} />

  if (severity === 'critical') return content

  const dismissKey = `${notice.id}-${notice.updatedAt.getTime()}`
  return <DismissibleNotice dismissKey={dismissKey}>{content}</DismissibleNotice>
}

function NoticeBody({ notice, severity, styles }: { notice: AdminNotice; severity: NoticeSeverity; styles: string }) {
  return (
    <div className={`mb-4 rounded-md border px-4 py-3 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {SEVERITY_LABELS[severity]}
            </span>
            <h2 className="text-sm font-semibold">{notice.title}</h2>
          </div>
          <p className="text-sm whitespace-pre-line">{notice.body}</p>
          {notice.learnMoreUrl && (
            <a
              href={notice.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium underline"
            >
              Learn more →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
