import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getValueStreams } from '@/actions/value-streams'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { ValueStreamTable } from './value-stream-table'
export default async function ValueStreamsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)

  const valueStreamList = await getValueStreams(scope)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Value Streams</h1>
          <p className="text-muted-foreground mt-1">
            End-to-end sequences of stages that deliver measurable outcomes to your stakeholders.
          </p>
        </div>
        <ListScopeToggle scope={scope} />
      </div>
      <ValueStreamTable valueStreams={valueStreamList} role={role} currentOrgId={orgId} />
    </div>
  )
}
