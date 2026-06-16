import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCapability, markCapabilityReviewed } from '@/actions/capabilities'
import { MarkReviewedForm } from '@/components/mark-reviewed-button'
import { FreshnessLine } from '@/components/freshness-line'
import { SubscribeButton } from '@/components/subscribe-button'
import { isSubscribed } from '@/actions/notifications'
import { getApplications } from '@/actions/applications'
import { getObjectives } from '@/actions/objectives'
import { getInitiatives } from '@/actions/initiatives'
import { getADRs } from '@/actions/adrs'
import { getPersonas } from '@/actions/personas'
import { canEdit, isAdmin } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { DomainBadge } from '@/components/domain-badge'
import { RelationshipPanel } from '@/components/relationship-panel'
import { LinkedDebt } from '@/components/linked-debt'
import {
  linkCapabilityPersona, unlinkCapabilityPersona,
  linkCapabilityApplication, unlinkCapabilityApplication,
  linkCapabilityObjective, unlinkCapabilityObjective,
  linkCapabilityInitiative, unlinkCapabilityInitiative,
  linkCapabilityAdr, unlinkCapabilityAdr,
  linkCapabilityStrategy, unlinkCapabilityStrategy,
} from '@/actions/links'
import { getStrategies } from '@/actions/strategies'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { CrossOrgLinksPanel } from '@/components/cross-org-links-panel'
import { MarkdownContent } from '@/components/markdown-content'
import { getCapabilityImpact } from '@/actions/impact'
import { CapabilityImpactPanel } from '@/components/impact-panel'
import { CapabilityEditButton } from '@/components/capability-edit-button'
import { DomainOwnerLine } from '@/components/domain-owner-line'
import { getOrgUsersForPicker } from '@/actions/org-users'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TaxonomyChips } from '@/components/taxonomy-ui'
import {
  approveCrossOrgLink,
  getCrossOrgLinkContext,
  rejectCrossOrgLink,
  requestCrossOrgLink,
  revokeCrossOrgLink,
  withdrawCrossOrgLink,
} from '@/actions/cross-org-links'

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

