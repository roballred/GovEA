import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataEntityForm } from '@/components/data-architecture-form'
import { getDataEntity, editDataEntity } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function EditDataEntityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/entities')

  const { id } = await params
  const [entity, personas] = await Promise.all([getDataEntity(id), getPersonas()])
  if (!entity) notFound()

  async function boundEdit(formData: FormData) {
    'use server'
    await editDataEntity(id, formData)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/entities/${id}`} className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit entity</h1>
      </div>
      <DataEntityForm
        initial={entity}
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={boundEdit}
        successHref={`/data/entities/${id}`}
      />
    </div>
  )
}
