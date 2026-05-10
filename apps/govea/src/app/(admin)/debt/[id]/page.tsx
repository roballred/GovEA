import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getDebtItem, deleteDebtItem } from '@/actions/architecture-debt'
import { canEdit, isAdmin } from '@/lib/rbac'
import type { DebtSeverity, DebtStatus } from '@/db/schema'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const SEVERITY_BADGE: Record<DebtSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200',
  high:     'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200',
  medium:   'bg-yellow-50 text-yellow-800 border-yellow-200',
  low:      'bg-muted text-muted-foreground border-border',
}

const STATUS_LABEL: Record<DebtStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  accepted: 'Accepted',
  archived: 'Archived',
}

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const item = await getDebtItem(id)
  if (!item) notFound()

  const showWriteActions = canEdit(session.user) && item.organizationId === orgId
  const showDelete = isAdmin(session.user) && item.organizationId === orgId

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/debt" className="text-sm text-muted-foreground hover:underline">← All debt items</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                SEVERITY_BADGE[item.severity],
              )}>
                {item.severity}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{item.debtType.replace('-', ' ')}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</span>
              {item.securitySensitive && (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">🔒 security-sensitive</span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-2">{item.title}</h1>
          </div>
          {showWriteActions && (
            <Link
              href={`/debt/${item.id}/edit`}
              className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {item.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{item.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visibility" value={item.visibility} />
        <Field label="Source" value={item.source} />
        {item.targetResolutionDate && (
          <Field label="Target resolution date" value={item.targetResolutionDate} />
        )}
        <Field label="Last updated" value={item.updatedAt.toISOString().slice(0, 10)} />
      </div>

      {item.acceptanceRationale && (
        <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold">Acceptance rationale</h2>
          <p className="text-sm whitespace-pre-line">{item.acceptanceRationale}</p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Linked objects</h2>
        <LinkedList href="/applications" label="Applications" ids={item.applicationIds} />
        <LinkedList href="/capabilities" label="Capabilities" ids={item.capabilityIds} />
        <LinkedList href="/adrs" label="Decisions (ADRs)" ids={item.adrIds} />
        <LinkedList href="/initiatives" label="Initiatives (resolution path)" ids={item.initiativeIds} />
      </div>

      {showDelete && (
        <div className="border-t pt-4">
          <form action={async () => {
            'use server'
            await deleteDebtItem(id)
            redirect('/debt')
          }}>
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline"
            >
              Delete debt item
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm capitalize">{value}</p>
    </div>
  )
}

function LinkedList({ href, label, ids }: { href: string; label: string; ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <div className="rounded-lg border bg-card px-4 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label} ({ids.length})</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {ids.map(id => (
          <li key={id}>
            <Link href={`${href}/${id}`} className="hover:underline">{id.slice(0, 8)}…</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
