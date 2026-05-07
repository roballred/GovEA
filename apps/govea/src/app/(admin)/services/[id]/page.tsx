import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getService } from '@/actions/services'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { getValueStreams } from '@/actions/value-streams'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkServiceCapability, unlinkServiceCapability,
  linkServicePersona, unlinkServicePersona,
  linkServiceValueStream, unlinkServiceValueStream,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { dedupeById } from '@/lib/dedup'
import { MarkdownContent } from '@/components/markdown-content'
import { TaxonomyChips } from '@/components/taxonomy-ui'
import { ServiceEditButton } from '@/components/service-edit-button'

const CHANNEL_LABELS: Record<string, string> = {
  online: 'Online',
  'in-person': 'In-person',
  phone: 'Phone',
  mobile: 'Mobile',
}

const CHANNEL_STYLES: Record<string, string> = {
  online: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-person': 'bg-green-50 text-green-700 border-green-200',
  phone: 'bg-amber-50 text-amber-700 border-amber-200',
  mobile: 'bg-violet-50 text-violet-700 border-violet-200',
}

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

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [service, enabledModules] = await Promise.all([getService(id), getEnabledModules()])
  if (!service) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && service.organizationId === orgId

  const [allCapabilities, allPersonas, allValueStreams] = editor
    ? await Promise.all([
        getCapabilities(),
        getPersonas(),
        getValueStreams(),
      ])
    : [[], [], []]

  const addCapability = linkServiceCapability.bind(null, id)
  const removeCapability = unlinkServiceCapability.bind(null, id)
  const addPersona = linkServicePersona.bind(null, id)
  const removePersona = unlinkServicePersona.bind(null, id)
  const addValueStream = linkServiceValueStream.bind(null, id)
  const removeValueStream = unlinkServiceValueStream.bind(null, id)

  const capabilityApps = dedupeById(
    service.capabilityApps.map(({ application }) => ({
      id: application.id,
      name: application.name,
      href: `/applications/${application.id}`,
      meta: application.vendor ?? undefined,
    }))
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Services
        </Link>
        <Link
          href={`/traceability?from=service&id=${id}`}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View traceability →
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[service.status])}>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[service.visibility])}>
              {VISIBILITY_LABELS[service.visibility]}
            </span>
          </div>
        </div>

        {service.description && (
          <MarkdownContent>{service.description}</MarkdownContent>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          {service.serviceOwner && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Owner:</span>
              <span className="font-medium">{service.serviceOwner}</span>
            </div>
          )}
          {service.channels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {service.channels.map(ch => (
                <span key={ch} className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', CHANNEL_STYLES[ch] ?? 'bg-slate-50 text-slate-700 border-slate-200')}>
                  {CHANNEL_LABELS[ch] ?? ch}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {canMutate && (
        <ServiceEditButton
          serviceId={id}
          initial={{
            name: service.name,
            description: service.description,
            serviceOwner: service.serviceOwner,
            channels: service.channels,
            status: service.status,
            visibility: service.visibility,
          }}
          taxonomyDefinitions={service.taxonomyDefinitions}
          taxonomyValues={service.taxonomyValues}
        />
      )}

      {/* Taxonomy classification chips */}
      <TaxonomyChips
        definitions={service.taxonomyDefinitions}
        selectedTermIds={service.taxonomyValues.map(v => v.taxonomyTermId)}
      />

      <hr />

      {isModuleEnabled(enabledModules, 'personas') && (
        <RelationshipPanel
          title="Personas"
          items={service.servicePersonas.map(({ persona }) => ({
            id: persona.id, name: persona.name,
            href: `/personas/${persona.id}`,
          }))}
          canEdit={canMutate}
          available={allPersonas.filter(p => p.organizationId === orgId).map(p => ({ id: p.id, name: p.name }))}
          addAction={addPersona}
          removeAction={removePersona}
        />
      )}

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={service.serviceCapabilities.map(({ capability }) => ({
            id: capability.id, name: capability.name,
            href: `/capabilities/${capability.id}`,
            meta: capability.domain ?? undefined,
          }))}
          gapMessage="No capabilities linked — what makes this service possible is not mapped."
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'applications') && (
        <RelationshipPanel
          title="Applications"
          items={capabilityApps}
          gapMessage="Applications appear here through capabilities — link capabilities above to map your application landscape."
          canEdit={false}
        />
      )}

      {isModuleEnabled(enabledModules, 'value-streams') && (
        <RelationshipPanel
          title="Value Streams"
          items={service.serviceValueStreams.map(({ valueStream }) => ({
            id: valueStream.id, name: valueStream.name,
            href: `/value-streams/${valueStream.id}`,
          }))}
          canEdit={canMutate}
          available={allValueStreams.filter(vs => vs.organizationId === orgId).map(vs => ({ id: vs.id, name: vs.name }))}
          addAction={addValueStream}
          removeAction={removeValueStream}
        />
      )}

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(service.createdAt).toLocaleDateString()} · Updated {new Date(service.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
