import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import {
  getDataEntity, deleteDataEntity, getDataEntities, getDataAttributes, getDataBusinessKeys,
} from '@/actions/data-architecture'
import {
  getRelatedEntityIds, getCharacterizingAttributeIds,
} from '@/actions/data-architecture-relationships'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import Link from 'next/link'

export default async function DataEntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const { id } = await params
  const [
    entity, personas, allEntities, allAttributes, allBusinessKeys,
    relatedIds, characterizingIds,
  ] = await Promise.all([
    getDataEntity(id),
    getPersonas(),
    getDataEntities(),
    getDataAttributes(),
    getDataBusinessKeys(),
    getRelatedEntityIds(id),
    getCharacterizingAttributeIds(id),
  ])
  if (!entity) notFound()

  const showWriteActions = canEdit(session.user) && entity.organizationId === orgId
  const showDelete = isAdmin(session.user) && entity.organizationId === orgId
  const ownerNames = entity.ownerPersonaIds
    .map(pid => personas.find(p => p.id === pid)?.name)
    .filter((n): n is string => !!n)

  const relatedEntities = allEntities.filter(e => relatedIds.includes(e.id))
  const characterizingAttributes = allAttributes.filter(a => characterizingIds.includes(a.id))
  const instantiatingBusinessKeys = allBusinessKeys.filter(bk => bk.owningDataEntityId === id)

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

      <RelationshipsSection
        editHref={showWriteActions ? `/data/entities/${entity.id}/relationships` : null}
        sections={[
          {
            label: 'Related entities',
            kindHint: '"is related"',
            items: relatedEntities.map(e => ({ id: e.id, name: e.name, href: `/data/entities/${e.id}` })),
          },
          {
            label: 'Characterizing attributes',
            kindHint: '"is characterized by"',
            items: characterizingAttributes.map(a => ({ id: a.id, name: a.name, href: `/data/attributes/${a.id}` })),
          },
          {
            label: 'Instantiating business keys',
            kindHint: '"is instantiated by" — managed on each business key',
            items: instantiatingBusinessKeys.map(bk => ({ id: bk.id, name: bk.name, href: `/data/business-keys/${bk.id}` })),
          },
        ]}
      />

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

interface RelSection {
  label: string
  kindHint: string
  items: { id: string; name: string; href: string }[]
}

function RelationshipsSection({ sections, editHref }: { sections: RelSection[]; editHref: string | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Relationships</h2>
        {editHref && (
          <Link href={editHref} className="text-xs text-muted-foreground hover:underline">
            Edit relationships
          </Link>
        )}
      </div>
      <div className="space-y-2">
        {sections.map(s => (
          <div key={s.label} className="rounded-lg border bg-card px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              {s.label} <span className="font-normal italic">— {s.kindHint}</span> ({s.items.length})
            </p>
            {s.items.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-sm">
                {s.items.map(it => (
                  <li key={it.id}>
                    <Link href={it.href} className="hover:underline">{it.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic mt-0.5">None.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
