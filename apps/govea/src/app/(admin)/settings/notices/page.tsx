import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { listOrgNotices } from '@/lib/admin-notices'
import { NOTICE_SEVERITIES, type NoticeSeverity } from '@/db/schema'
import {
  createOrgNoticeFromForm,
  deleteOrgNoticeFromForm,
  setOrgNoticeActiveFromForm,
} from '@/actions/admin-notices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const SEVERITY_PILL: Record<NoticeSeverity, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export default async function NoticesSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')
  if (!session.user.organizationId) redirect('/dashboard')

  const notices = await listOrgNotices(session.user.organizationId)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operational messages shown to everyone in your organization. Only one
          notice can be active at a time; activating a new one deactivates the
          previous.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">Create a new notice</h2>
        <form action={createOrgNoticeFromForm} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Scheduled maintenance Saturday"
            />
          </div>
          <div>
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              name="body"
              required
              maxLength={2000}
              rows={4}
              placeholder="Read-only mode from 22:00 to 23:00 UTC. Any in-flight edits will be discarded."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                name="severity"
                defaultValue="info"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {NOTICE_SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="learnMoreUrl">Learn more URL (optional)</Label>
              <Input
                id="learnMoreUrl"
                name="learnMoreUrl"
                type="url"
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activate" value="true" defaultChecked />
              Activate immediately
            </label>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">
          All notices <span className="text-muted-foreground font-normal text-sm">({notices.length})</span>
        </h2>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notices yet.</p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => {
              const severity = n.severity as NoticeSeverity
              return (
                <li
                  key={n.id}
                  className={cn(
                    'rounded-lg border bg-card p-4',
                    n.active && 'border-emerald-300 dark:border-emerald-800',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          SEVERITY_PILL[severity] ?? SEVERITY_PILL.info,
                        )}>
                          {severity}
                        </span>
                        {n.active && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                            Active
                          </span>
                        )}
                        <span className="text-sm font-semibold truncate">{n.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{n.body}</p>
                      {n.learnMoreUrl && (
                        <a
                          href={n.learnMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs underline text-muted-foreground"
                        >
                          {n.learnMoreUrl}
                        </a>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {n.updatedAt.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <form action={setOrgNoticeActiveFromForm}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="active" value={n.active ? 'false' : 'true'} />
                        <Button type="submit" variant="outline" size="sm" className="w-24">
                          {n.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </form>
                      <form action={deleteOrgNoticeFromForm}>
                        <input type="hidden" name="id" value={n.id} />
                        <Button type="submit" variant="destructive" size="sm" className="w-24">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
