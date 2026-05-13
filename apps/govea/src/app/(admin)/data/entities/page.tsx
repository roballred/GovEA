import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDataEntities } from '@/actions/data-architecture'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'

export default async function DataEntitiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const items = await getDataEntities()
  const showWriteActions = canEdit(session.user)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/data" className="text-sm text-muted-foreground hover:underline">← Data architecture</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Entities</h1>
          <p className="text-muted-foreground mt-1 text-sm">Subject things in the model. Each maps to a Data Vault Hub.</p>
        </div>
        {showWriteActions && (
          <Link href="/data/entities/new"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New entity
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entities yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(e => (
            <li key={e.id} className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
              <Link href={`/data/entities/${e.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{e.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{e.status}</span>
                </div>
                {e.physicalHubTableName && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{e.physicalHubTableName}</p>
                )}
                {e.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
