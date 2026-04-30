import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import Link from 'next/link'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const enabledModules = await getEnabledModules()
  const frameworkOverlay = isModuleEnabled(enabledModules, 'framework-overlay')

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
        </div>
      </section>

      {frameworkOverlay && (
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
          </div>
        </section>
      )}
    </div>
  )
}
