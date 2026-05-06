'use client'

import { useState, useTransition } from 'react'
import { createPrinciple, editPrinciple, deletePrinciple } from '@/actions/principles'
import type { Principle, ADR, Capability } from '@/db/schema'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'
import type { TaxonomyTerm, EntityTaxonomyValue } from '@/db/schema'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyFilters, TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'

type PrincipleRow = Principle & {
  organization: { id: string; name: string } | null
  principleAdrs: { adr: ADR }[]
  principleCapabilities: { capability: Capability }[]
}

interface Props {
  principles: PrincipleRow[]
  adrs: Pick<ADR, 'id' | 'number' | 'title'>[]
  capabilities: Pick<Capability, 'id' | 'name' | 'domain'>[]
  principleTypes: Pick<TaxonomyTerm, 'id' | 'name' | 'slug'>[]
  role: Role
  currentOrgId: string
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
}

// Stable colour palette — cycles through when more than 2 types exist
const TYPE_PALETTE = [
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-pink-50 text-pink-700 border-pink-200',
]

const TYPE_ACTIVE_PALETTE = [
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-violet-600 text-white',
  'bg-orange-600 text-white',
  'bg-pink-600 text-white',
]

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

export function PrincipleTable({ principles, adrs, capabilities, principleTypes, role, currentOrgId, taxonomyDefinitions, taxonomyValueMap }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PrincipleRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PrincipleRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const hasTaxonomyFilter = Object.values(taxonomyFilters).some(v => v !== 'all')

  const filtered = principles.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchType = typeFilter === 'all' || p.principleType === typeFilter
    const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) =>
      termId === 'all' || (taxonomyValueMap[p.id] ?? []).some(v => v.taxonomyTermId === termId)
    )
    return matchStatus && matchType && matchTaxonomy
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createPrinciple(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editPrinciple(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deletePrinciple(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {principleTypes.length > 0 && (
          <div className="flex items-center rounded-md border border-input overflow-hidden text-sm">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn('px-3 h-9 transition-colors', typeFilter === 'all' ? 'bg-foreground text-background' : 'hover:bg-muted text-muted-foreground')}
            >
              All types
            </button>
            {principleTypes.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.slug)}
                className={cn(
                  'px-3 h-9 transition-colors',
                  typeFilter === t.slug ? TYPE_ACTIVE_PALETTE[i % TYPE_ACTIVE_PALETTE.length] : 'hover:bg-muted text-muted-foreground',
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <TaxonomyFilters
          defs={taxonomyDefinitions}
          filters={taxonomyFilters}
          onFilterChange={(defId, value) => setTaxonomyFilters(prev => ({ ...prev, [defId]: value }))}
        />
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New Principle
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>ADRs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                  {principles.length === 0
                    ? 'No principles yet. Add one to get started.'
                    : 'No principles match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(principle => (
              <TableRow key={principle.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link href={`/principles/${principle.id}`} className="hover:underline">
                      {principle.name}
                    </Link>
                    {principle.organizationId !== currentOrgId && principle.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {principle.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs">
                  <p className="line-clamp-2">{principle.description ?? '—'}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {principle.principleCapabilities.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : principle.principleCapabilities.map(({ capability }) => (
                        <span key={capability.id} className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                          {capability.name}
                        </span>
                      ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {principle.principleAdrs.length === 0
                      ? '—'
                      : `${principle.principleAdrs.length} ADR${principle.principleAdrs.length === 1 ? '' : 's'}`}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[principle.status])}>
                    {principle.status.charAt(0).toUpperCase() + principle.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[principle.visibility])}>
                    {VISIBILITY_LABELS[principle.visibility]}
                  </span>
                </TableCell>
                {canEdit && principle.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/principles/${principle.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(principle)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(principle)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEdit && principle.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/principles/${principle.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                    </Link>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) setCreateOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Principle</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <FormField label="Name" name="name" required placeholder="e.g. SaaS First" />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="One-sentence summary — Markdown supported" />
            <MarkdownEditor label="Statement" name="title" rows={2} placeholder="Full imperative statement e.g. Prefer SaaS for all new application acquisitions — Markdown supported" />
            <MarkdownEditor label="Rationale" name="rationale" rows={3} placeholder="Why this principle exists and what problem it addresses — Markdown supported" />
            <MarkdownEditor label="Implications" name="implications" rows={3} placeholder="What this means in practice — constraints, expectations, and examples — Markdown supported" />
            <LinkedItemsFields
              adrs={adrs}
              capabilities={capabilities}
              selectedAdrIds={[]}
              selectedCapabilityIds={[]}
            />
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <PrincipleTypeField defaultType="architecture" types={principleTypes} />
            <StatusVisibilityFields defaultStatus="draft" defaultVisibility="org" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Principle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Principle</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-4">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <MarkdownEditor label="Statement" name="title" rows={2} defaultValue={editTarget?.title ?? ''} placeholder="Markdown supported" />
            <MarkdownEditor label="Rationale" name="rationale" rows={3} defaultValue={editTarget?.rationale ?? ''} placeholder="Markdown supported" />
            <MarkdownEditor label="Implications" name="implications" rows={3} defaultValue={editTarget?.implications ?? ''} placeholder="Markdown supported" />
            <LinkedItemsFields
              adrs={adrs}
              capabilities={capabilities}
              selectedAdrIds={editTarget?.principleAdrs.map(pa => pa.adr.id) ?? []}
              selectedCapabilityIds={editTarget?.principleCapabilities.map(pc => pc.capability.id) ?? []}
            />
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <PrincipleTypeField defaultType={editTarget?.principleType ?? 'architecture'} types={principleTypes} />
            <StatusVisibilityFields
              defaultStatus={editTarget?.status ?? 'draft'}
              defaultVisibility={editTarget?.visibility ?? 'org'}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Principle</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = (props.id ?? props.name ?? label).toString().toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  )
}


function CheckboxList({
  label, name, items, selectedIds,
}: {
  label: string
  name: string
  items: { id: string; name: string }[]
  selectedIds: string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
        {items.map(item => (
          <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={selectedIds.includes(item.id)}
              className="rounded"
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  )
}

function LinkedItemsFields({
  adrs, capabilities, selectedAdrIds, selectedCapabilityIds,
}: {
  adrs: Pick<ADR, 'id' | 'number' | 'title'>[]
  capabilities: Pick<Capability, 'id' | 'name' | 'domain'>[]
  selectedAdrIds: string[]
  selectedCapabilityIds: string[]
}) {
  const adrItems = adrs.map(a => ({ id: a.id, name: `${a.number} — ${a.title}` }))
  return (
    <div className="grid grid-cols-2 gap-3">
      {capabilities.length > 0 && (
        <CheckboxList label="Capabilities" name="capabilityIds" items={capabilities} selectedIds={selectedCapabilityIds} />
      )}
      {adrs.length > 0 && (
        <CheckboxList label="ADRs" name="adrIds" items={adrItems} selectedIds={selectedAdrIds} />
      )}
    </div>
  )
}

function PrincipleTypeField({
  defaultType,
  types,
}: {
  defaultType: string
  types: Pick<TaxonomyTerm, 'id' | 'name' | 'slug'>[]
}) {
  if (types.length === 0) return null
  return (
    <div className="space-y-1.5">
      <Label htmlFor="principle-principleType">Principle Set</Label>
      <select
        id="principle-principleType"
        name="principleType"
        defaultValue={defaultType}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {types.map(t => (
          <option key={t.id} value={t.slug}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}

function StatusVisibilityFields({
  defaultStatus, defaultVisibility,
}: {
  defaultStatus: string
  defaultVisibility: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="principle-status">Status</Label>
        <select id="principle-status" name="status" defaultValue={defaultStatus}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="principle-visibility">Visibility</Label>
        <select id="principle-visibility" name="visibility" defaultValue={defaultVisibility}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="org">Org only</option>
          <option value="connections">Connected orgs</option>
          <option value="instance">Instance-wide</option>
        </select>
      </div>
    </div>
  )
}
