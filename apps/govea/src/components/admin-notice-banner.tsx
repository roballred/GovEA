import { getActiveOrgNotice, getActiveInstanceNotice } from '@/lib/admin-notices'
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

type NoticeScope = 'org' | 'instance'

/**
 * Renders the active org-scoped and instance-scoped notices for `orgId`, or
 * nothing if both are empty.
 *
 * Stacking order (top-down, per the design decisions on #456):
 *
 *   [Critical instance notice]
 *   [Critical org notice]
 *   [ActAsBanner]              ← rendered by the admin/instance layout, not here
 *   [Warning/info instance notice]
 *   [Warning/info org notice]
 *
 * The split puts criticals above the act-as banner because a critical
 * platform message should outrank "you are acting as X." Lower-severity
 * notices go below so the act-as context stays in view.
 *
 * Visual distinction:
 *   - Instance notices carry an "INSTANCE" tag (violet) so users can
 *     tell platform-wide messaging from org-wide messaging.
 *
 * Dismissal:
 *   - `critical` notices are pinned (no dismiss control).
 *   - `info` / `warning` are session-dismissible. Dismissal key includes
 *     the notice id + updatedAt, so an edited notice reappears.
 */
export async function AdminNoticeBanner({ orgId }: { orgId?: string | null }) {
  // Instance notice always fetched; org notice only if we have an org id.
  // The instance layout passes no orgId (instance admins operate platform-
  // scoped) so they still see instance notices without spurious org reads.
  const [instanceNotice, orgNotice] = await Promise.all([
    getActiveInstanceNotice(),
    orgId ? getActiveOrgNotice(orgId) : Promise.resolve(null),
  ])

  if (!instanceNotice && !orgNotice) return null

  return (
    <>
      {/* Criticals above the act-as banner */}
      {instanceNotice?.severity === 'critical' && (
        <NoticeRow notice={instanceNotice} scope="instance" />
      )}
      {orgNotice?.severity === 'critical' && (
        <NoticeRow notice={orgNotice} scope="org" />
      )}
      {/* Non-criticals below the act-as banner. The act-as banner itself is
          rendered in the layout above this component, not here, so we just
          stack the two halves in the correct order around it. */}
      {instanceNotice && instanceNotice.severity !== 'critical' && (
        <NoticeRow notice={instanceNotice} scope="instance" />
      )}
      {orgNotice && orgNotice.severity !== 'critical' && (
        <NoticeRow notice={orgNotice} scope="org" />
      )}
    </>
  )
}

/**
 * Internal helper: render a single notice row, wrapping in a dismiss control
 * unless it's critical (pinned).
 */
function NoticeRow({ notice, scope }: { notice: AdminNotice; scope: NoticeScope }) {
  const severity = notice.severity as NoticeSeverity
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info
  const content = <NoticeBody notice={notice} scope={scope} severity={severity} styles={styles} />

  if (severity === 'critical') return content

  // Scope is part of the dismiss key so a user dismissing an instance notice
  // doesn't accidentally hide an org notice with the same id (shouldn't
  // happen in practice but the discipline is cheap).
  const dismissKey = `${scope}-${notice.id}-${notice.updatedAt.getTime()}`
  return <DismissibleNotice dismissKey={dismissKey}>{content}</DismissibleNotice>
}

function NoticeBody({
  notice,
  scope,
  severity,
  styles,
}: {
  notice: AdminNotice
  scope: NoticeScope
  severity: NoticeSeverity
  styles: string
}) {
  return (
    <div className={`mb-4 rounded-md border px-4 py-3 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {scope === 'instance' && (
              <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Instance
              </span>
            )}
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
