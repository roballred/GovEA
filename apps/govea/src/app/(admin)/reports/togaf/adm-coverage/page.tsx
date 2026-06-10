import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db/client'
import { capabilities, initiatives } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { groupByTaxonomyType, taxonomyTypeExists, type GroupByTaxonomyResult, type TaxonomyGroup, type EntityRef } from '@/lib/reports/group-by-taxonomy'

function CoverageSection({ label, hrefBase, result }: { label: string; hrefBase: string; result: GroupByTaxonomyResult | null }) {
  if (!result) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold">{label}</h2>
        <p className="text-sm text-muted-foreground">The ADM Phase taxonomy is not installed for this organization.</p>
      </section>
    )
  }
  const taggedGroups = result.groups.filter((g: TaxonomyGroup) => g.members.length > 0)
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-base font-semibold">{label}</h2>
        <span className="text-xs text-muted-foreground">
          {result.total - result.unmapped.length} of {result.total} tagged
        </span>
      </div>
      {taggedGroups.map((g: TaxonomyGroup) => (
        <div key={g.termId}>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center rounded border bg-slate-100 text-slate-700 border-slate-200 px-2 py-0.5 text-xs font-semibold">{g.termName}</span>
            <span className="text-xs text-muted-foreground">{g.members.length}</span>
          </div>
          <div className="rounded-lg border bg-card divide-y">
            {g.members.map((m: EntityRef) => (
              <Link key={m.id} href={`${hrefBase}/${m.id}`} className="block px-4 py-2 text-sm hover:bg-muted/40">{m.name}</Link>
            ))}
          </div>
        </div>
      ))}
      {result.unmapped.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center rounded border bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5 text-xs font-semibold">No ADM phase</span>
            <span className="text-xs text-muted-foreground">{result.unmapped.length}</span>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 divide-y divide-amber-200 dark:divide-amber-900">
            {result.unmapped.map((m: EntityRef) => (
              <Link key={m.id} href={`${hrefBase}/${m.id}`} className="block px-4 py-2 text-sm hover:bg-amber-100/40">{m.name}</Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default async function AdmCoveragePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  // ADM Phase is a framework-audience classification (ADR-0001/0002): hidden
  // from viewer-role / stakeholder-facing output.
  if (session.user.role === 'viewer') notFound()
  // #675 — gate on recipe presence (the taxonomy being installed), not a module flag.
  if (!(await taxonomyTypeExists(orgId, 'togaf-adm-phase'))) notFound()

  const [caps, inits] = await Promise.all([
    db.select({ id: capabilities.id, name: capabilities.name }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ id: initiatives.id, name: initiatives.name }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
  ])
  const [capResult, initResult] = await Promise.all([
    groupByTaxonomyType(orgId, 'capability', 'togaf-adm-phase', caps),
    groupByTaxonomyType(orgId, 'initiative', 'togaf-adm-phase', inits),
  ])

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Reports</Link>
        <h1 className="text-2xl font-bold tracking-tight">ADM Coverage</h1>
        <p className="text-sm text-muted-foreground">
          Capabilities and initiatives grouped by their TOGAF ADM Phase classification. This is read-only classification reporting — it asserts no conformance and gates nothing (ADR-0002).
        </p>
      </div>
      <CoverageSection label="Capabilities by ADM Phase" hrefBase="/capabilities" result={capResult} />
      <CoverageSection label="Initiatives by ADM Phase" hrefBase="/initiatives" result={initResult} />
    </div>
  )
}
