import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DataBusinessKeyForm } from '@/components/data-architecture-form'
import { createDataBusinessKey, getDataEntities } from '@/actions/data-architecture'
import { getPersonas } from '@/actions/personas'
import Link from 'next/link'

export default async function NewDataBusinessKeyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/data/business-keys')

  const [personas, entities] = await Promise.all([getPersonas(), getDataEntities()])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/data/business-keys" className="text-sm text-muted-foreground hover:underline">← All business keys</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">New business key</h1>
      </div>
      <DataBusinessKeyForm
        personas={personas.map(p => ({ id: p.id, name: p.name }))}
        entities={entities.map(e => ({ id: e.id, name: e.name }))}
        action={createDataBusinessKey}
        successHref="/data/business-keys"
      />
    </div>
  )
}
