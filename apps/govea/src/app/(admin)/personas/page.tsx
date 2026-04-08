import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPersonas, getPersonaTypes, getTags } from '@/actions/personas'
import { PersonaTable } from './persona-table'
import type { Role } from '@/lib/rbac'

export default async function PersonasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = (session.user as any).organizationId as string
  const role = (session.user as any).role as Role

  const [personaList, typeList, tagList] = await Promise.all([
    getPersonas(orgId),
    getPersonaTypes(orgId),
    getTags(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personas</h1>
        <p className="text-muted-foreground mt-1">People your organization serves and the needs they have.</p>
      </div>
      <PersonaTable personas={personaList} personaTypes={typeList} allTags={tagList} role={role} currentOrgId={orgId} />
    </div>
  )
}
