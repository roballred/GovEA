import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataBusinessKeyForm } from '@/components/data-architecture-form'
import { getDataBusinessKey, editDataBusinessKey, getDataEntities } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function EditDataBusinessKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/business-keys')

  const { id } = await params
  const [bk, personas, entities] = await Promise.all([
    getDataBusinessKey(id), getPersonas(), getDataEntities(),
  ])
  if (!bk) notFound()

  async function boundEdit(formData: FormData) {
    'use server'
    await editDataBusinessKey(id, formData)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/business-keys/${id}`} className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit business key</h1>
      </div>
      <DataBusinessKeyForm
        initial={bk}
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        entities={entities.map(e => ({ id: e.id, name: e.name }))}
        action={boundEdit}
        successHref={`/data/business-keys/${id}`}
      />
    </div>
  )
}
