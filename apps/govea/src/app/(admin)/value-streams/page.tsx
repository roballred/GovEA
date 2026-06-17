import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getValueStreams, importValueStreams } from '@/actions/value-streams'
import { parseListScope } from '@/lib/federation'
import { ListScopeToggle } from '@/components/list-scope-toggle'
import { CsvImportExportControls } from '@/components/csv-import-export-controls'
import { ValueStreamTable } from './value-stream-table'
export default async function ValueStreamsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const scope = parseListScope((await searchParams).scope)
  const canEdit = role === 'admin' || role === 'contributor'

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
        <div className="flex items-center gap-2">
          <ListScopeToggle scope={scope} />
          {canEdit && (
            <CsvImportExportControls
              entityLabel="Value stream"
              exportHref="/api/value-streams/export"
              importAction={importValueStreams}
              columnsHint={<>Columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">value_item</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">personas</code>, <code className="bg-muted px-1 rounded">capabilities</code>, <code className="bg-muted px-1 rounded">stages</code> (<code className="bg-muted px-1 rounded">Stage: Cap A, Cap B | Next stage</code>).</>}
            />
          )}
        </div>
      </div>
      <ValueStreamTable valueStreams={valueStreamList} role={role} currentOrgId={orgId} />
    </div>
  )
}
