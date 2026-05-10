import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getApplication, markApplicationReviewed } from '@/actions/applications'
import { MarkReviewedForm } from '@/components/mark-reviewed-button'
import { getCapabilities } from '@/actions/capabilities'
import { getInitiatives } from '@/actions/initiatives'
import { getADRs } from '@/actions/adrs'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { RelationshipPanel } from '@/components/relationship-panel'
import { LinkedDebt } from '@/components/linked-debt'
import {
  linkApplicationCapability, unlinkApplicationCapability,
  linkApplicationInitiative, unlinkApplicationInitiative,
  linkApplicationAdr, unlinkApplicationAdr,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { dedupeById } from '@/lib/dedup'
import { MarkdownContent } from '@/components/markdown-content'
import { TaxonomyChips } from '@/components/taxonomy-ui'
import { getApplicationImpact } from '@/actions/impact'
import { ApplicationImpactPanel } from '@/components/impact-panel'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only',
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

const LIFECYCLE_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deprecated: 'bg-amber-100 text-amber-800 border-amber-200',
  sunset: 'bg-red-100 text-red-700 border-red-200',
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [application, enabledModules] = await Promise.all([getApplication(id), getEnabledModules()])
  if (!application) notFound()

  const impact = await getApplicationImpact(id)

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && application.organizationId === orgId

  const [allCapabilities, allInitiatives, allAdrs] = editor
    ? await Promise.all([
        getCapabilities(),
        getInitiatives(),
        getADRs(),
      ])
    : [[], [], []]

  const addCapability = linkApplicationCapability.bind(null, id)
  const removeCapability = unlinkApplicationCapability.bind(null, id)
  const addInitiative = linkApplicationInitiative.bind(null, id)
  const removeInitiative = unlinkApplicationInitiative.bind(null, id)
  const addAdr = linkApplicationAdr.bind(null, id)
  const removeAdr = unlinkApplicationAdr.bind(null, id)

  const linkedObjectives = dedupeById(
    application.capabilityObjectives.map(({ objective }) => ({
      id: objective.id,
      name: objective.name,
      href: `/objectives/${objective.id}`,
      meta: objective.timeHorizon ?? undefined,
    }))
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/applications" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Applications
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{application.name}</h1>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {application.lifecycleStatus && (
              <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LIFECYCLE_STYLES[application.lifecycleStatus] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                {application.lifecycleStatus.charAt(0).toUpperCase() + application.lifecycleStatus.slice(1)}
              </span>
            )}
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[application.status])}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[application.visibility])}>
              {VISIBILITY_LABELS[application.visibility]}
            </span>
          </div>
        </div>

        {application.description && (
          <MarkdownContent>{application.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          {application.vendor && (
            <div>
              <span className="text-muted-foreground">Vendor: </span>
              <span className="font-medium">{application.vendor}</span>
            </div>
          )}
          {application.version && (
            <div>
              <span className="text-muted-foreground">Version: </span>
              <span className="font-medium">{application.version}</span>
            </div>
          )}
          {application.hostingModel && (
            <div>
              <span className="text-muted-foreground">Hosting: </span>
              <span className="font-medium">{application.hostingModel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Taxonomy classification chips */}
      <TaxonomyChips
        definitions={application.taxonomyDefinitions}
        selectedTermIds={application.taxonomyValues.map(v => v.taxonomyTermId)}
      />

      <hr />

      <LinkedDebt
        entityType="application"
        entityId={application.id}
        callerOrgId={orgId}
        role={session.user.role}
        canEdit={canMutate}
      />

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={application.applicationCapabilities.map(({ capability }) => ({
            id: capability.id, name: capability.name,
            href: `/capabilities/${capability.id}`, meta: capability.domain,
          }))}
          gapMessage="Not linked to any capability — what this application enables is undocumented."
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'objectives') && (
        <RelationshipPanel
          title="Strategic Objectives"
          items={linkedObjectives}
          gapMessage="Objectives appear here through capabilities — link capabilities above to see strategic alignment."
          canEdit={false}
        />
      )}

      {isModuleEnabled(enabledModules, 'initiatives') && (
        <RelationshipPanel
          title="Initiatives"
          items={application.initiativeApplications.map(({ initiative }) => ({
            id: initiative.id, name: initiative.name,
            href: `/initiatives/${initiative.id}`, meta: initiative.status,
          }))}
          canEdit={canMutate}
          available={allInitiatives.filter(i => i.organizationId === orgId).map(i => ({ id: i.id, name: i.name }))}
          addAction={addInitiative}
          removeAction={removeInitiative}
        />
      )}

      {isModuleEnabled(enabledModules, 'adrs') && (
        <RelationshipPanel
          title="Architecture Decision Records"
          items={application.adrApplications.map(({ adr }) => ({
            id: adr.id, name: adr.title,
            href: `/adrs/${adr.id}`,
            meta: `ADR-${String(adr.number).padStart(3, '0')}`,
          }))}
          canEdit={canMutate}
          available={allAdrs.filter(a => a.organizationId === orgId).map(a => ({ id: a.id, name: `ADR-${String(a.number).padStart(3, '0')} ${a.title}` }))}
          addAction={addAdr}
          removeAction={removeAdr}
        />
      )}

      <ApplicationImpactPanel impact={impact} />

      {application.customFieldDefs.length > 0 && application.customFieldDefs.some(f => application.customData?.[f.name]) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Fields</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            {application.customFieldDefs.map(field => {
              const value = application.customData?.[field.name]
              if (!value) return null
              return (
                <div key={field.name}>
                  <span className="text-muted-foreground">{field.name}: </span>
                  <span className="font-medium">{value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="pt-4 border-t flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Created {new Date(application.createdAt).toLocaleDateString()} · Modified {new Date(application.updatedAt).toLocaleDateString()}
          {application.lastReviewedAt
            ? ` · Reviewed ${new Date(application.lastReviewedAt).toLocaleDateString()}`
            : ' · Never reviewed'}
        </p>
        {canMutate && (
          <MarkReviewedForm action={markApplicationReviewed.bind(null, id)} />
        )}
      </div>
    </div>
  )
}
