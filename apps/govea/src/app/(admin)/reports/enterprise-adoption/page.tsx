import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCapabilityAdoption } from '@/lib/enterprise-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const LINK_TYPE_BADGE: Record<string, string> = {
  implements: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  extends:    'bg-blue-100 text-blue-800 border-blue-200',
  maps_to:    'bg-violet-100 text-violet-800 border-violet-200',
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending:  'bg-amber-100 text-amber-800 border-amber-200',
  rejected: 'bg-slate-100 text-slate-700 border-slate-200',
}

/**
 * Capability Adoption report (#537). For each instance-visibility capability
 * the caller's org publishes, lists the agencies that have linked to it and
 * with what link type / status. Aggregates a top-line summary so the EA can
 * see "X capabilities published · Y adopted · Z pending approval" at a glance.
 */
export default async function EnterpriseAdoptionReport() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const orgId = session.user.organizationId!

  const report = await getCapabilityAdoption(orgId)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span>Capability Adoption</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Capability Adoption</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Which agencies have linked to the capabilities your organization publishes instance-wide. Inbound capability→capability links only.
        </p>
      </div>

      {/* Top-line aggregates */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{report.publishedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adopted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{report.adoptedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending approval</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{report.pendingApprovalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distinct agencies</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{report.agencyCount}</CardContent>
        </Card>
      </div>

      {report.publishedCount === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Your organization has no <code className="rounded bg-muted px-1">instance</code>-visibility capabilities yet. Set a capability&apos;s visibility to <em>Instance-wide</em> for it to show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {report.capabilities.map(c => (
            <Card key={c.id} className={cn(c.links.length === 0 && 'opacity-70')}>
              <CardHeader className="pb-2">
                <div className="flex items-baseline justify-between gap-3">
                  <CardTitle className="text-base">
                    <Link href={`/capabilities/${c.id}`} className="hover:underline">{c.name}</Link>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {c.links.length === 0
                      ? 'No agency links yet'
                      : `${c.links.length} link${c.links.length === 1 ? '' : 's'} from ${new Set(c.links.map(l => l.sourceOrgId)).size} agenc${new Set(c.links.map(l => l.sourceOrgId)).size === 1 ? 'y' : 'ies'}`}
                  </span>
                </div>
                {c.domain && (
                  <p className="text-xs text-muted-foreground">{c.domain}</p>
                )}
              </CardHeader>
              {c.links.length > 0 && (
                <CardContent className="space-y-1.5 pt-0">
                  {c.links.map(l => (
                    <div key={`${l.sourceCapabilityId}-${l.linkType}`} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{l.sourceOrgName}</span>
                        <span className="text-muted-foreground"> — </span>
                        <Link href={`/capabilities/${l.sourceCapabilityId}`} className="hover:underline">{l.sourceCapabilityName}</Link>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', LINK_TYPE_BADGE[l.linkType])}>
                          {l.linkType.replace('_', ' ')}
                        </span>
                        <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', STATUS_BADGE[l.status])}>
                          {l.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
