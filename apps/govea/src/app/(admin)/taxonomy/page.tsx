import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTaxonomyTermsWithChildren } from '@/actions/taxonomy'
import { TaxonomyTable } from './taxonomy-table'

export default async function TaxonomyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const { domains, children } = await getTaxonomyTermsWithChildren(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Taxonomy</h1>
        <p className="text-muted-foreground mt-1">
          Domains and classification terms used to organize capabilities and glossary entries.
        </p>
      </div>
      <TaxonomyTable domains={domains} children={children} role={role} />
    </div>
  )
}
