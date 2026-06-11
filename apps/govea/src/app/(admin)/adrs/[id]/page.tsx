import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getADR } from '@/actions/adrs'
import { getCapabilities } from '@/actions/capabilities'
import { getApplications } from '@/actions/applications'
import { getInitiatives } from '@/actions/initiatives'
import { getObjectives } from '@/actions/objectives'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'
import { cn } from '@/lib/utils'
import { RelationshipPanel } from '@/components/relationship-panel'
import { LinkedDebt } from '@/components/linked-debt'
import {
  linkAdrCapability, unlinkAdrCapability,
  linkAdrApplication, unlinkAdrApplication,
  linkAdrInitiative, unlinkAdrInitiative,
  linkAdrObjective, unlinkAdrObjective,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { MarkdownContent } from '@/components/markdown-content'
import { FreshnessLine } from '@/components/freshness-line'
import { SubscribeButton } from '@/components/subscribe-button'
import { isSubscribed } from '@/actions/notifications'
import { DomainOwnerLine } from '@/components/domain-owner-line'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TaxonomyChips } from '@/components/taxonomy-ui'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deprecated: 'bg-amber-100 text-amber-800 border-amber-200',
  superseded: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  deprecated: 'Deprecated',
  superseded: 'Superseded',
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

export default async function ADRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [adr, enabledModules, alreadySubscribed] = await Promise.all([
    getADR(id),
    getEnabledModules(),
    isSubscribed('adr', id),
  ])
  if (!adr) notFound() // also catches viewer status gate enforced in getADR (#208)

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && adr.organizationId === orgId

  const [allCapabilities, allApplications, allInitiatives, allObjectives] = editor
    ? await Promise.all([
        getCapabilities(),
        getApplications(),
        getInitiatives(),
        getObjectives(),
      ])
    : [[], [], [], []]

  const domainOwner = adr.domainOwnerUserId
    ? await db.query.users.findFirst({
        where: eq(users.id, adr.domainOwnerUserId),
        columns: { id: true, name: true, email: true },
      })
    : null

  const addCapability = linkAdrCapability.bind(null, id)
  const removeCapability = unlinkAdrCapability.bind(null, id)
  const addApplication = linkAdrApplication.bind(null, id)
  const removeApplication = unlinkAdrApplication.bind(null, id)
  const addInitiative = linkAdrInitiative.bind(null, id)
  const removeInitiative = unlinkAdrInitiative.bind(null, id)
  const addObjective = linkAdrObjective.bind(null, id)
  const removeObjective = unlinkAdrObjective.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/adrs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Architecture Decision Records
        </Link>
        <ViewTraceabilityLink from="adr" id={id} />
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-mono text-muted-foreground">{adr.number}</p>
            <h1 className="text-2xl font-bold tracking-tight">{adr.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[adr.status])}>
              {STATUS_LABELS[adr.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[adr.visibility])}>
              {VISIBILITY_LABELS[adr.visibility]}
            </span>
          </div>
        </div>

        {/* For ADRs, the "Decided" date matters more than "last edited" —
            the entire genre exists to record when a decision was made (#553). */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <FreshnessLine updatedAt={adr.createdAt} updatedLabel="Decided" />
            {domainOwner && (
              <DomainOwnerLine ownerName={domainOwner.name} ownerEmail={domainOwner.email} />
            )}
          </div>
          <SubscribeButton entityType="adr" entityId={id} initialSubscribed={alreadySubscribed} />
        </div>

        {adr.supersededByAdr && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Superseded by{' '}
            <Link href={`/adrs/${adr.supersededByAdr.id}`} className="font-medium underline underline-offset-2">
              {adr.supersededByAdr.number} — {adr.supersededByAdr.title}
            </Link>
          </div>
        )}

        <TaxonomyChips
          definitions={adr.taxonomyDefinitions}
          selectedTermIds={adr.taxonomyValues.map(v => v.taxonomyTermId)}
        />
      </div>

      <hr />

      {/* Body */}
      <div className="space-y-6">
        {adr.context && (
          <Section title="Context">
            <MarkdownContent>{adr.context}</MarkdownContent>
          </Section>
        )}

        {adr.decision && (
          <Section title="Decision">
            <MarkdownContent>{adr.decision}</MarkdownContent>
          </Section>
        )}

        {adr.consequences && (
          <Section title="Consequences">
            <MarkdownContent>{adr.consequences}</MarkdownContent>
          </Section>
        )}
      </div>

      <hr />

      <LinkedDebt
        entityType="adr"
        entityId={adr.id}
        callerOrgId={orgId}
        role={session.user.role}
        canEdit={canMutate}
      />

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={adr.adrCapabilities.map(({ capability }) => ({
            id: capability.id, name: capability.name,
            href: `/capabilities/${capability.id}`, meta: capability.domain,
          }))}
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'applications') && (
        <RelationshipPanel
          title="Applications"
          items={adr.adrApplications.map(({ application }) => ({
            id: application.id, name: application.name,
            href: `/applications/${application.id}`,
          }))}
          canEdit={canMutate}
          available={allApplications.filter(a => a.organizationId === orgId).map(a => ({ id: a.id, name: a.name }))}
          addAction={addApplication}
          removeAction={removeApplication}
        />
      )}

      {isModuleEnabled(enabledModules, 'initiatives') && (
        <RelationshipPanel
          title="Initiatives"
          items={adr.adrInitiatives.map(({ initiative }) => ({
            id: initiative.id, name: initiative.name,
            href: `/initiatives/${initiative.id}`, meta: initiative.status,
          }))}
          canEdit={canMutate}
          available={allInitiatives.filter(i => i.organizationId === orgId).map(i => ({ id: i.id, name: i.name }))}
          addAction={addInitiative}
          removeAction={removeInitiative}
        />
      )}

      {isModuleEnabled(enabledModules, 'objectives') && (
        <RelationshipPanel
          title="Strategic Objectives"
          items={adr.adrObjectives.map(({ objective }) => ({
            id: objective.id, name: objective.name,
            href: `/objectives/${objective.id}`,
          }))}
          canEdit={canMutate}
          available={allObjectives.filter(o => o.organizationId === orgId).map(o => ({ id: o.id, name: o.name }))}
          addAction={addObjective}
          removeAction={removeObjective}
        />
      )}

      {isModuleEnabled(enabledModules, 'principles') && adr.principleAdrs && adr.principleAdrs.length > 0 && (
        <RelationshipPanel
          title="Principles"
          items={adr.principleAdrs.map(({ principle }) => ({
            id: principle.id, name: principle.name,
            href: `/principles/${principle.id}`,
          }))}
          canEdit={false}
        />
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(adr.createdAt).toLocaleDateString()} · Updated {new Date(adr.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}
