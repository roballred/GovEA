import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDataBusinessKeys, getDataEntities } from '@/actions/data-architecture'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'

export default async function DataBusinessKeysPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const [items, entities] = await Promise.all([getDataBusinessKeys(), getDataEntities()])
  const entityNameById = new Map(entities.map(e => [e.id, e.name]))
  const showWriteActions = canEdit(session.user)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/data" className="text-sm text-muted-foreground hover:underline">← Data architecture</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Business keys</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Natural identifiers that instantiate entities. Each business key belongs to one entity (Hub).
          </p>
        </div>
        {showWriteActions && entities.length > 0 && (
          <Link href="/data/business-keys/new"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New business key
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {entities.length === 0
            ? 'Create at least one entity before adding a business key.'
            : 'No business keys yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map(bk => (
            <li key={bk.id} className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
              <Link href={`/data/business-keys/${bk.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{bk.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{bk.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>instantiates <span className="text-foreground">{entityNameById.get(bk.owningDataEntityId) ?? 'unknown entity'}</span></span>
                  {bk.dataType && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{bk.dataType}</span>
                    </>
                  )}
                </div>
                {bk.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bk.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
