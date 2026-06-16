import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getInitiative, getRelatedInitiatives } from '@/actions/initiatives'
import { getCapabilities } from '@/actions/capabilities'
import { getObjectives } from '@/actions/objectives'
import { getApplications } from '@/actions/applications'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import type { RelationshipItem } from '@/components/relationship-panel'
import { RelatedInitiativesPanel } from '@/components/related-initiatives-panel'
import {
  linkInitiativeCapability, unlinkInitiativeCapability,
  linkInitiativeObjective, unlinkInitiativeObjective,
  linkInitiativeApplication, unlinkInitiativeApplication,
  linkInitiativeStrategy, unlinkInitiativeStrategy,
} from '@/actions/links'
import { getStrategies } from '@/actions/strategies'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { MarkdownContent } from '@/components/markdown-content'
import { TaxonomyChips } from '@/components/taxonomy-ui'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'on-hold': 'bg-amber-100 text-amber-800 border-amber-200',
  complete: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed', active: 'Active', 'on-hold': 'On Hold',
  complete: 'Complete', cancelled: 'Cancelled',
}

const IMPACT_STYLES: Record<string, string> = {
  build: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  improve: 'bg-blue-50 text-blue-700 border-blue-200',
  retire: 'bg-red-50 text-red-700 border-red-200',
  migrate: 'bg-amber-50 text-amber-700 border-amber-200',
}

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only', connections: 'Connected orgs', instance: 'Instance-wide',
}

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [initiative, enabledModules, relatedInitiatives] = await Promise.all([
    getInitiative(id),
    getEnabledModules(),
    getRelatedInitiatives(id),
  ])
  if (!initiative) notFound() // also catches viewer status gate enforced in getInitiative (#208)

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && initiative.organizationId === orgId

  const [allCapabilities, allObjectives, allApplications, allStrategies] = editor
    ? await Promise.all([
        getCapabilities(),
        getObjectives(),
        getApplications(),
        getStrategies(orgId, session.user.role),
      ])
    : [[], [], [], []]

  const addCapability = linkInitiativeCapability.bind(null, id)
  const removeCapability = unlinkInitiativeCapability.bind(null, id)
  const addObjective = linkInitiativeObjective.bind(null, id)
  const removeObjective = unlinkInitiativeObjective.bind(null, id)
  const addApplication = linkInitiativeApplication.bind(null, id)
  const removeApplication = unlinkInitiativeApplication.bind(null, id)
  const addStrategy = linkInitiativeStrategy.bind(null, id)
  const removeStrategy = unlinkInitiativeStrategy.bind(null, id)
  const linkedStrategyIds = new Set(initiative.strategyInitiatives.map(si => si.strategyId))

  const capabilityItems: RelationshipItem[] = initiative.initiativeCapabilities.map(({ capability, impact }) => ({
    id: capability.id, name: capability.name,
    href: `/capabilities/${capability.id}`, meta: capability.domain,
    badge: impact ? (
      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', IMPACT_STYLES[impact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
        {impact}
      </span>
    ) : undefined,
  }))

  const applicationItems: RelationshipItem[] = initiative.initiativeApplications.map(({ application, impact }) => ({
    id: application.id, name: application.name,
    href: `/applications/${application.id}`, meta: application.vendor,
    badge: impact ? (
      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', IMPACT_STYLES[impact] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
        {impact}
      </span>
    ) : undefined,
  }))

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/initiatives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Initiatives
        </Link>
        <ViewTraceabilityLink from="initiative" id={id} />
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{initiative.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[initiative.status])}>
              {STATUS_LABELS[initiative.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[initiative.visibility])}>
              {VISIBILITY_LABELS[initiative.visibility]}
            </span>
          </div>
        </div>

        {initiative.description && (
          <MarkdownContent>{initiative.description}</MarkdownContent>
        )}

        <TaxonomyChips
          definitions={initiative.taxonomyDefinitions}
          selectedTermIds={initiative.taxonomyValues.map(v => v.taxonomyTermId)}
        />

        {(initiative.startDate || initiative.endDate) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timeline</span>
            <span>{[initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')}</span>
          </div>
        )}
      </div>

      <hr />

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={capabilityItems}
          gapMessage="No capabilities linked — the delivery scope of this initiative is unclear."
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'strategies') && (
        <RelationshipPanel
          title="Strategies delivered by this"
          items={initiative.strategyInitiatives.map(({ strategy }) => ({
            id: strategy.id, name: strategy.name,
            href: `/strategies/${strategy.id}`, meta: strategy.status,
          }))}
          gapMessage="No strategies are delivered by this initiative yet."
          canEdit={canMutate}
          available={allStrategies.filter(s => s.organizationId === orgId && !linkedStrategyIds.has(s.id)).map(s => ({ id: s.id, name: s.name }))}
          addAction={addStrategy}
          removeAction={removeStrategy}
        />
      )}

      {isModuleEnabled(enabledModules, 'objectives') && (
        <RelationshipPanel
          title="Strategic Objectives"
          items={initiative.initiativeObjectives.map(({ objective }) => ({
            id: objective.id, name: objective.name,
            href: `/objectives/${objective.id}`, meta: objective.timeHorizon,
          }))}
          canEdit={canMutate}
          available={allObjectives.filter(o => o.organizationId === orgId).map(o => ({ id: o.id, name: o.name }))}
          addAction={addObjective}
          removeAction={removeObjective}
        />
      )}

      {isModuleEnabled(enabledModules, 'applications') && (
        <RelationshipPanel
          title="Applications"
          items={applicationItems}
          canEdit={canMutate}
          available={allApplications.filter(a => a.organizationId === orgId).map(a => ({ id: a.id, name: a.name }))}
          addAction={addApplication}
          removeAction={removeApplication}
        />
      )}

      <RelatedInitiativesPanel related={relatedInitiatives} />

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(initiative.createdAt).toLocaleDateString()} · Updated {new Date(initiative.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
