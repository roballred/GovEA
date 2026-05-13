import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataAttributeForm } from '@/components/data-architecture-form'
import { getDataAttribute, editDataAttribute } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function EditDataAttributePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/attributes')

  const { id } = await params
  const [attribute, personas] = await Promise.all([getDataAttribute(id), getPersonas()])
  if (!attribute) notFound()

  async function boundEdit(formData: FormData) {
    'use server'
    await editDataAttribute(id, formData)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/attributes/${id}`} className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit attribute</h1>
      </div>
      <DataAttributeForm
        initial={attribute}
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={boundEdit}
        successHref={`/data/attributes/${id}`}
      />
    </div>
  )
}
