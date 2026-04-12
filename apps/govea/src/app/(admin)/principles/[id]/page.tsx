import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPrinciple } from '@/actions/principles'
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

export default async function PrincipleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const principle = await getPrinciple(id)
  if (!principle) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/principles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Principles
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{principle.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[principle.status])}>
              {principle.status.charAt(0).toUpperCase() + principle.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[principle.visibility])}>
              {VISIBILITY_LABELS[principle.visibility]}
            </span>
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-6">
        {principle.rationale && (
          <Section title="Rationale">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{principle.rationale}</p>
          </Section>
        )}
        {principle.implications && (
          <Section title="Implications">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{principle.implications}</p>
          </Section>
        )}
      </div>

      {(principle.principleCapabilities.length > 0 || principle.principleAdrs.length > 0) && <hr />}

      {principle.principleCapabilities.length > 0 && (
        <Section title="Capabilities">
          <div className="space-y-2">
            {principle.principleCapabilities.map(({ capability }) => (
              <LinkedItemCard
                key={capability.id}
                href={`/capabilities/${capability.id}`}
                name={capability.name}
                meta={capability.domain ?? null}
              />
            ))}
          </div>
        </Section>
      )}

      {principle.principleAdrs.length > 0 && (
        <Section title="Architecture Decision Records">
          <div className="space-y-2">
            {principle.principleAdrs.map(({ adr }) => (
              <LinkedItemCard
                key={adr.id}
                href={`/adrs/${adr.id}`}
                name={adr.title}
                meta={adr.number}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(principle.createdAt).toLocaleDateString()} · Updated {new Date(principle.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}
