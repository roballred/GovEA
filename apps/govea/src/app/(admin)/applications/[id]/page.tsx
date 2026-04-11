import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getApplication } from '@/actions/applications'
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

const LIFECYCLE_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
  sunset: 'bg-amber-100 text-amber-800 border-amber-200',
  decommissioned: 'bg-red-100 text-red-700 border-red-200',
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const application = await getApplication(id)
  if (!application) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/applications" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Applications
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{application.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {application.lifecycleStatus && (
              <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LIFECYCLE_STYLES[application.lifecycleStatus])}>
                {application.lifecycleStatus.charAt(0).toUpperCase() + application.lifecycleStatus.slice(1)}
              </span>
            )}
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[application.status])}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[application.visibility])}>
              {VISIBILITY_LABELS[application.visibility]}
            </span>
          </div>
        </div>

        {application.description && (
          <p className="text-muted-foreground">{application.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          <div>
            <span className="text-muted-foreground">Vendor: </span>
            {application.vendor
              ? <span className="font-medium">{application.vendor}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
          <div>
            <span className="text-muted-foreground">Version: </span>
            {application.version
              ? <span className="font-medium">{application.version}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
          <div>
            <span className="text-muted-foreground">Hosting: </span>
            {application.hostingModel
              ? <span className="font-medium">{application.hostingModel}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Capabilities</h2>
        {application.applicationCapabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No capabilities linked to this application.</p>
        ) : (
          <div className="space-y-2">
            {application.applicationCapabilities.map(({ capability }) => (
              <LinkedItemCard
                key={capability.id}
                href={`/capabilities/${capability.id}`}
                name={capability.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
