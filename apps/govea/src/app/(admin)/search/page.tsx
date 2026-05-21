import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { searchRepository, type SearchResult } from '@/actions/search'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Map of entity types whose plural is irregular. The naive `+ 's'` rule works
// for personas, applications, services, principles, decisions, etc. but
// produces "Capabilitys" — wrong. Treat as a small allowlist of exceptions
// rather than a full pluralization library (#550).
const PLURAL_OVERRIDES: Record<string, string> = {
  capability: 'capabilities',
  // Future irregulars (entity type → desired plural) go here.
}

function pluralize(entityType: string): string {
  const lower = entityType.toLowerCase()
  return PLURAL_OVERRIDES[lower] ?? `${entityType}s`
}

function groupByType(results: SearchResult[]): Map<string, SearchResult[]> {
  const map = new Map<string, SearchResult[]>()
  for (const r of results) {
    const group = map.get(r.entityType) ?? []
    group.push(r)
    map.set(r.entityType, group)
  }
  return map
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const hasQuery = query.length >= 2

  const results = hasQuery ? await searchRepository(query) : []
  const grouped = groupByType(results)
  const totalCount = results.length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>

      {/* Search input — always visible; primary entry point on mobile */}
      <form action="/search" method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search the repository…"
          autoFocus
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Search
        </button>
      </form>

      {hasQuery && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {totalCount === 0
              ? `No results for "${query}"`
              : `${totalCount} result${totalCount === 1 ? '' : 's'} for "${query}"`}
          </p>
          {totalCount > 0 && (
            <Link
              href={`/answers?q=${encodeURIComponent(query)}`}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              Get guided answer →
            </Link>
          )}
        </div>
      )}

      {hasQuery && totalCount === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </CardContent>
        </Card>
      )}

      {hasQuery && totalCount > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([entityType, items]) => (
            <div key={entityType}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {capitalize(pluralize(entityType))}
              </h2>
              <div className="space-y-2">
                {items.map(item => (
                  <Card key={item.id}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {capitalize(entityType)}
                      </Badge>
                      <Link
                        href={item.href}
                        className="flex-1 text-sm font-medium hover:underline truncate"
                      >
                        {item.title}
                      </Link>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {item.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
