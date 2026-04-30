import { cn } from '@/lib/utils'

// Ten-color palette — domain gets a consistent color by string hash,
// so any free-text domain value maps to the same color every time.
const PALETTE = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-pink-100 text-pink-800 border-pink-200',
]

function hashDomain(domain: string): number {
  let h = 0
  for (const c of domain) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return Math.abs(h) % PALETTE.length
}

export function DomainBadge({ domain, className }: { domain?: string | null; className?: string }) {
  if (!domain) return null
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
      PALETTE[hashDomain(domain)],
      className,
    )}>
      {domain}
    </span>
  )
}
