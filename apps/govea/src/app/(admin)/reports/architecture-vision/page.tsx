import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import {
  strategicObjectives, capabilities, personas, applications,
  principles, adrs, initiatives, organizations, capabilityRelationships,
} from '@/db/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { resolveCapabilityDomain } from '@/lib/capability-tree'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Styles ────────────────────────────────────────────────────────────────────

const ADR_STATUS_STYLES: Record<string, string> = {
  proposed:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  accepted:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  deprecated: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  superseded: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}

const INITIATIVE_STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-mono text-muted-foreground shrink-0 w-5">{number}</span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function GapCallout({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <svg className="h-3.5 w-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span>{message}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArchitectureVisionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const enabledModules = await getEnabledModules()

  const hasObjectives  = isModuleEnabled(enabledModules, 'objectives')
  const hasPersonas    = isModuleEnabled(enabledModules, 'personas')
  const hasApps        = isModuleEnabled(enabledModules, 'applications')
  const hasPrinciples  = isModuleEnabled(enabledModules, 'principles')
  const hasAdrs        = isModuleEnabled(enabledModules, 'adrs')
  const hasInitiatives = isModuleEnabled(enabledModules, 'initiatives')

  const [
    org,
    objectiveRows,
    capabilityRows,
    personaRows,
    applicationRows,
    principleRows,
    adrRows,
    initiativeRows,
  ] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),

    hasObjectives
      ? db.query.strategicObjectives.findMany({
          where: and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.status, 'published')),
          with: { objectiveCapabilities: true },
          orderBy: (o, { asc }) => [asc(o.timeHorizon), asc(o.name)],
        })
      : Promise.resolve([]),

    db.query.capabilities.findMany({
      where: and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published')),
      with: {
        objectiveCapabilities: true,
        applicationCapabilities: true,
      },
      orderBy: (c, { asc }) => [asc(c.domain), asc(c.name)],
    }),

    hasPersonas
      ? db.query.personas.findMany({
          where: and(eq(personas.organizationId, orgId), eq(personas.status, 'published')),
          orderBy: (p, { asc }) => [asc(p.type), asc(p.name)],
        })
      : Promise.resolve([]),

    hasApps
      ? db.query.applications.findMany({
          where: and(eq(applications.organizationId, orgId), eq(applications.status, 'published')),
          with: { applicationCapabilities: true },
          orderBy: (a, { asc }) => [asc(a.lifecycleStatus), asc(a.name)],
        })
      : Promise.resolve([]),

    hasPrinciples
      ? db.query.principles.findMany({
          where: and(eq(principles.organizationId, orgId), eq(principles.status, 'published')),
          orderBy: (p, { asc }) => [asc(p.principleType), asc(p.name)],
        })
      : Promise.resolve([]),

    hasAdrs
      ? db.query.adrs.findMany({
          where: and(
            eq(adrs.organizationId, orgId),
            isNull(adrs.supersededBy),
          ),
          orderBy: (a, { asc }) => [asc(a.number)],
        })
      : Promise.resolve([]),

    hasInitiatives
      ? db.query.initiatives.findMany({
          where: and(
            eq(initiatives.organizationId, orgId),
          ),
          with: { initiativeCapabilities: { with: { capability: true } } },
          orderBy: (i, { asc }) => [asc(i.startDate), asc(i.name)],
        })
      : Promise.resolve([]),
  ])

  // Fetch parent relationships separately for domain inheritance (avoids Drizzle self-referential caching issue)
  const capIds = capabilityRows.map(c => c.id)
  const parentRels = capIds.length > 0
    ? await db.select({ parentId: capabilityRelationships.parentId, childId: capabilityRelationships.childId })
        .from(capabilityRelationships).where(inArray(capabilityRelationships.childId, capIds))
    : []
  const capById = new Map(capabilityRows.map(c => ({
    ...c,
    childRelationships: [] as { parentId: string; childId: string }[],
    parentRelationships: parentRels.filter(r => r.childId === c.id),
  })).map(c => [c.id, c]))

  // Derived stats
  const capsWithObjective = capabilityRows.filter(c => c.objectiveCapabilities.length > 0).length
  const capsWithApp       = capabilityRows.filter(c => c.applicationCapabilities.length > 0).length
  const capsWithNoDomain  = capabilityRows.filter(c => !resolveCapabilityDomain(c.id, capById))
  const appsWithNoCap     = applicationRows.filter(a => a.applicationCapabilities.length === 0)
  const activeInitiatives = initiativeRows.filter(i => i.status === 'active' || i.status === 'proposed')

  // Application portfolio summary — grouped by lifecycle status
  const APP_LIFECYCLE_ORDER = ['active', 'planned', 'sunset', 'decommissioned'] as const
  type LifecycleKey = typeof APP_LIFECYCLE_ORDER[number]
  const appsByLifecycle = new Map<LifecycleKey | string, { total: number; noCap: number }>()
  for (const app of applicationRows) {
    const key = app.lifecycleStatus ?? 'active'
    const row = appsByLifecycle.get(key) ?? { total: 0, noCap: 0 }
    row.total++
    if (app.applicationCapabilities.length === 0) row.noCap++
    appsByLifecycle.set(key, row)
  }
  const appLifecycleRows = [
    ...APP_LIFECYCLE_ORDER.filter(k => appsByLifecycle.has(k)).map(k => [k, appsByLifecycle.get(k)!] as const),
    ...[...appsByLifecycle.entries()].filter(([k]) => !APP_LIFECYCLE_ORDER.includes(k as LifecycleKey)),
  ]
  const appsWithCapLink = applicationRows.length - appsWithNoCap.length

  // Group capabilities by resolved domain (walks ancestors if own domain is null)
  const capsByDomain = new Map<string, typeof capabilityRows>()
  for (const cap of capabilityRows) {
    const key = resolveCapabilityDomain(cap.id, capById) ?? '(No domain assigned)'
    const existing = capsByDomain.get(key) ?? []
    existing.push(cap)
    capsByDomain.set(key, existing)
  }

  // Group objectives by time horizon
  const objectivesByHorizon = new Map<string, typeof objectiveRows>()
  for (const obj of objectiveRows) {
    const key = obj.timeHorizon ?? 'Unspecified horizon'
    const existing = objectivesByHorizon.get(key) ?? []
    existing.push(obj)
    objectivesByHorizon.set(key, existing)
  }

  // Group personas by type
  const personasByType = new Map<string, typeof personaRows>()
  for (const p of personaRows) {
    const key = p.type ?? 'Unclassified'
    const existing = personasByType.get(key) ?? []
    existing.push(p)
    personasByType.set(key, existing)
  }

  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Collect auto-detected gaps
  const gaps: string[] = []
  if (hasObjectives && objectiveRows.length === 0) gaps.push('No published strategic objectives — the mission rationale for this architecture is undocumented.')
  if (capabilityRows.length === 0) gaps.push('No published capabilities — the architecture scope cannot be determined.')
  if (capabilityRows.length > 0 && capsWithObjective === 0) gaps.push('No capabilities are linked to a strategic objective — mission traceability is absent.')
  if (hasApps && applicationRows.length > 0 && appsWithNoCap.length === applicationRows.length) gaps.push('No applications are linked to a capability — the technology-to-capability mapping is missing.')
  if (hasPersonas && personaRows.length === 0) gaps.push('No published personas — stakeholder coverage is undocumented.')
  if (hasPrinciples && principleRows.length === 0) gaps.push('No published architecture principles — guiding constraints are not recorded.')
  if (hasAdrs && adrRows.length === 0) gaps.push('No architecture decisions recorded — key choices are undocumented.')
  if (hasInitiatives && activeInitiatives.length === 0) gaps.push('No active or proposed initiatives — the change roadmap is empty.')
  if (capsWithNoDomain.length > 0) gaps.push(`${capsWithNoDomain.length} ${capsWithNoDomain.length === 1 ? 'capability has' : 'capabilities have'} no domain assigned.`)
  if (hasApps && appsWithNoCap.length > 0) gaps.push(`${appsWithNoCap.length} application${appsWithNoCap.length !== 1 ? 's' : ''} have no capability link — architecture role is unclear.`)

  let sectionNum = 0
  function nextSection() { return String(++sectionNum) }

  return (
    <div className="space-y-10 max-w-3xl">

      {/* Header */}
      <div className="space-y-2">
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Reports
        </Link>
        <div className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight">Architecture Vision</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {org?.name} · Generated {generatedDate}
          </p>
        </div>
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
          This summary is generated from your GovEA repository. It reflects your recorded content at the time of generation and does not constitute formal TOGAF compliance attestation.
        </p>
      </div>

      <hr />

      {/* 1. Strategic Drivers */}
      {hasObjectives && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Strategic Drivers"
            subtitle="Published objectives that define the mission context for this architecture."
          />
          {objectiveRows.length === 0 ? (
            <GapCallout message="No published strategic objectives found. Add objectives to establish the mission rationale for this architecture." />
          ) : (
            <div className="space-y-4">
              {Array.from(objectivesByHorizon.entries()).map(([horizon, objs]) => (
                <div key={horizon}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{horizon}</p>
                  <div className="rounded-lg border bg-card divide-y">
                    {objs.map(obj => (
                      <div key={obj.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/objectives/${obj.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                            {obj.name}
                          </Link>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {obj.objectiveCapabilities.length} {obj.objectiveCapabilities.length === 1 ? 'capability' : 'capabilities'} linked
                          </span>
                        </div>
                        {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
                        {obj.successMetric && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Success: </span>{obj.successMetric}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Capability Coverage */}
      <section className="space-y-4">
        <SectionHeading
          number={nextSection()}
          title="Capability Coverage"
          subtitle="What this organization does — the architecture scope."
        />
        {capabilityRows.length === 0 ? (
          <GapCallout message="No published capabilities found. Capabilities define the scope of this architecture." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Total', value: capabilityRows.length },
                { label: 'Linked to objective', value: `${capsWithObjective} / ${capabilityRows.length}` },
                { label: 'Linked to application', value: `${capsWithApp} / ${capabilityRows.length}` },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border bg-card px-3 py-3">
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Domain</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Capabilities</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Obj. linked</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">App linked</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(capsByDomain.entries()).map(([domain, caps]) => {
                    const withObj = caps.filter(c => c.objectiveCapabilities.length > 0).length
                    const withApp = caps.filter(c => c.applicationCapabilities.length > 0).length
                    return (
                      <tr key={domain}>
                        <td className="px-4 py-2.5">{domain}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{caps.length}</td>
                        <td className={cn('px-4 py-2.5 text-right tabular-nums', withObj === 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                          {withObj} / {caps.length}
                        </td>
                        <td className={cn('px-4 py-2.5 text-right tabular-nums', withApp < caps.length ? 'text-amber-600' : 'text-muted-foreground')}>
                          {withApp} / {caps.length}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              <Link href="/capabilities" className="underline underline-offset-2 hover:text-foreground">
                View full capability map →
              </Link>
            </p>
          </>
        )}
      </section>

      {/* 3. Stakeholders */}
      {hasPersonas && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Stakeholders"
            subtitle="Personas affected by or engaged with this architecture."
          />
          {personaRows.length === 0 ? (
            <GapCallout message="No published personas found. Add personas to document who this architecture serves and who governs it." />
          ) : (
            <div className="space-y-3">
              {Array.from(personasByType.entries()).map(([type, ps]) => (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{type}</p>
                  <div className="rounded-lg border bg-card divide-y">
                    {ps.map(p => (
                      <div key={p.id} className="px-4 py-2.5">
                        <Link href={`/personas/${p.id}`} className="text-sm hover:text-primary transition-colors">
                          {p.name}
                        </Link>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Application Portfolio */}
      {hasApps && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Application Portfolio"
            subtitle="Published applications in scope for this architecture."
          />
          {applicationRows.length === 0 ? (
            <GapCallout message="No published applications found. Applications document the technology that enables capabilities." />
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Total', value: applicationRows.length },
                  { label: 'Linked to capability', value: `${appsWithCapLink} / ${applicationRows.length}` },
                  { label: 'No capability link', value: appsWithNoCap.length },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg border bg-card px-3 py-3">
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Lifecycle breakdown table */}
              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Lifecycle status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Count</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">No capability link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appLifecycleRows.map(([status, row]) => (
                      <tr key={status}>
                        <td className="px-4 py-2.5 capitalize">{status}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.total}</td>
                        <td className={cn('px-4 py-2.5 text-right tabular-nums', row.noCap > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                          {row.noCap > 0 ? row.noCap : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                <Link href="/applications" className="underline underline-offset-2 hover:text-foreground">
                  View full application inventory →
                </Link>
              </p>
            </>
          )}
        </section>
      )}

      {/* 5. Architecture Principles */}
      {hasPrinciples && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Architecture Principles"
            subtitle="Published guiding constraints for this architecture."
          />
          {principleRows.length === 0 ? (
            <GapCallout message="No published principles found. Principles record the constraints and values that guide architecture decisions." />
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {principleRows.map(p => (
                <div key={p.id} className="px-4 py-3 space-y-0.5">
                  <Link href={`/principles/${p.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {p.name}
                  </Link>
                  {(p.title || p.description) && (
                    <p className="text-xs text-muted-foreground">{p.title ?? p.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Key Architecture Decisions */}
      {hasAdrs && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Key Architecture Decisions"
            subtitle="Architecture Decision Records that constrain or shape this architecture. Superseded records excluded."
          />
          {adrRows.length === 0 ? (
            <GapCallout message="No architecture decisions recorded. ADRs document the choices that constrain this architecture." />
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {adrRows.map(adr => (
                <div key={adr.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{adr.number}</span>
                      <Link href={`/adrs/${adr.id}`} className="text-sm hover:text-primary transition-colors truncate">
                        {adr.title}
                      </Link>
                    </div>
                    {adr.decision && (
                      <p className="text-xs text-muted-foreground line-clamp-1 pl-[3.25rem]">{adr.decision}</p>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium capitalize', ADR_STATUS_STYLES[adr.status] ?? ADR_STATUS_STYLES.proposed)}>
                    {adr.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 7. Change Roadmap */}
      {hasInitiatives && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Change Roadmap"
            subtitle="Active and proposed initiatives that advance this architecture."
          />
          {activeInitiatives.length === 0 ? (
            <GapCallout message="No active or proposed initiatives found. Initiatives record the work advancing this architecture toward its target state." />
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {activeInitiatives.map(initiative => (
                <div key={initiative.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <Link href={`/initiatives/${initiative.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {initiative.name}
                    </Link>
                    {(initiative.startDate || initiative.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        {[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}
                      </p>
                    )}
                    {initiative.initiativeCapabilities.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Capabilities: {initiative.initiativeCapabilities.map(ic => ic.capability.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium capitalize', INITIATIVE_STATUS_STYLES[initiative.status] ?? INITIATIVE_STATUS_STYLES.proposed)}>
                    {initiative.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 8. Architecture Gaps */}
      {gaps.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            number={nextSection()}
            title="Architecture Gaps"
            subtitle="Issues detected automatically from your repository. Address these to strengthen the architecture record."
          />
          <ul className="space-y-2">
            {gaps.map((gap, i) => (
              <li key={i}>
                <GapCallout message={gap} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <p className="text-xs text-muted-foreground border-t pt-4">
        Generated from published records only. Content in draft or archived status is excluded.
        This report does not assert TOGAF process conformance.{' '}
        <Link href="/reports" className="underline underline-offset-2 hover:text-foreground">← Back to reports</Link>
      </p>
    </div>
  )
}
