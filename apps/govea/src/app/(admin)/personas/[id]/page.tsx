import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPersona, markPersonaReviewed } from '@/actions/personas'
import { MarkReviewedForm } from '@/components/mark-reviewed-button'
import { getPersonaTypesFromTaxonomy, getPersonaTagsFromTaxonomy } from '@/actions/taxonomy'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { canEdit, isAdmin } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'
import { RelationshipPanel } from '@/components/relationship-panel'
import { PersonaEditButton } from '@/components/persona-edit-button'
import {
  linkPersonaCapability, unlinkPersonaCapability,
  linkPersonaValueStream, unlinkPersonaValueStream,
} from '@/actions/links'
import { CrossOrgLinksPanel } from '@/components/cross-org-links-panel'
import { MarkdownContent } from '@/components/markdown-content'
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

export default async function PersonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const persona = await getPersona(id)
  if (!persona) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && persona.organizationId === orgId
  const canApproveCrossOrg = isAdmin(session.user) && persona.organizationId === orgId

  const [allCapabilities, allValueStreams, personaTypes, allTags, crossOrgLinks] = editor
    ? await Promise.all([
        getCapabilities(),
        getValueStreams(),
        getPersonaTypesFromTaxonomy(),
        getPersonaTagsFromTaxonomy(),
        getCrossOrgLinkContext('persona', id),
      ])
    : [[], [], [], [], { approved: [], inboundPending: [], outboundPending: [], outboundRejected: [], availableTargets: [] }]

  const addCapability = linkPersonaCapability.bind(null, id)
  const removeCapability = unlinkPersonaCapability.bind(null, id)
  const addValueStream = linkPersonaValueStream.bind(null, id)
  const removeValueStream = unlinkPersonaValueStream.bind(null, id)
  const requestFederatedLink = requestCrossOrgLink.bind(null, 'persona', id)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/personas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Personas
        </Link>
        <ViewTraceabilityLink from="persona" id={id} />
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{persona.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[persona.status])}>
              {persona.status.charAt(0).toUpperCase() + persona.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[persona.visibility])}>
              {VISIBILITY_LABELS[persona.visibility]}
            </span>
          </div>
        </div>

        {persona.description && (
          <MarkdownContent>{persona.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-6 text-sm pt-1">
          <div>
            <span className="text-muted-foreground">Type: </span>
            {persona.type
              ? <span className="font-medium">{persona.type}</span>
              : <span className="text-muted-foreground">—</span>
            }
          </div>
        </div>
      </div>

      {canMutate && (
        <PersonaEditButton
          personaId={id}
          initial={{
            name: persona.name,
            description: persona.description,
            type: persona.type,
            status: persona.status,
            visibility: persona.visibility,
            tagIds: persona.personaTags.map(pt => pt.tag.id),
          }}
          personaTypes={personaTypes}
          tags={allTags}
        />
      )}

      <hr />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tags</h2>
        {persona.personaTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags assigned to this persona.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {persona.personaTags.map(({ tag }) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <RelationshipPanel
        title="Capabilities"
        items={persona.capabilityPersonas.map(({ capability }) => ({
          id: capability.id, name: capability.name,
          href: `/capabilities/${capability.id}`, meta: capability.domain,
        }))}
        canEdit={canMutate}
        available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
        addAction={addCapability}
        removeAction={removeCapability}
      />

      <RelationshipPanel
        title="Value Streams"
        items={persona.valueStreamPersonas.map(({ valueStream }) => ({
          id: valueStream.id, name: valueStream.name,
          href: `/value-streams/${valueStream.id}`,
        }))}
        canEdit={canMutate}
        available={allValueStreams.filter(vs => vs.organizationId === orgId).map(vs => ({ id: vs.id, name: vs.name }))}
        addAction={addValueStream}
        removeAction={removeValueStream}
      />

      <CrossOrgLinksPanel
        entityLabel="Persona"
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

      <div className="pt-4 border-t flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Created {new Date(persona.createdAt).toLocaleDateString()} · Modified {new Date(persona.updatedAt).toLocaleDateString()}
          {persona.lastReviewedAt
            ? ` · Reviewed ${new Date(persona.lastReviewedAt).toLocaleDateString()}`
            : ' · Never reviewed'}
        </p>
        {canMutate && (
          <MarkReviewedForm action={markPersonaReviewed.bind(null, id)} />
        )}
      </div>
    </div>
  )
}
