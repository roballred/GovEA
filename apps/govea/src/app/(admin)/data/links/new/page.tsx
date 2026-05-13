import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataLinkForm } from '@/components/data-architecture-form'
import { createDataLink } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function NewDataLinkPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/links')

  const personas = await getPersonas()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/data/links" className="text-sm text-muted-foreground hover:underline">← All links</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">New link</h1>
      </div>
      <DataLinkForm
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={createDataLink}
        successHref="/data/links"
      />
    </div>
  )
}
