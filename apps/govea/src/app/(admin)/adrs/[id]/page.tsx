import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getADR } from '@/actions/adrs'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LinkedItemCard } from '@/components/linked-item-card'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deprecated: 'bg-amber-100 text-amber-800 border-amber-200',
  superseded: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  deprecated: 'Deprecated',
  superseded: 'Superseded',
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

export default async function ADRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const adr = await getADR(id)
  if (!adr) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/adrs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Architecture Decision Records
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-mono text-muted-foreground">{adr.number}</p>
            <h1 className="text-2xl font-bold tracking-tight">{adr.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[adr.status])}>
              {STATUS_LABELS[adr.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[adr.visibility])}>
              {VISIBILITY_LABELS[adr.visibility]}
            </span>
          </div>
        </div>

        {adr.supersededByAdr && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Superseded by{' '}
            <Link href={`/adrs/${adr.supersededByAdr.id}`} className="font-medium underline underline-offset-2">
              {adr.supersededByAdr.number} — {adr.supersededByAdr.title}
            </Link>
          </div>
        )}
      </div>

      <hr />

      {/* Body */}
      <div className="space-y-6">
        {adr.context && (
          <Section title="Context">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.context}</p>
          </Section>
        )}

        {adr.decision && (
          <Section title="Decision">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.decision}</p>
          </Section>
        )}

        {adr.consequences && (
          <Section title="Consequences">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.consequences}</p>
          </Section>
        )}
      </div>

      <hr />

      {/* Linked items */}
      {adr.adrCapabilities.length > 0 && (
        <Section title="Capabilities">
          <div className="space-y-2">
            {adr.adrCapabilities.map(({ capability }) => (
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

      {adr.adrApplications.length > 0 && (
        <Section title="Applications">
          <div className="space-y-2">
            {adr.adrApplications.map(({ application }) => (
              <LinkedItemCard
                key={application.id}
                href={`/applications/${application.id}`}
                name={application.name}
              />
            ))}
          </div>
        </Section>
      )}

      {adr.adrInitiatives.length > 0 && (
        <Section title="Initiatives">
          <div className="space-y-2">
            {adr.adrInitiatives.map(({ initiative }) => (
              <LinkedItemCard
                key={initiative.id}
                href={`/initiatives/${initiative.id}`}
                name={initiative.name}
              />
            ))}
          </div>
        </Section>
      )}

      {adr.adrObjectives.length > 0 && (
        <Section title="Strategic Objectives">
          <div className="space-y-2">
            {adr.adrObjectives.map(({ objective }) => (
              <LinkedItemCard
                key={objective.id}
                href={`/objectives/${objective.id}`}
                name={objective.name}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(adr.createdAt).toLocaleDateString()} · Updated {new Date(adr.updatedAt).toLocaleDateString()}
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
