import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDataLinks } from '@/actions/data-architecture'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  'same-as':      'Same-As',
  'hierarchical': 'Hierarchical',
}

export default async function DataLinksPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const items = await getDataLinks()
  const showWriteActions = canEdit(session.user)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/data" className="text-sm text-muted-foreground hover:underline">← Data architecture</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Links</h1>
          <p className="text-muted-foreground mt-1 text-sm">Relationships between entities. Each maps to a Data Vault Link.</p>
        </div>
        {showWriteActions && (
          <Link href="/data/links/new"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New link
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(l => (
            <li key={l.id} className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
              <Link href={`/data/links/${l.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{l.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{l.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {l.physicalLinkType && <span>{TYPE_LABEL[l.physicalLinkType]}</span>}
                  {l.physicalLinkTableName && (
                    <>
                      {l.physicalLinkType && <span>·</span>}
                      <span className="font-mono">{l.physicalLinkTableName}</span>
                    </>
                  )}
                </div>
                {l.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
