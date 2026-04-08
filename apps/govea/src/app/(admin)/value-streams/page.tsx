import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getValueStreams } from '@/actions/value-streams'
import { ValueStreamTable } from './value-stream-table'
export default async function ValueStreamsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role

  const valueStreamList = await getValueStreams(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Value Streams</h1>
        <p className="text-muted-foreground mt-1">
          End-to-end sequences of stages that deliver measurable outcomes to your stakeholders.
        </p>
      </div>
      <ValueStreamTable valueStreams={valueStreamList} role={role} currentOrgId={orgId} />
    </div>
  )
}
