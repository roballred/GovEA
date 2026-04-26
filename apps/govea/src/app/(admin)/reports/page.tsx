import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generated summaries derived from your GovEA repository. No duplicate documentation — these reports read directly from your existing records.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Architecture Outputs</p>
        <div className="grid gap-3">
          <Link
            href="/reports/architecture-vision"
            className="group rounded-lg border bg-card px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">Architecture Vision</p>
                <p className="text-xs text-muted-foreground">
                  Synthesizes objectives, capabilities, stakeholders, principles, decisions, and roadmap into one architect-facing summary. Gaps are surfaced explicitly.
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
