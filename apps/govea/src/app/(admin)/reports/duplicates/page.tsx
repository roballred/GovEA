import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getRepositoryDuplicateReport } from '@/lib/duplicate-report-data'
import type { DuplicateGroup } from '@/lib/duplicate-report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Repository Duplicates report (#718). Same-org duplicate candidates across
 * every repository entity type, plus taxonomy types, values, and conflicting
 * entity-taxonomy assignments. Complements the cross-agency Capability
 * Duplicates report (#538), which deliberately excludes same-org pairs.
 *
 * Detection only — candidates are surfaced for human review; nothing is
 * merged, deleted, or mutated.
 */
export default async function RepositoryDuplicatesReport() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const sections = await getRepositoryDuplicateReport(orgId)
  const totalGroups = sections.reduce((n, s) => n + s.groups.length, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span>Repository Duplicates</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Repository Duplicates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Candidate duplicate records across your organization&apos;s repository — naming drift makes the
          same capability, term, or taxonomy value look like separate work. <strong>Exact</strong> groups
          match after normalizing case, punctuation, and whitespace; <strong>near</strong> groups share
          most meaningful name tokens within the same grouping (domain or taxonomy type). Review each
          group and decide — nothing is merged or deleted automatically.
        </p>
      </div>

      {totalGroups === 0 && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No duplicate candidates found anywhere in the repository. As records are added — especially
          via CSV import, starter content, or framework recipes — re-check this report periodically.
        </div>
      )}

      {sections.map(section => (
        <section key={section.key}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {section.label}{' '}
            <span className="font-normal">
              — {section.groups.length === 0
                ? `no candidates (${section.scanned} scanned)`
                : `${section.groups.length} candidate group${section.groups.length === 1 ? '' : 's'}`}
            </span>
          </h2>
          {section.groups.length > 0 && (
            <div className="space-y-3 mb-6">
              {section.groups.map((group, i) => (
                <DuplicateGroupCard key={`${section.key}-${i}`} group={group} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle className="text-sm font-semibold">
            {group.records.length} records with {group.tier === 'exact' ? 'the same name' : 'similar names'}
          </CardTitle>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              group.tier === 'exact'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
            )}
          >
            {group.tier === 'exact' ? 'Exact match' : `Near match · ${Math.round(group.similarity * 100)}%`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y">
          {group.records.map(r => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                {r.href ? (
                  <Link href={r.href} className="font-medium hover:underline">{r.name}</Link>
                ) : (
                  <span className="font-medium">{r.name}</span>
                )}
                {r.context && (
                  <span className="ml-2 text-xs text-muted-foreground">{r.context}</span>
                )}
              </div>
              {r.status && (
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {r.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
