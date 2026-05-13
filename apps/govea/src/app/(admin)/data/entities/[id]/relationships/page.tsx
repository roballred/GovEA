import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { EntityRelationshipsForm } from '@/components/data-relationships-form'
import {
  getDataEntity, getDataEntities, getDataAttributes,
} from '@/actions/data-architecture'
import {
  getRelatedEntityIds, getCharacterizingAttributeIds,
  setRelatedEntities, setCharacterizingAttributes,
} from '@/actions/data-architecture-relationships'
import Link from 'next/link'

export default async function EditEntityRelationshipsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/entities')

  const { id } = await params
  const [entity, allEntities, allAttributes, relatedIds, characterizingIds] = await Promise.all([
    getDataEntity(id),
    getDataEntities(),
    getDataAttributes(),
    getRelatedEntityIds(id),
    getCharacterizingAttributeIds(id),
  ])
  if (!entity) notFound()

  const otherEntities = allEntities
    .filter(e => e.id !== id)
    .map(e => ({
      id: e.id,
      name: e.name,
      subtitle: e.physicalHubTableName ?? undefined,
    }))
  const attributeOptions = allAttributes.map(a => ({
    id: a.id,
    name: a.name,
    subtitle: a.physicalSatelliteTableName ?? undefined,
  }))

  async function saveAction(relatedEntityIds: string[], characterizingAttributeIds: string[]) {
    'use server'
    await setRelatedEntities(id, relatedEntityIds)
    await setCharacterizingAttributes(id, characterizingAttributeIds)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/entities/${id}`} className="text-sm text-muted-foreground hover:underline">← Back to {entity.name}</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Relationships for {entity.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage cross-object semantic relationships. The owning business keys ({'"instantiates"'}) are managed on the
          <Link href="/data/business-keys" className="hover:underline mx-1">business keys page</Link>directly.
        </p>
      </div>
      <EntityRelationshipsForm
        entityName={entity.name}
        entityId={id}
        otherEntities={otherEntities}
        allAttributes={attributeOptions}
        initialRelatedEntityIds={relatedIds}
        initialCharacterizingAttributeIds={characterizingIds}
        saveAction={saveAction}
        successHref={`/data/entities/${id}`}
      />
    </div>
  )
}
