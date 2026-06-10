'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { markNotificationRead, type NotificationRow } from '@/actions/notifications'
import { cn } from '@/lib/utils'

export function NotificationRowItem({ item }: { item: NotificationRow }) {
  const [isPending, startTransition] = useTransition()
  const unread = !item.readAt

  function handleClick() {
    if (!unread) return
    startTransition(async () => { await markNotificationRead(item.id) })
  }

  // Layered click: the row is clickable to mark-read; the link inside is
  // a real navigation. The mark-read fires in parallel with the link click.
  // The row click is a pointer-only convenience — keyboard users have full
  // parity through the focusable "mark read" button and the link below.
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <li
      onClick={handleClick}
      className={cn(
        'px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors',
        unread && 'bg-primary/[0.04]',
      )}
    >
      <div className="min-w-0 space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {unread && (
            <span aria-label="Unread" className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
          <p className="text-sm">
            {item.href ? (
              <Link href={item.href} className="font-medium hover:text-primary transition-colors">
                {item.summary}
              </Link>
            ) : (
              <span className="font-medium">{item.summary}</span>
            )}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="capitalize">{item.entityType}</span>
          {' · '}
          <span className="font-mono">{item.action}</span>
          {item.actorEmail && (
            <>
              {' · by '}
              <span>{item.actorName ?? item.actorEmail}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(item.createdAt).toLocaleString()}
        </p>
        {unread && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClick() }}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            mark read
          </button>
        )}
      </div>
    </li>
  )
}
