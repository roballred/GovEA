import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDataAttributes } from '@/actions/data-architecture'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  'effectivity':     'Effectivity',
  'multi-active':    'Multi-Active',
  'record-tracking': 'Record Tracking',
  'status-tracking': 'Status Tracking',
}

export default async function DataAttributesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const items = await getDataAttributes()
  const showWriteActions = canEdit(session.user)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/data" className="text-sm text-muted-foreground hover:underline">← Data architecture</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Attributes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Characterizing facts. Each maps to a Data Vault Satellite.</p>
        </div>
        {showWriteActions && (
          <Link href="/data/attributes/new"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New attribute
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attributes yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(a => (
            <li key={a.id} className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
              <Link href={`/data/attributes/${a.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{a.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {a.physicalAttributeType && <span>{TYPE_LABEL[a.physicalAttributeType]}</span>}
                  {a.physicalSatelliteTableName && (
                    <>
                      {a.physicalAttributeType && <span>·</span>}
                      <span className="font-mono">{a.physicalSatelliteTableName}</span>
                    </>
                  )}
                </div>
                {a.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
