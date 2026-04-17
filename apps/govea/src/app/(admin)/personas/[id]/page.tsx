import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPersona, getPersonaTypes, getTags } from '@/actions/personas'
import { getCapabilities } from '@/actions/capabilities'
import { getValueStreams } from '@/actions/value-streams'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { RelationshipPanel } from '@/components/relationship-panel'
import { PersonaEditButton } from '@/components/persona-edit-button'
import {
  linkPersonaCapability, unlinkPersonaCapability,
  linkPersonaValueStream, unlinkPersonaValueStream,
} from '@/actions/links'

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

  const [allCapabilities, allValueStreams, personaTypes, allTags] = editor
    ? await Promise.all([
        getCapabilities(orgId),
        getValueStreams(orgId),
        getPersonaTypes(orgId),
        getTags(orgId),
      ])
    : [[], [], [], []]

  const addCapability = linkPersonaCapability.bind(null, id)
  const removeCapability = unlinkPersonaCapability.bind(null, id)
  const addValueStream = linkPersonaValueStream.bind(null, id)
  const removeValueStream = unlinkPersonaValueStream.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/personas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Personas
      </Link>

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
          <p className="text-muted-foreground">{persona.description}</p>
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

      {editor && (
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
        canEdit={editor}
        available={allCapabilities.map(c => ({ id: c.id, name: c.name }))}
        addAction={addCapability}
        removeAction={removeCapability}
      />

      <RelationshipPanel
        title="Value Streams"
        items={persona.valueStreamPersonas.map(({ valueStream }) => ({
          id: valueStream.id, name: valueStream.name,
          href: `/value-streams/${valueStream.id}`,
        }))}
        canEdit={editor}
        available={allValueStreams.map(vs => ({ id: vs.id, name: vs.name }))}
        addAction={addValueStream}
        removeAction={removeValueStream}
      />

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(persona.createdAt).toLocaleDateString()} · Updated {new Date(persona.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
