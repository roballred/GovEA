import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTaxonomyTermsWithChildren, getPrincipleTypeValueUsage } from '@/actions/taxonomy'
import { getAllEntityTaxonomyDefinitions } from '@/lib/entity-taxonomy-helpers'
import { TaxonomyTable } from './taxonomy-table'

export default async function TaxonomyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const [{ types, values }, principleTypeUsage, definitions] = await Promise.all([
    getTaxonomyTermsWithChildren(),
    getPrincipleTypeValueUsage(),
    getAllEntityTaxonomyDefinitions(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Taxonomy</h1>
        <p className="text-muted-foreground mt-1">
          Classification types and their values — used to organize capabilities, glossary entries, personas, and principles.
        </p>
      </div>
      <TaxonomyTable types={types} values={values} role={role} principleTypeUsage={principleTypeUsage} definitions={definitions} />
    </div>
  )
}
