import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPrinciple } from '@/actions/principles'
import { getCapabilities } from '@/actions/capabilities'
import { getADRs } from '@/actions/adrs'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ViewTraceabilityLink } from '@/components/view-traceability-link'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkPrincipleCapability, unlinkPrincipleCapability,
  linkPrincipleAdr, unlinkPrincipleAdr,
} from '@/actions/links'
import { getEnabledModules } from '@/lib/get-enabled-modules'
import { isModuleEnabled } from '@/lib/modules'
import { getPrincipleTypes } from '@/actions/taxonomy'
import { MarkdownContent } from '@/components/markdown-content'
import { PrincipleEditButton } from '@/components/principle-edit-button'
import { TaxonomyChips } from '@/components/taxonomy-ui'

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

// Stable colour palette matching principle-table.tsx
const TYPE_PALETTE = [
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-pink-50 text-pink-700 border-pink-200',
]

export default async function PrincipleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const [principle, enabledModules, principleTypes] = await Promise.all([
    getPrinciple(id),
    getEnabledModules(),
    getPrincipleTypes(),
  ])
  if (!principle) notFound()

  const editor = canEdit(session.user)
  const canMutate = editor && principle.organizationId === orgId

  const [allCapabilities, allAdrs] = editor
    ? await Promise.all([
        getCapabilities(),
        getADRs(),
      ])
    : [[], []]

  const addCapability = linkPrincipleCapability.bind(null, id)
  const removeCapability = unlinkPrincipleCapability.bind(null, id)
  const addAdr = linkPrincipleAdr.bind(null, id)
  const removeAdr = unlinkPrincipleAdr.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/principles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Principles
        </Link>
        <ViewTraceabilityLink from="principle" id={id} />
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{principle.name}</h1>
            {principle.description && (
              <MarkdownContent>{principle.description}</MarkdownContent>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(() => {
              const idx = principleTypes.findIndex(t => t.slug === principle.principleType)
              const label = idx >= 0 ? principleTypes[idx].name : principle.principleType
              const style = idx >= 0 ? TYPE_PALETTE[idx % TYPE_PALETTE.length] : 'bg-slate-100 text-slate-600 border-slate-200'
              return (
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', style)}>
                  {label}
                </span>
              )
            })()}
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[principle.status])}>
              {principle.status.charAt(0).toUpperCase() + principle.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[principle.visibility])}>
              {VISIBILITY_LABELS[principle.visibility]}
            </span>
          </div>
        </div>

        <TaxonomyChips
          definitions={principle.taxonomyDefinitions}
          selectedTermIds={principle.taxonomyValues.map(v => v.taxonomyTermId)}
        />
      </div>

      {canMutate && (
        <PrincipleEditButton
          principleId={id}
          initial={{
            name: principle.name,
            description: principle.description,
            title: principle.title,
            rationale: principle.rationale,
            implications: principle.implications,
            principleType: principle.principleType,
            status: principle.status,
            visibility: principle.visibility,
          }}
          principleTypes={principleTypes}
          taxonomyDefinitions={principle.taxonomyDefinitions}
          currentTaxonomyValues={principle.taxonomyValues}
        />
      )}

      <hr />

      <div className="space-y-6">
        {principle.title && (
          <Section title="Statement">
            <MarkdownContent>{principle.title}</MarkdownContent>
          </Section>
        )}
        {principle.rationale && (
          <Section title="Rationale">
            <MarkdownContent>{principle.rationale}</MarkdownContent>
          </Section>
        )}
        {principle.implications && (
          <Section title="Implications">
            <MarkdownContent>{principle.implications}</MarkdownContent>
          </Section>
        )}
      </div>

      <hr />

      {isModuleEnabled(enabledModules, 'capabilities') && (
        <RelationshipPanel
          title="Capabilities"
          items={principle.principleCapabilities.map(({ capability }) => ({
            id: capability.id, name: capability.name,
            href: `/capabilities/${capability.id}`, meta: capability.domain,
          }))}
          canEdit={canMutate}
          available={allCapabilities.filter(c => c.organizationId === orgId).map(c => ({ id: c.id, name: c.name }))}
          addAction={addCapability}
          removeAction={removeCapability}
        />
      )}

      {isModuleEnabled(enabledModules, 'adrs') && (
        <RelationshipPanel
          title="Architecture Decision Records"
          items={principle.principleAdrs.map(({ adr }) => ({
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

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(principle.createdAt).toLocaleDateString()} · Updated {new Date(principle.updatedAt).toLocaleDateString()}
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
