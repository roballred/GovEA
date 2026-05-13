import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getDataArchitectureGraph,
  type GraphFilters,
} from '@/lib/data-architecture-graph'
import { DataArchitectureDiagram } from '@/components/data-architecture-diagram'
import { getPersonas } from '@/actions/personas'
import type { PhysicalAttributeType, PhysicalLinkType } from '@/db/schema'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PHYSICAL_ATTRIBUTE_TYPES: PhysicalAttributeType[] = [
  'effectivity', 'multi-active', 'record-tracking', 'status-tracking',
]
const PHYSICAL_LINK_TYPES: PhysicalLinkType[] = ['same-as', 'hierarchical']

interface SearchParams {
  ownerPersonaId?: string
  q?: string
  attrType?: string
  linkType?: string
}

/**
 * /data/diagram — Chen Notation overview of the entire metamodel.
 *
 * Capability: da-chen-visualization
 * Persona: Enterprise Data Architect, Data Modeler
 */
export default async function DataArchitectureDiagramPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const role = session.user.role

  const filters: GraphFilters = {}
  if (params.ownerPersonaId) filters.ownerPersonaIds = [params.ownerPersonaId]
  if (params.q?.trim()) filters.nameSearch = params.q.trim()
  if (params.attrType && PHYSICAL_ATTRIBUTE_TYPES.includes(params.attrType as PhysicalAttributeType)) {
    filters.physicalAttributeType = params.attrType as PhysicalAttributeType
  }
  if (params.linkType && PHYSICAL_LINK_TYPES.includes(params.linkType as PhysicalLinkType)) {
    filters.physicalLinkType = params.linkType as PhysicalLinkType
  }

  const [graph, allPersonas] = await Promise.all([
    getDataArchitectureGraph({
      organizationId: session.user.organizationId!,
      role,
      filters,
    }),
    getPersonas(),
  ])

  const filtersActive = !!(filters.ownerPersonaIds?.length || filters.nameSearch || filters.physicalAttributeType || filters.physicalLinkType)

  return (
    <div className="space-y-5">
      <div>
        <Link href="/data" className="text-sm text-muted-foreground hover:underline">← Data architecture</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Diagram</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Chen Notation overview of the org&apos;s metamodel. Entities as rectangles, attributes as ovals,
          business keys as underlined ovals (Chen key convention). Diamonds label cross-object
          relationships ({'"'}is related{'"'} / {'"'}shares{'"'} / {'"'}instantiates{'"'}). The diagram is read-only — click any
          node to edit it on its detail page.
        </p>
      </div>

      <FilterBar params={params} personas={allPersonas} filtersActive={filtersActive} />

      <p className="text-xs text-muted-foreground">
        Showing {graph.entities.length} {plural(graph.entities.length, 'entity', 'entities')},{' '}
        {graph.attributes.length} {plural(graph.attributes.length, 'attribute', 'attributes')},{' '}
        {graph.businessKeys.length} business key{graph.businessKeys.length === 1 ? '' : 's'},{' '}
        {graph.edges.length} relationship{graph.edges.length === 1 ? '' : 's'}.
      </p>

      <DataArchitectureDiagram graph={graph} />

      <Legend />
    </div>
  )
}

function plural(n: number, sing: string, pl: string): string {
  return n === 1 ? sing : pl
}

function FilterBar({ params, personas, filtersActive }: {
  params: SearchParams
  personas: { id: string; name: string }[]
  filtersActive: boolean
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="space-y-1">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
        <input
          id="q" name="q" type="text"
          defaultValue={params.q ?? ''}
          placeholder="Search by name"
          className="rounded-md border bg-background px-2.5 py-1.5 text-sm w-44"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="ownerPersonaId" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Owner</label>
        <select
          id="ownerPersonaId" name="ownerPersonaId"
          defaultValue={params.ownerPersonaId ?? ''}
          className="rounded-md border bg-background px-2.5 py-1.5 text-sm w-44"
        >
          <option value="">All owners</option>
          {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="attrType" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attribute type</label>
        <select
          id="attrType" name="attrType"
          defaultValue={params.attrType ?? ''}
          className="rounded-md border bg-background px-2.5 py-1.5 text-sm w-40"
        >
          <option value="">All types</option>
          {PHYSICAL_ATTRIBUTE_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="linkType" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link type</label>
        <select
          id="linkType" name="linkType"
          defaultValue={params.linkType ?? ''}
          className="rounded-md border bg-background px-2.5 py-1.5 text-sm w-40"
        >
          <option value="">All types</option>
          {PHYSICAL_LINK_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
        {filtersActive && (
          <Link
            href="/data/diagram"
            className={cn('rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted/50')}
          >
            Reset
          </Link>
        )}
      </div>
    </form>
  )
}

function Legend() {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground mb-2">Legend</p>
      <ul className="grid gap-1 sm:grid-cols-2">
        <li>▭ Entity (Data Vault Hub)</li>
        <li>◯ Attribute (Data Vault Satellite)</li>
        <li>◯ Business key (underlined — Chen key convention)</li>
        <li>◇ Cross-object relationship — labeled with kind</li>
        <li>→ Solid arrow: instantiates (entity → business key)</li>
        <li>┄ Dashed line: shares (attribute ↔ attribute)</li>
      </ul>
    </div>
  )
}
