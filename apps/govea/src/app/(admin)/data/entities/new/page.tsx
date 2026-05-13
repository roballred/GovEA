import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataEntityForm } from '@/components/data-architecture-form'
import { createDataEntity } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function NewDataEntityPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/entities')

  const personas = await getPersonas()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/data/entities" className="text-sm text-muted-foreground hover:underline">← All entities</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">New entity</h1>
      </div>
      <DataEntityForm
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={createDataEntity}
        successHref="/data/entities"
      />
    </div>
  )
}
