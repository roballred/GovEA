import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPersonas } from '@/actions/personas'
import { getPersonaTypesFromTaxonomy, getPersonaTagsFromTaxonomy } from '@/actions/taxonomy'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { PersonaTable } from './persona-table'
export default async function PersonasPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [personaList, typeList, tagList] = await Promise.all([
    getPersonas(scope),
    getPersonaTypesFromTaxonomy(),
    getPersonaTagsFromTaxonomy(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personas</h1>
          <p className="text-muted-foreground mt-1">People your organization serves and the needs they have.</p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <PersonaTable personas={personaList} personaTypes={typeList} allTags={tagList} role={role} currentOrgId={orgId} />
    </div>
  )
}
