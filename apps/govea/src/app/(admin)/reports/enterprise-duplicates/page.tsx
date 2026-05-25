import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { findDuplicateCapabilityCandidates } from '@/lib/enterprise-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Capability Duplicates report (#538). Surfaces candidate-pair duplicates
 * across connected agencies using a domain-grouped name-token Jaccard
 * heuristic. First cut — pairs the EA can review side by side; no automated
 * consolidation action.
 */
export default async function EnterpriseDuplicatesReport() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const candidates = await findDuplicateCapabilityCandidates(orgId)

  // Group rendered candidates by domain so the EA scans by area.
  const byDomain = new Map<string, typeof candidates>()
  for (const c of candidates) {
    const k = c.domain ?? '(no domain)'
    const list = byDomain.get(k) ?? []
    list.push(c)
    byDomain.set(k, list)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span>Capability Duplicates</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Capability Duplicates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Candidate duplicate capabilities across connected agencies. Pairs are flagged when their names share enough meaningful tokens within the same domain. First-cut heuristic — review side-by-side and decide whether consolidation makes sense.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No candidate duplicates surfaced across the capabilities you can currently see. As more agencies connect and publish capabilities, this report will populate. (Same-org duplicates are intentionally excluded — that&apos;s a different concern handled inside each org&apos;s catalog.)
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byDomain.entries()).map(([domain, pairs]) => (
            <section key={domain}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {domain} <span className="font-normal text-muted-foreground">— {pairs.length} candidate pair{pairs.length === 1 ? '' : 's'}</span>
              </h2>
              <div className="space-y-3">
                {pairs.map((c, i) => (
                  <Card key={`${c.a.id}-${c.b.id}-${i}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <CardTitle className="text-sm font-semibold">Possible overlap</CardTitle>
                        <span className="text-xs text-muted-foreground shrink-0">
                          similarity {Math.round(c.similarity * 100)}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 pt-0">
                      <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {c.a.orgName}
                        </p>
                        <p className="text-sm font-medium">
                          <Link href={`/capabilities/${c.a.id}`} className="hover:underline">{c.a.name}</Link>
                        </p>
                        {c.a.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3">{c.a.description}</p>
                        )}
                      </div>
                      <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {c.b.orgName}
                        </p>
                        <p className="text-sm font-medium">
                          <Link href={`/capabilities/${c.b.id}`} className="hover:underline">{c.b.name}</Link>
                        </p>
                        {c.b.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3">{c.b.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        Heuristic: token-set Jaccard similarity over capability names (stopwords removed) within the same <code className="bg-muted px-1 rounded">domain</code>. Same-org pairs are excluded. Refinements over time may add semantic similarity, shared-applications signal, or vendor overlap.
      </p>
    </div>
  )
}
