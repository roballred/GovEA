import { cn } from '@/lib/utils'

/**
 * Detail-page attribution line — "Owned by Carlos Carter" with a small icon.
 *
 * Renders nothing when no owner is set. Sits near FreshnessLine so the
 * "who owns this, when was it last touched" context is one glance away.
 *
 * The styling intentionally stays understated: ownership is informational,
 * not a privilege gate. The friction comes at edit time from the form's
 * warning banner, not here.
 */
export function DomainOwnerLine({
  ownerName,
  ownerEmail,
  className,
}: {
  ownerName: string | null | undefined
  ownerEmail: string | null | undefined
  className?: string
}) {
  if (!ownerName && !ownerEmail) return null
  const label = ownerName ?? ownerEmail
  return (
    <p className={cn('text-xs text-muted-foreground inline-flex items-center gap-1.5', className)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span>
        Owned by <span className="font-medium text-foreground">{label}</span>
      </span>
    </p>
  )
}
