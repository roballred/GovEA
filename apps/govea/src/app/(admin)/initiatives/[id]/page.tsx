import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getInitiative } from '@/actions/initiatives'
import { getCapabilities } from '@/actions/capabilities'
import { getObjectives } from '@/actions/objectives'
import { getApplications } from '@/actions/applications'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import type { RelationshipItem } from '@/components/relationship-panel'
import {
  linkInitiativeCapability, unlinkInitiativeCapability,
  linkInitiativeObjective, unlinkInitiativeObjective,
  linkInitiativeApplication, unlinkInitiativeApplication,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'

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

  const [initiative, enabledModules] = await Promise.all([getInitiative(id), getEnabledModules()])
  if (!initiative) notFound() // also catches viewer status gate enforced in getInitiative (#208)

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && initiative.organizationId === orgId

  const [allCapabilities, allObjectives, allApplications] = editor
    ? await Promise.all([
        getCapabilities(orgId),
        getObjectives(orgId),
        getApplications(orgId),
      ])
    : [[], [], []]

  const addCapability = linkInitiativeCapability.bind(null, id)
  const removeCapability = unlinkInitiativeCapability.bind(null, id)
  const addObjective = linkInitiativeObjective.bind(null, id)
  const removeObjective = unlinkInitiativeObjective.bind(null, id)
  const addApplication = linkInitiativeApplication.bind(null, id)
  const removeApplication = unlinkInitiativeApplication.bind(null, id)

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
      <Link href="/initiatives" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Initiatives
      </Link>

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
          <p className="text-muted-foreground">{initiative.description}</p>
        )}

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

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(initiative.createdAt).toLocaleDateString()} · Updated {new Date(initiative.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
