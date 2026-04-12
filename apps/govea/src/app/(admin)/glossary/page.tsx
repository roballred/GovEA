import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGlossaryTerms } from '@/actions/glossary'
import { GlossaryTable } from './glossary-table'

export default async function GlossaryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const terms = await getGlossaryTerms(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Glossary</h1>
        <p className="text-muted-foreground mt-1">
          Shared vocabulary for terms and concepts used across the organization.
        </p>
      </div>
      <GlossaryTable terms={terms} role={role} currentOrgId={orgId} />
    </div>
  )
}
