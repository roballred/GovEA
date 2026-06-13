import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getValueStream } from '@/actions/value-streams'
import { getCapabilities } from '@/actions/capabilities'
import { getPersonas } from '@/actions/personas'
import { canEdit } from '@/lib/rbac'
import Link from 'next/link'
import { StageManager } from '../stage-manager'
import { RelationshipPanel } from '@/components/relationship-panel'
import { ValueStreamEditButton } from '@/components/value-stream-edit-button'
import {
  linkValueStreamPersona, unlinkValueStreamPersona,
  linkValueStreamCapability, unlinkValueStreamCapability,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'

/**
 * Value stream edit view (#726).
 *
 * The detail page (`/value-streams/[id]`) is read-only; all authoring of a
 * value stream's structure and relationships lives here: details, stages,
 * stage capabilities, stream-level capabilities, and personas.
 */
export default async function ValueStreamEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect(`/value-streams/${id}`)

  const orgId = session.user.organizationId!

  const [vs, capabilityList, allPersonas, enabledModules] = await Promise.all([
    getValueStream(id),
    getCapabilities(),
    getPersonas(),
    getEnabledModules(),
  ])

  if (!vs) notFound()
  // Editing is owner-org only — never mutate a federated/remote stream.
  if (vs.organizationId !== orgId) redirect(`/value-streams/${id}`)

  const addPersona = linkValueStreamPersona.bind(null, id)
  const removePersona = unlinkValueStreamPersona.bind(null, id)
  const addCapability = linkValueStreamCapability.bind(null, id)
  const removeCapability = unlinkValueStreamCapability.bind(null, id)

  const directCapIds = new Set(vs.valueStreamCapabilities.map(({ capability }) => capability.id))

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link href={`/value-streams/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to value stream
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit value stream</h1>
      </div>

      <ValueStreamEditButton
        valueStreamId={id}
        startOpen
        initial={{
          name: vs.name,
          description: vs.description,
          valueItem: vs.valueItem,
          status: vs.status,
          visibility: vs.visibility,
        }}
      />

      <hr />

      {/* Stages + stage capabilities */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Stages</h2>
        <StageManager
          valueStreamId={vs.id}
          stages={vs.stages}
          capabilities={capabilityList.filter(c => c.organizationId === orgId)}
        />
      </div>

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <div className="space-y-1.5">
          <RelationshipPanel
            title="Business Capabilities"
            items={vs.valueStreamCapabilities.map(({ capability }) => ({
              id: capability.id, name: capability.name,
              href: `/capabilities/${capability.id}`,
            }))}
            canEdit
            available={capabilityList
              .filter(c => c.organizationId === orgId && !directCapIds.has(c.id))
              .map(c => ({ id: c.id, name: c.name }))}
            addAction={addCapability}
            removeAction={removeCapability}
            emptyMessage="No stream-level capabilities linked yet."
          />
          <p className="text-xs text-muted-foreground">
            These capabilities apply to the whole value stream. Capabilities tied to a single step are managed per stage above.
          </p>
        </div>
      )}

      {isModuleEnabled(enabledModules, 'personas') && (
        <RelationshipPanel
          title="Personas"
          items={vs.valueStreamPersonas.map(({ persona }) => ({
            id: persona.id, name: persona.name,
            href: `/personas/${persona.id}`,
          }))}
          canEdit
          available={allPersonas.filter(p => p.organizationId === orgId).map(p => ({ id: p.id, name: p.name }))}
          addAction={addPersona}
          removeAction={removePersona}
        />
      )}
    </div>
  )
}
