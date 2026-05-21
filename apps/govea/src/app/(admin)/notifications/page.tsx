import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getMyNotifications, getMySubscriptions, markAllNotificationsRead,
} from '@/actions/notifications'
import { NotificationRowItem } from './notification-row-item'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Notifications inbox (#581).
 *
 * Surfaces every change to an architecture object the caller subscribed to
 * (capability / application / ADR). Unread events are pinned to the top
 * so a return visit lands on what's new.
 *
 * Email delivery is the next-PR follow-up — once the nodemailer transport
 * from the #528 follow-up lands, every row inserted here will also be
 * pushed out via SMTP. The in-app inbox stays as the durable record.
 */
export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [items, subs] = await Promise.all([
    getMyNotifications(),
    getMySubscriptions(),
  ])
  const unreadCount = items.filter(i => !i.readAt).length

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Changes to architecture objects you subscribed to. Email delivery is queued for a
          follow-up once the SMTP transport lands; the in-app inbox is the durable record.
        </p>
      </div>

      {/* ── Inbox ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            Inbox
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
                {unreadCount} unread
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="outline" size="sm">Mark all read</Button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground space-y-1">
            <p className="text-foreground font-medium">No notifications yet</p>
            <p>Subscribe to a capability, application, or ADR to be notified when it changes.</p>
          </div>
        ) : (
          <ul className="rounded-lg border bg-card divide-y divide-border">
            {items.map(item => (
              <NotificationRowItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <hr />

      {/* ── Subscriptions ── */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Your subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            The objects you&rsquo;re watching. Manage subscriptions on each object&rsquo;s detail page.
          </p>
        </div>
        {subs.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            You haven&rsquo;t subscribed to anything yet.
          </p>
        ) : (
          <ul className="rounded-lg border bg-card divide-y divide-border">
            {subs.map(s => (
              <li key={`${s.entityType}-${s.entityId}`} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  {s.href ? (
                    <Link href={s.href} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                      {s.entityName ?? `${s.entityType} · ${s.entityId.slice(0, 8)}`}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{s.entityType} · {s.entityId.slice(0, 8)}</span>
                  )}
                  <p className="text-xs text-muted-foreground capitalize">{s.entityType}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  since {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
