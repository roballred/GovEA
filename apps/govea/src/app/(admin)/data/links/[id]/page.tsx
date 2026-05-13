import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getDataLink, deleteDataLink } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  'same-as':      'Same-As',
  'hierarchical': 'Hierarchical',
}

export default async function DataLinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const [link, personas] = await Promise.all([getDataLink(id), getPersonas()])
  if (!link) notFound()

  const showWriteActions = canEdit(session.user) && link.organizationId === orgId
  const showDelete = isAdmin(session.user) && link.organizationId === orgId
  const ownerNames = link.ownerPersonaIds
    .map(pid => personas.find(p => p.id === pid)?.name)
    .filter((n): n is string => !!n)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/data/links" className="text-sm text-muted-foreground hover:underline">← All links</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground capitalize">{link.status}</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{link.name}</h1>
          </div>
          {showWriteActions && (
            <Link href={`/data/links/${link.id}/edit`}
              className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              Edit
            </Link>
          )}
        </div>
      </div>

      {link.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{link.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visibility" value={link.visibility} />
        <Field label="Physical relationship type" value={link.physicalLinkType ? TYPE_LABEL[link.physicalLinkType] ?? link.physicalLinkType : '—'} />
        <Field label="Link table" value={link.physicalLinkTableName ?? '—'} mono />
        <Field label="Server" value={link.serverName ?? '—'} />
        <Field label="Database" value={link.databaseName ?? '—'} />
        <Field label="Schema" value={link.schemaName ?? '—'} />
        <Field label="Owners" value={ownerNames.length ? ownerNames.join(', ') : '—'} />
      </div>

      {showDelete && (
        <div className="border-t pt-4">
          <form action={async () => {
            'use server'
            await deleteDataLink(id)
            redirect('/data/links')
          }}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Delete link
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
