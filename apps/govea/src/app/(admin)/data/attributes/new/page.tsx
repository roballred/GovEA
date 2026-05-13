import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataAttributeForm } from '@/components/data-architecture-form'
import { createDataAttribute } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function NewDataAttributePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/attributes')

  const personas = await getPersonas()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/data/attributes" className="text-sm text-muted-foreground hover:underline">← All attributes</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">New attribute</h1>
      </div>
      <DataAttributeForm
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        action={createDataAttribute}
        successHref="/data/attributes"
      />
    </div>
  )
}
