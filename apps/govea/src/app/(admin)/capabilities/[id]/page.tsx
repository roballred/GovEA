import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCapability } from '@/actions/capabilities'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { LinkedItemCard } from '@/components/linked-item-card'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only',
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

export default async function CapabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const capability = await getCapability(id)
  if (!capability) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/capabilities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Capabilities
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{capability.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[capability.status])}>
              {capability.status.charAt(0).toUpperCase() + capability.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[capability.visibility])}>
              {VISIBILITY_LABELS[capability.visibility]}
            </span>
          </div>
        </div>

        {capability.description && (
          <p className="text-muted-foreground">{capability.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          <div>
            <span className="text-muted-foreground">Domain: </span>
            {capability.domain
              ? <span className="font-medium">{capability.domain}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Personas</h2>
        {capability.capabilityPersonas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No personas linked to this capability.</p>
        ) : (
          <div className="space-y-2">
            {capability.capabilityPersonas.map(({ persona }) => (
              <LinkedItemCard
                key={persona.id}
                href={`/personas/${persona.id}`}
                name={persona.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
