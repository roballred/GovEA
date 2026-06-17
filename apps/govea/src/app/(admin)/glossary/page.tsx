import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGlossaryTerms } from '@/actions/glossary'
import { getTaxonomyDomains } from '@/actions/taxonomy'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { GlossaryTable } from './glossary-table'

export default async function GlossaryPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const [terms, domainTerms] = await Promise.all([
    getGlossaryTerms(scope),
    getTaxonomyDomains(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Glossary</h1>
          <p className="text-muted-foreground mt-1">
            Shared vocabulary for terms and concepts used across the organization.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <GlossaryTable terms={terms} domainTerms={domainTerms} role={role} currentOrgId={orgId} />
    </div>
  )
}
