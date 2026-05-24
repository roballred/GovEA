import Link from 'next/link'
import { ConfidenceSummary } from '@/components/confidence-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Viewer-mode dashboard (#548).
 *
 * The Elected Official, CMS Viewer, and Business Stakeholder personas all
 * surfaced the same gap during the audit: the admin dashboard is too dense
 * and too technical to function as a stakeholder reader entry. Rather than
 * try to make one dashboard serve both, this component is the Viewer-specific
 * variant — confidence summary, plain-language entry tiles to the four
 * pages a non-authoring reader actually uses, and no admin metrics.
 *
 * The auth-redirect bouncer routes Viewers to `/executive` after sign-in, so
 * a Viewer should only reach this page by clicking "Dashboard" in the nav —
 * but it still has to be honest when they do.
 */
export function ViewerDashboard({ orgId, userName }: { orgId: string; userName: string | null }) {
  const greeting = userName ? `Welcome, ${userName.split(' ')[0]}` : 'Welcome'
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          GovEA describes what the organization does and the technology that supports it.
          Use the views below to explore — no editing is required.
        </p>
      </div>

      <ConfidenceSummary orgId={orgId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/executive" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="text-base">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              A one-page view of the most-significant capabilities, applications, initiatives, and decisions. Designed for non-technical readers.
            </CardContent>
          </Card>
        </Link>

        <Link href="/roadmap" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="text-base">Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {`Initiatives plotted across fiscal quarters. See what's planned, in progress, and recently complete.`}
            </CardContent>
          </Card>
        </Link>

        <Link href="/answers" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="text-base">Guided Answers</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {`Plain-language questions that resolve to the right content — "What does the city do?", "Which applications support permitting?", "Why did we choose Postgres?"`}
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="text-base">Reports</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Architecture Vision, capability heatmap, and TOGAF rollups. Generated views — no setup required.
            </CardContent>
          </Card>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Need to author or edit? Ask an administrator to upgrade your role to Contributor.
      </p>
    </div>
  )
}
