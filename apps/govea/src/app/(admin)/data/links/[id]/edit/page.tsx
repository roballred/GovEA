import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataLinkForm } from '@/components/data-architecture-form'
import { getDataLink, editDataLink } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function EditDataLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/links')

  const { id } = await params
  const [link, personas] = await Promise.all([getDataLink(id), getPersonas()])
  if (!link) notFound()

  async function boundEdit(formData: FormData) {
    'use server'
    await editDataLink(id, formData)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/data/links/${id}`} className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit link</h1>
      </div>
      <DataLinkForm
        initial={link}
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={boundEdit}
        successHref={`/data/links/${id}`}
      />
    </div>
  )
}
