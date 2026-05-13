import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getDataBusinessKey, deleteDataBusinessKey, getDataEntity } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import Link from 'next/link'

export default async function DataBusinessKeyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const bk = await getDataBusinessKey(id)
  if (!bk) notFound()

  const [personas, owningEntity] = await Promise.all([
    getPersonas(),
    getDataEntity(bk.owningDataEntityId),
  ])

  const showWriteActions = canEdit(session.user) && bk.organizationId === orgId
  const showDelete = isAdmin(session.user) && bk.organizationId === orgId
  const ownerNames = bk.ownerPersonaIds
    .map(pid => personas.find(p => p.id === pid)?.name)
    .filter((n): n is string => !!n)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/data/business-keys" className="text-sm text-muted-foreground hover:underline">← All business keys</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground capitalize">{bk.status}</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{bk.name}</h1>
          </div>
          {showWriteActions && (
            <Link href={`/data/business-keys/${bk.id}/edit`}
              className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              Edit
            </Link>
          )}
        </div>
      </div>

      {bk.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{bk.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Owning entity</p>
          {owningEntity ? (
            <Link href={`/data/entities/${owningEntity.id}`} className="text-sm hover:underline">
              {owningEntity.name}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">— (entity not accessible)</p>
          )}
        </div>
        <Field label="Visibility" value={bk.visibility} />
        <Field label="Data type" value={bk.dataType ?? '—'} mono />
        <Field label="Owners" value={ownerNames.length ? ownerNames.join(', ') : '—'} />
      </div>

      {showDelete && (
        <div className="border-t pt-4">
          <form action={async () => {
            'use server'
            await deleteDataBusinessKey(id)
            redirect('/data/business-keys')
          }}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Delete business key
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
