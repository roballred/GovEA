import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { AttributeRelationshipsForm } from '@/components/data-relationships-form'
import { getDataAttribute, getDataAttributes } from '@/actions/data-architecture'
import {
  getSharedAttributeIds, setSharedAttributes,
} from '@/actions/data-architecture-relationships'
import Link from 'next/link'

export default async function EditAttributeRelationshipsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/attributes')

  const { id } = await params
  const [attribute, allAttributes, sharedIds] = await Promise.all([
    getDataAttribute(id),
    getDataAttributes(),
    getSharedAttributeIds(id),
  ])
  if (!attribute) notFound()

  const otherAttributes = allAttributes
    .filter(a => a.id !== id)
    .map(a => ({
      id: a.id,
      name: a.name,
      subtitle: a.physicalSatelliteTableName ?? undefined,
    }))

  async function saveAction(sharedAttributeIds: string[]) {
    'use server'
    await setSharedAttributes(id, sharedAttributeIds)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/attributes/${id}`} className="text-sm text-muted-foreground hover:underline">← Back to {attribute.name}</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Relationships for {attribute.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Attributes that characterize which entities is managed on the
          <Link href="/data/entities" className="hover:underline mx-1">entity{"'"}s relationships page</Link>.
        </p>
      </div>
      <AttributeRelationshipsForm
        attributeName={attribute.name}
        attributeId={id}
        otherAttributes={otherAttributes}
        initialSharedAttributeIds={sharedIds}
        saveAction={saveAction}
        successHref={`/data/attributes/${id}`}
      />
    </div>
  )
}
