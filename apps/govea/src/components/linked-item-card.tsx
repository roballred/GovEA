import Link from 'next/link'
import { DomainBadge } from '@/components/domain-badge'

/**
 * Consistent card-row for linked EA items on detail pages.
 * Use this any time a detail page lists related items that can be navigated to.
 */
export function LinkedItemCard({
  href,
  name,
  meta,
  domain,
  badge,
}: {
  href: string
  name: string
  meta?: string | null
  domain?: string | null
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <span className="font-medium text-sm">{name}</span>
      {(meta || domain || badge) && (
        <div className="flex items-center gap-2">
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          {domain && <DomainBadge domain={domain} />}
          {badge}
        </div>
      )}
    </Link>
  )
}
