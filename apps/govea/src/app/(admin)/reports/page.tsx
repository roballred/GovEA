import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { taxonomyTypeExists } from '@/lib/reports/group-by-taxonomy'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  // #675 — the TOGAF reports section appears when the TOGAF recipe is installed
  // (its taxonomy types exist), not behind a module toggle. Hidden from viewers
  // (framework audience).
  const togafInstalled = session.user.role !== 'viewer' && (
    await taxonomyTypeExists(orgId, 'togaf-architecture-domain') ||
    await taxonomyTypeExists(orgId, 'togaf-adm-phase')
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Generated summaries derived from your GovEA repository. No duplicate documentation — these reports read directly from your existing records.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Architecture Outputs</h2>
        <div className="rounded-lg border border-border bg-card divide-y">
          <Link
            href="/reports/architecture-vision"
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Architecture Vision</p>
              <p className="text-xs text-muted-foreground mt-0.5">Synthesizes objectives, capabilities, stakeholders, principles, decisions, and roadmap into one architect-facing summary. Gaps are surfaced explicitly.</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
          <Link
            href="/reports/heatmap"
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Heatmap Analysis</p>
              <p className="text-xs text-muted-foreground mt-0.5">Portfolio pattern view — lifecycle health by domain, hosting model distribution, and capability coverage gaps at a glance.</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
          <Link
            href="/reports/duplicates"
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Repository Duplicates</p>
              <p className="text-xs text-muted-foreground mt-0.5">Candidate duplicate records across every entity type in your repository, including taxonomy types, values, and conflicting assignments. Exact and near matches, grouped for review.</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
        </div>
      </section>

      {/* #537 + #538 — Enterprise Architect persona aggregations across the
          multi-org federation substrate. Visible to every authenticated user
          (they aggregate only what the caller can already read). */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Enterprise View</h2>
        <div className="rounded-lg border border-border bg-card divide-y">
          <Link
            href="/reports/enterprise-adoption"
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Capability Adoption</p>
              <p className="text-xs text-muted-foreground mt-0.5">Which agencies have linked to the capabilities your organization publishes instance-wide. Inbound capability→capability links, aggregated.</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
          <Link
            href="/reports/enterprise-duplicates"
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Capability Duplicates</p>
              <p className="text-xs text-muted-foreground mt-0.5">Candidate-pair duplicates across connected agencies. Domain-grouped, side-by-side. First-cut heuristic — review and decide whether consolidation makes sense.</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
        </div>
      </section>

      {togafInstalled && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">TOGAF Framework</h2>
          <div className="rounded-lg border border-border bg-card divide-y">
            <Link
              href="/reports/togaf/application-landscape"
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Application Landscape</p>
                <p className="text-xs text-muted-foreground mt-0.5">Application portfolio grouped by TOGAF Architecture Domain</p>
              </div>
              <span className="text-muted-foreground text-sm">→</span>
            </Link>
            <Link
              href="/reports/togaf/adm-coverage"
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">ADM Coverage</p>
                <p className="text-xs text-muted-foreground mt-0.5">Capabilities &amp; initiatives grouped by TOGAF ADM Phase (classification only)</p>
              </div>
              <span className="text-muted-foreground text-sm">→</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
