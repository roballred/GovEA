// v1: simple in-process search over the database.
// No external search service required for self-hosted deployments.

export interface SearchResult {
  id: string
  type: 'persona' | 'capability' | 'application' | 'adr'
  name: string
  description: string | null
}

export async function search(_query: string): Promise<SearchResult[]> {
  // TODO: implement full-text search using PostgreSQL tsvector
  return []
}