const TYPE_STYLES: Record<string, string> = {
  business: 'bg-violet-100 text-violet-800 border-violet-200',
  technical: 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

export default async function CapabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [capability, enabledModules, alreadySubscribed] = await Promise.all([
    getCapability(id),
    getEnabledModules(),
    isSubscribed('capability', id),
  ])
  if (!capability) notFound()

  const impact = await getCapabilityImpact(id)

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && capability.organizationId === orgId
  const canApproveCrossOrg = isAdmin(session.user) && capability.organizationId === orgId

  const [allPersonas, allApplications, allObjectives, allInitiatives, allAdrs, allStrategies, crossOrgLinks] = editor
    ? await Promise.all([
        getPersonas(),
        getApplications(),
        getObjectives(),
        getInitiatives(),
        getADRs(),
        getStrategies(orgId, session.user.role),
        getCrossOrgLinkContext('capability', id),
      ])
    : [[], [], [], [], [], [], { approved: [], inboundPending: [], outboundPending: [], outboundRejected: [], availableTargets: [] }]

  // Domain owner (#581 follow-up): fetch picker list for editors, plus the
  // owner attribution row for the detail line. Owner lookup is conditional
  // because it's null for most records today.
  const [orgUsers, domainOwner] = await Promise.all([
    canMutate ? getOrgUsersForPicker() : Promise.resolve([]),
    capability.domainOwnerUserId
      ? db.query.users.findFirst({
          where: eq(users.id, capability.domainOwnerUserId),
          columns: { id: true, name: true, email: true },
        })
      : Promise.resolve(null),
  ])

  const addPersona = linkCapabilityPersona.bind(null, id)
  const removePersona = unlinkCapabilityPersona.bind(null, id)
  const addApplication = linkCapabilityApplication.bind(null, id)
  const removeApplication = unlinkCapabilityApplication.bind(null, id)
  const addObjective = linkCapabilityObjective.bind(null, id)
  const removeObjective = unlinkCapabilityObjective.bind(null, id)
  const addInitiative = linkCapabilityInitiative.bind(null, id)
  const removeInitiative = unlinkCapabilityInitiative.bind(null, id)
  const addAdr = linkCapabilityAdr.bind(null, id)
  const removeAdr = unlinkCapabilityAdr.bind(null, id)
  const addStrategy = linkCapabilityStrategy.bind(null, id)
  const removeStrategy = unlinkCapabilityStrategy.bind(null, id)
  const requestFederatedLink = requestCrossOrgLink.bind(null, 'capability', id)

  const linkedStrategyIds = new Set(capability.strategyCapabilities.map(sc => sc.strategyId))

  const parents = capability.parentRelationships.map(r => r.parent)
  const children = capability.childRelationships.map(r => r.child)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/capabilities" className="hover:text-foreground transition-colors">Capabilities</Link>
          {parents.map(p => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span>/</span>
              <Link href={`/capabilities/${p.id}`} className="hover:text-foreground transition-colors">{p.name}</Link>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/capabilities/${id}/map`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View map →
          </Link>
          <Link
            href={`/traceability?from=capability&id=${id}`}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View traceability →
          </Link>
        </div>
      </div>

      {canMutate && (
        <CapabilityEditButton
          capabilityId={id}
          initial={{
            name: capability.name,
            description: capability.description,
            domain: capability.domain,
            capabilityType: capability.capabilityType,
            behaviors: capability.behaviors,
            rules: capability.rules,
            status: capability.status,
            visibility: capability.visibility,
            personaIds: capability.capabilityPersonas.map(cp => cp.persona.id),
            parentId: capability.parentRelationships[0]?.parentId ?? null,
            domainOwnerUserId: capability.domainOwnerUserId,
          }}
          taxonomyDefinitions={capability.taxonomyDefinitions}
          currentTaxonomyValues={capability.taxonomyValues}
          currentUserId={session.user.id}
          orgUsers={orgUsers}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{capability.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {capability.capabilityType && (
              <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', TYPE_STYLES[capability.capabilityType])}>
                {capability.capabilityType.charAt(0).toUpperCase() + capability.capabilityType.slice(1)}
              </span>
            )}
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[capability.status])}>
              {capability.status.charAt(0).toUpperCase() + capability.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[capability.visibility])}>
              {VISIBILITY_LABELS[capability.visibility]}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <FreshnessLine updatedAt={capability.updatedAt} lastReviewedAt={capability.lastReviewedAt} />
          <SubscribeButton entityType="capability" entityId={id} initialSubscribed={alreadySubscribed} />
        </div>

        {capability.description && (
          <MarkdownContent>{capability.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          {capability.domain
            ? <DomainBadge domain={capability.domain} />
            : parents.length > 0
              ? <span className="text-sm text-muted-foreground italic">Domain inherited from parent</span>
              : <span className="text-sm text-muted-foreground">No domain assigned</span>
          }
        </div>

        <TaxonomyChips
          definitions={capability.taxonomyDefinitions}
          selectedTermIds={capability.taxonomyValues.map(v => v.taxonomyTermId)}
        />

        {children.length > 0 && (
          <div className="pt-2 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sub-capabilities</p>
            <div className="flex flex-wrap gap-2">
              {children.map(child => (
                <Link
                  key={child.id}
                  href={`/capabilities/${child.id}`}
                  className="inline-flex items-center rounded-md border bg-muted/40 px-2.5 py-1 text-sm hover:bg-muted transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <hr />

      {capability.behaviors && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Behaviors</h2>
          <MarkdownContent>{capability.behaviors}</MarkdownContent>
        </div>
      )}

      {capability.rules && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Rules</h2>
          <MarkdownContent>{capability.rules}</MarkdownContent>
        </div>
      )}

      <hr />

      <LinkedDebt
        entityType="capability"
        entityId={capability.id}
        callerOrgId={orgId}
        role={session.user.role}
        canEdit={canMutate}
      />

      {isModuleEnabled(enabledModules, 'personas') && (
        <RelationshipPanel
          title="Personas"
          items={capability.capabilityPersonas.map(({ persona }) => ({
            id: persona.id, name: persona.name,
            href: `/personas/${persona.id}`, meta: persona.type,
          }))}
          canEdit={canMutate}
          available={allPersonas.filter(p => p.organizationId === orgId).map(p => ({ id: p.id, name: p.name }))}
          addAction={addPersona}
          removeAction={removePersona}
        />
      )}

      {isModuleEnabled(enabledModules, 'strategies') && (
        <RelationshipPanel
          title="Strategies impacting this"
          items={capability.strategyCapabilities.map(({ strategy }) => ({
            id: strategy.id, name: strategy.name,
            href: `/strategies/${strategy.id}`, meta: strategy.status,
          }))}
          gapMessage="No strategies reference this capability yet."
          canEdit={canMutate}
          available={allStrategies.filter(s => s.organizationId === orgId && !linkedStrategyIds.has(s.id)).map(s => ({ id: s.id, name: s.name }))}
          addAction={addStrategy}
          removeAction={removeStrategy}
        />
      )}

      {isModuleEnabled(enabledModules, 'applications') && (
        <RelationshipPanel
          title="Applications"
          items={capability.applicationCapabilities.map(({ application }) => ({
            id: application.id, name: application.name,
            href: `/applications/${application.id}`, meta: application.vendor,
          }))}
          gapMessage="No applications linked — the technology platform for this capability is unknown."
          canEdit={canMutate}
          available={allApplications.filter(a => a.organizationId === orgId).map(a => ({ id: a.id, name: a.name }))}
          addAction={addApplication}
          removeAction={removeApplication}
        />
      )}

      {isModuleEnabled(enabledModules, 'objectives') && (
        <RelationshipPanel
          title="Strategic Objectives"
          items={capability.objectiveCapabilities.map(({ objective }) => ({
            id: objective.id, name: objective.name,
            href: `/objectives/${objective.id}`, meta: objective.timeHorizon,
          }))}
          gapMessage="Not linked to any objective — the mission justification for this capability is undocumented."
          canEdit={canMutate}
          available={allObjectives.filter(o => o.organizationId === orgId).map(o => ({ id: o.id, name: o.name }))}
          addAction={addObjective}
          removeAction={removeObjective}
        />
      )}

      {isModuleEnabled(enabledModules, 'initiatives') && (
        <RelationshipPanel
          title="Initiatives"
          items={capability.initiativeCapabilities.map(({ initiative }) => ({
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
          items={capability.adrCapabilities.map(({ adr }) => ({
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

      <CrossOrgLinksPanel
        entityLabel="Capability"
        approved={crossOrgLinks.approved}
        inboundPending={crossOrgLinks.inboundPending}
        outboundPending={crossOrgLinks.outboundPending}
        outboundRejected={crossOrgLinks.outboundRejected}
        availableTargets={crossOrgLinks.availableTargets}
        canRequest={canMutate}
        canApprove={canApproveCrossOrg}
        requestAction={requestFederatedLink}
        approveAction={approveCrossOrgLink}
        rejectAction={rejectCrossOrgLink}
        withdrawAction={withdrawCrossOrgLink}
        revokeAction={revokeCrossOrgLink}
      />

      <CapabilityImpactPanel impact={impact} />

      {isModuleEnabled(enabledModules, 'principles') && capability.principleCapabilities.length > 0 && (
        <RelationshipPanel
          title="Principles"
          items={capability.principleCapabilities.map(({ principle }) => ({
            id: principle.id, name: principle.name, href: `/principles/${principle.id}`,
          }))}
          canEdit={false}
        />
      )}

      <div className="pt-4 border-t flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Created {new Date(capability.createdAt).toLocaleDateString()} · Modified {new Date(capability.updatedAt).toLocaleDateString()}
          {capability.lastReviewedAt
            ? ` · Reviewed ${new Date(capability.lastReviewedAt).toLocaleDateString()}`
            : ' · Never reviewed'}
        </p>
        {canMutate && (
          <MarkReviewedForm action={markCapabilityReviewed.bind(null, id)} />
        )}
      </div>
    </div>
  )
}
