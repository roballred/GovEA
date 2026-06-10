import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db/client'
import { applications } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { taxonomyTypeExists } from '@/lib/reports/group-by-taxonomy'

// #673 — domain order/labels are now read from the "TOGAF Architecture Domain"
// taxonomy (slug togaf-architecture-domain); this local list only fixes display
// order. The report no longer depends on framework_mappings.
const TOGAF_DOMAIN_ORDER = [
  'Business Architecture',
  'Application Architecture',
  'Technology Architecture',
  'Data Architecture',
] as const
type TogafDomain = string

// ── Styles ────────────────────────────────────────────────────────────────────

const LIFECYCLE_STYLES: Record<string, string> = {
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  deprecated:  'bg-amber-50   text-amber-700   border-amber-200',
  sunset:      'bg-red-50     text-red-700     border-red-200',
  planned:     'bg-blue-50    text-blue-700    border-blue-200',
}

const DOMAIN_STYLES: Record<string, string> = {
  'Business Architecture':    'bg-violet-50 text-violet-700 border-violet-200',
  'Application Architecture': 'bg-blue-50   text-blue-700   border-blue-200',
  'Technology Architecture':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Data Architecture':        'bg-amber-50  text-amber-700  border-amber-200',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ domain, count }: { domain: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold', DOMAIN_STYLES[domain] ?? 'bg-slate-100 text-slate-700 border-slate-200')}>
        {domain}
      </span>
      <span className="text-xs text-muted-foreground">{count} application{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

function AppRow({
  app,
  note,
}: {
  app: { id: string; name: string; vendor: string | null; lifecycleStatus: string; capabilities: { name: string }[] }
  note?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="space-y-0.5 min-w-0">
        <Link href={`/applications/${app.id}`} className="text-sm font-medium hover:text-primary transition-colors">
          {app.name}
        </Link>
        {app.vendor && <p className="text-xs text-muted-foreground">{app.vendor}</p>}
        {app.capabilities.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Capabilities: {app.capabilities.map(c => c.name).join(', ')}
          </p>
        )}
        {note && <p className="text-xs text-muted-foreground italic">{note}</p>}
      </div>
      <span className={cn('inline-flex items-center shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium', LIFECYCLE_STYLES[app.lifecycleStatus] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>
        {app.lifecycleStatus.charAt(0).toUpperCase() + app.lifecycleStatus.slice(1)}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ApplicationLandscapePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // TOGAF Architecture Domain is a framework-audience classification
  // (ADR-0001/0002): hidden from viewer-role / stakeholder-facing output.
  if (session.user.role === 'viewer') notFound()

  const orgId = session.user.organizationId!
  // #675 — gate on recipe presence (the taxonomy being installed), not a module flag.
  if (!(await taxonomyTypeExists(orgId, 'togaf-architecture-domain'))) notFound()

  // Fetch all published applications with their capability links
  const allApps = await db.query.applications.findMany({
    where: and(
      eq(applications.organizationId, orgId),
      eq(applications.status, 'published'),
    ),
    with: {
      applicationCapabilities: {
        with: { capability: true },
      },
    },
    orderBy: (t, { asc }) => [asc(t.name)],
  })

  // Domain assignments from the "TOGAF Architecture Domain" taxonomy (#673),
  // for capabilities + applications. Replaces the framework_mappings read.
  const mappingsByEntity = new Map<string, TogafDomain[]>()
  const domainType = await db.query.taxonomyTerms.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.organizationId, orgId), n(t.parentId), e(t.slug, 'togaf-architecture-domain')),
  })
  if (domainType) {
    const terms = await db.query.taxonomyTerms.findMany({
      where: (t, { eq: e, and: a }) => a(e(t.organizationId, orgId), e(t.parentId, domainType.id)),
    })
    if (terms.length > 0) {
      const domainNameByTermId = new Map(terms.map(t => [t.id, t.name]))
      const termIds = terms.map(t => t.id)
      const values = await db.query.entityTaxonomyValues.findMany({
        where: (v, { eq: e, and: a, inArray }) =>
          a(e(v.organizationId, orgId), inArray(v.entityType, ['capability', 'application']), inArray(v.taxonomyTermId, termIds)),
      })
      for (const v of values) {
        const domain = domainNameByTermId.get(v.taxonomyTermId)
        if (!domain) continue
        const existing = mappingsByEntity.get(v.entityId) ?? []
        if (!existing.includes(domain)) existing.push(domain)
        mappingsByEntity.set(v.entityId, existing)
      }
    }
  }

  // Normalise apps into a shape the report can use
  type ReportApp = {
    id: string
    name: string
    vendor: string | null
    lifecycleStatus: string
    capabilities: { id: string; name: string }[]
    directDomains: TogafDomain[]
    derivedDomains: { domain: TogafDomain; fromCapability: string }[]
  }

  const reportApps: ReportApp[] = allApps.map(a => {
    const caps = a.applicationCapabilities.map(ac => ({
      id: ac.capability.id,
      name: ac.capability.name,
    }))
    const directDomains = mappingsByEntity.get(a.id) ?? []
    const derivedDomains: { domain: TogafDomain; fromCapability: string }[] = []

    if (directDomains.length === 0) {
      for (const cap of caps) {
        const capDomains = mappingsByEntity.get(cap.id) ?? []
        for (const d of capDomains) {
          if (!derivedDomains.some(x => x.domain === d)) {
            derivedDomains.push({ domain: d, fromCapability: cap.name })
          }
        }
      }
    }

    return { id: a.id, name: a.name, vendor: a.vendor, lifecycleStatus: a.lifecycleStatus, capabilities: caps, directDomains, derivedDomains }
  })

  // Bucket into three groups
  const directMapped  = reportApps.filter(a => a.directDomains.length > 0)
  const derivedMapped = reportApps.filter(a => a.directDomains.length === 0 && a.derivedDomains.length > 0)
  const unmapped      = reportApps.filter(a => a.directDomains.length === 0 && a.derivedDomains.length === 0)

  // Group direct-mapped by domain (an app can appear under multiple domains)
  const byDomain = new Map<TogafDomain, ReportApp[]>()
  for (const domain of TOGAF_DOMAIN_ORDER) {
    const appsForDomain = directMapped.filter(a => a.directDomains.includes(domain))
    if (appsForDomain.length > 0) byDomain.set(domain, appsForDomain)
  }

  const totalApps = allApps.length

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Reports
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Application Landscape</h1>
        <p className="text-sm text-muted-foreground">
          TOGAF-aligned view of the application portfolio, grouped by Architecture Domain.
        </p>
      </div>

      <div className="flex gap-6 text-sm">
        <div><span className="font-semibold">{totalApps}</span> <span className="text-muted-foreground">total</span></div>
        <div><span className="font-semibold">{directMapped.length}</span> <span className="text-muted-foreground">mapped</span></div>
        <div><span className="font-semibold">{derivedMapped.length}</span> <span className="text-muted-foreground">derived</span></div>
        <div><span className="font-semibold text-amber-600">{unmapped.length}</span> <span className="text-muted-foreground">unmapped</span></div>
      </div>

      <hr />

      {/* ── Direct mappings ── */}
      {byDomain.size > 0 && (
        <section className="space-y-6">
          {TOGAF_DOMAIN_ORDER.filter(d => byDomain.has(d)).map(domain => (
            <div key={domain}>
              <SectionHeading domain={domain} count={byDomain.get(domain)!.length} />
              <div className="rounded-lg border border-border bg-card divide-y">
                {byDomain.get(domain)!.map(app => (
                  <AppRow key={app.id} app={app} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Derived mappings ── */}
      {derivedMapped.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Inferred from capability mappings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              These applications have no direct domain assignment. The domain is inferred from a linked capability.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y">
            {derivedMapped.map(app => (
              <AppRow
                key={app.id}
                app={app}
                note={`Domain inferred from: ${app.derivedDomains.map(d => `${d.domain} (${d.fromCapability})`).join(', ')}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Unmapped gap ── */}
      {unmapped.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Not yet mapped</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              These applications have not been assigned to a TOGAF Architecture Domain — either directly or via a capability.
              Open a capability to add a TOGAF domain mapping.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 divide-y divide-amber-200 dark:divide-amber-900">
            {unmapped.map(app => (
              <AppRow key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {totalApps === 0 && (
        <p className="text-sm text-muted-foreground">No published applications found.</p>
      )}

      <p className="text-xs text-muted-foreground border-t pt-4">
        Generated from published records only. Gaps indicate missing mappings, not missing systems.
        This report uses TOGAF Architecture Domain labels for grouping.
        It does not assert TOGAF process conformance.{' '}
        <Link href="/applications" className="underline underline-offset-2 hover:text-foreground">View all applications →</Link>
      </p>
    </div>
  )
}
