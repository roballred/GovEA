import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCapabilityTrace } from '@/actions/traceability'
import { traceToMermaid } from '@/lib/mermaid-diagram'
import { CapabilityMapViews } from '@/components/capability-map-views'
import Link from 'next/link'

export default async function CapabilityMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const trace = await getCapabilityTrace(id)
  if (!trace) notFound()

  const chart = traceToMermaid(trace)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          href={`/capabilities/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {trace.name}
        </Link>
        <Link
          href={`/traceability?from=capability&id=${id}`}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View traceability →
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{trace.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Relationship map · objectives, applications, personas, initiatives, ADRs, principles
        </p>
      </div>

      <CapabilityMapViews trace={trace} chart={chart} />

      <p className="text-xs text-muted-foreground">
        Showing direct (1-hop) relationships only. Use the{' '}
        <Link
          href={`/traceability?from=capability&id=${id}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          traceability view
        </Link>
        {' '}for multi-hop chains, or the{' '}
        <Link
          href={`/capabilities/${id}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          detail page
        </Link>
        {' '}to manage relationships.
      </p>
    </div>
  )
}
