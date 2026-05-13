import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import {
  getDataAttribute, deleteDataAttribute, getDataAttributes, getDataEntities,
} from '@/actions/data-architecture'
import {
  getSharedAttributeIds, getEntitiesCharacterizedBy,
} from '@/actions/data-architecture-relationships'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  'effectivity':     'Effectivity',
  'multi-active':    'Multi-Active',
  'record-tracking': 'Record Tracking',
  'status-tracking': 'Status Tracking',
}

export default async function DataAttributeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const [
    attribute, personas, allAttributes, allEntities,
    sharedIds, characterizesEntityIds,
  ] = await Promise.all([
    getDataAttribute(id),
    getPersonas(),
    getDataAttributes(),
    getDataEntities(),
    getSharedAttributeIds(id),
    getEntitiesCharacterizedBy(id),
  ])
  if (!attribute) notFound()

  const showWriteActions = canEdit(session.user) && attribute.organizationId === orgId
  const showDelete = isAdmin(session.user) && attribute.organizationId === orgId
  const ownerNames = attribute.ownerPersonaIds
    .map(pid => personas.find(p => p.id === pid)?.name)
    .filter((n): n is string => !!n)

  const sharedAttributes = allAttributes.filter(a => sharedIds.includes(a.id))
  const characterizesEntities = allEntities.filter(e => characterizesEntityIds.includes(e.id))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/data/attributes" className="text-sm text-muted-foreground hover:underline">← All attributes</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground capitalize">{attribute.status}</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{attribute.name}</h1>
          </div>
          {showWriteActions && (
            <Link href={`/data/attributes/${attribute.id}/edit`}
              className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              Edit
            </Link>
          )}
        </div>
      </div>

      {attribute.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{attribute.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visibility" value={attribute.visibility} />
        <Field label="Physical type" value={attribute.physicalAttributeType ? TYPE_LABEL[attribute.physicalAttributeType] ?? attribute.physicalAttributeType : '—'} />
        <Field label="Satellite table" value={attribute.physicalSatelliteTableName ?? '—'} mono />
        <Field label="Server" value={attribute.serverName ?? '—'} />
        <Field label="Database" value={attribute.databaseName ?? '—'} />
        <Field label="Schema" value={attribute.schemaName ?? '—'} />
        <Field label="Owners" value={ownerNames.length ? ownerNames.join(', ') : '—'} />
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Relationships</h2>
          {showWriteActions && (
            <Link href={`/data/attributes/${id}/relationships`} className="text-xs text-muted-foreground hover:underline">
              Edit relationships
            </Link>
          )}
        </div>
        <div className="space-y-2">
          <RelPanel
            label="Shares with attributes"
            kindHint='"shares"'
            items={sharedAttributes.map(a => ({ id: a.id, name: a.name, href: `/data/attributes/${a.id}` }))}
          />
          <RelPanel
            label="Characterizes entities"
            kindHint='"characterizes" — managed on each entity'
            items={characterizesEntities.map(e => ({ id: e.id, name: e.name, href: `/data/entities/${e.id}` }))}
          />
        </div>
      </div>

      {showDelete && (
        <div className="border-t pt-4">
          <form action={async () => {
            'use server'
            await deleteDataAttribute(id)
            redirect('/data/attributes')
          }}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Delete attribute
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

function RelPanel({
  label, kindHint, items,
}: {
  label: string
  kindHint: string
  items: { id: string; name: string; href: string }[]
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-2">
      <p className="text-xs font-medium text-muted-foreground">
        {label} <span className="font-normal italic">— {kindHint}</span> ({items.length})
      </p>
      {items.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {items.map(it => (
            <li key={it.id}>
              <Link href={it.href} className="hover:underline">{it.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic mt-0.5">None.</p>
      )}
    </div>
  )
}
