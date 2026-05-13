import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getDataEntity, deleteDataEntity } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import Link from 'next/link'

export default async function DataEntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const [entity, personas] = await Promise.all([getDataEntity(id), getPersonas()])
  if (!entity) notFound()

  const showWriteActions = canEdit(session.user) && entity.organizationId === orgId
  const showDelete = isAdmin(session.user) && entity.organizationId === orgId
  const ownerNames = entity.ownerPersonaIds
    .map(pid => personas.find(p => p.id === pid)?.name)
    .filter((n): n is string => !!n)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/data/entities" className="text-sm text-muted-foreground hover:underline">← All entities</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground capitalize">{entity.status}</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{entity.name}</h1>
          </div>
          {showWriteActions && (
            <Link href={`/data/entities/${entity.id}/edit`}
              className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              Edit
            </Link>
          )}
        </div>
      </div>

      {entity.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{entity.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visibility" value={entity.visibility} />
        <Field label="Hub table" value={entity.physicalHubTableName ?? '—'} mono />
        <Field label="Server" value={entity.serverName ?? '—'} />
        <Field label="Database" value={entity.databaseName ?? '—'} />
        <Field label="Schema" value={entity.schemaName ?? '—'} />
        <Field label="Owners" value={ownerNames.length ? ownerNames.join(', ') : '—'} />
      </div>

      {showDelete && (
        <div className="border-t pt-4">
          <form action={async () => {
            'use server'
            await deleteDataEntity(id)
            redirect('/data/entities')
          }}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Delete entity
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
