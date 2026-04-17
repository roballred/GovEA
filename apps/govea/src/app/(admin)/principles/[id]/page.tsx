import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPrinciple } from '@/actions/principles'
import { getCapabilities } from '@/actions/capabilities'
import { getADRs } from '@/actions/adrs'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { RelationshipPanel } from '@/components/relationship-panel'
import {
  linkPrincipleCapability, unlinkPrincipleCapability,
  linkPrincipleAdr, unlinkPrincipleAdr,
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

export default async function PrincipleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const principle = await getPrinciple(id)
  if (!principle) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!

  const [allCapabilities, allAdrs] = editor
    ? await Promise.all([
        getCapabilities(orgId),
        getADRs(orgId),
      ])
    : [[], []]

  const addCapability = linkPrincipleCapability.bind(null, id)
  const removeCapability = unlinkPrincipleCapability.bind(null, id)
  const addAdr = linkPrincipleAdr.bind(null, id)
  const removeAdr = unlinkPrincipleAdr.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/principles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Principles
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{principle.name}</h1>
            {principle.description && (
              <p className="text-muted-foreground">{principle.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[principle.status])}>
              {principle.status.charAt(0).toUpperCase() + principle.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[principle.visibility])}>
              {VISIBILITY_LABELS[principle.visibility]}
            </span>
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-6">
        {principle.title && (
          <Section title="Statement">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{principle.title}</p>
          </Section>
        )}
        {principle.rationale && (
          <Section title="Rationale">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{principle.rationale}</p>
          </Section>
        )}
        {principle.implications && (
          <Section title="Implications">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{principle.implications}</p>
          </Section>
        )}
      </div>

      <hr />

      <RelationshipPanel
        title="Capabilities"
        items={principle.principleCapabilities.map(({ capability }) => ({
          id: capability.id, name: capability.name,
          href: `/capabilities/${capability.id}`, meta: capability.domain,
        }))}
        canEdit={editor}
        available={allCapabilities.map(c => ({ id: c.id, name: c.name }))}
        addAction={addCapability}
        removeAction={removeCapability}
      />

      <RelationshipPanel
        title="Architecture Decision Records"
        items={principle.principleAdrs.map(({ adr }) => ({
          id: adr.id, name: adr.title,
          href: `/adrs/${adr.id}`,
          meta: `ADR-${String(adr.number).padStart(3, '0')}`,
        }))}
        canEdit={editor}
        available={allAdrs.map(a => ({ id: a.id, name: `ADR-${String(a.number).padStart(3, '0')} ${a.title}` }))}
        addAction={addAdr}
        removeAction={removeAdr}
      />

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
