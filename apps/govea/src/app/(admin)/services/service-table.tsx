'use client'

import { useState, useTransition } from 'react'
import type { Service, Persona, EntityTaxonomyValue } from '@/db/schema'
import { createService, editService, deleteService } from '@/actions/services'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { submitWithDuplicateAck } from '@/lib/duplicate-name-client'
import { useDirtyTracker, confirmDiscard } from '@/lib/use-dirty-dialog'
import { EmptyStateCTA } from '@/components/empty-state-cta'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyInputs, TaxonomyFilters, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'

type ServiceRow = Pick<Service, 'id' | 'name' | 'description' | 'serviceOwner' | 'channels' | 'status' | 'visibility' | 'organizationId'> & {
  organization: { id: string; name: string } | null
  servicePersonas: { persona: Pick<Persona, 'id' | 'name'> }[]
}

interface Props {
  services: ServiceRow[]
  personas: Pick<Persona, 'id' | 'name'>[]
  role: Role
  currentOrgId: string
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
}

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

export function ServiceTable({ services, personas, role, currentOrgId, taxonomyDefinitions, taxonomyValueMap }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceRow | null>(null)
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const filtered = services.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchChannel = channelFilter === 'all' || s.channels.includes(channelFilter)
    const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) => {
      if (termId === 'all') return true
      return (taxonomyValueMap[s.id] ?? []).some(v => v.taxonomyTermId === termId)
    })
    return matchSearch && matchStatus && matchChannel && matchTaxonomy
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createService, formData)
        createDirty.reset()
        setCreateOpen(false)
        refresh()
      } catch (err) {
        if (typeof window !== 'undefined') {
          window.alert(err instanceof Error ? err.message : 'Create failed')
        }
      }
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editService(editTarget.id, formData)
      editDirty.reset()
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteService(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search services…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
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
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All channels</option>
          <option value="online">Online</option>
          <option value="in-person">In-person</option>
          <option value="phone">Phone</option>
          <option value="mobile">Mobile</option>
        </select>
        <TaxonomyFilters
          defs={taxonomyDefinitions}
          filters={taxonomyFilters}
          onFilterChange={(defId, value) => setTaxonomyFilters(prev => ({ ...prev, [defId]: value }))}
        />
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} className="ml-auto" size="sm">
            + New Service
          </Button>
        )}
      </div>

      {/* Empty state — when the org has no services at all (#587 follow-up). */}
      {services.length === 0 ? (
        <EmptyStateCTA
          entityLabel="service"
          description="Services are the channels through which personas interact with the organization — what your residents, businesses, and staff actually do with you."
          onAdd={canEdit ? () => setCreateOpen(true) : undefined}
          canApplyStarterPack={role === 'admin'}
        />
      ) : (
      <>
      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {services.length === 0
                    ? 'No services yet. Add one to get started.'
                    : 'No services match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/services/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                    {s.organizationId !== currentOrgId && s.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {s.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.serviceOwner ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.channels.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : s.channels.map(ch => (
                        <span key={ch} className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', CHANNEL_STYLES[ch] ?? 'bg-slate-50 text-slate-700 border-slate-200')}>
                          {CHANNEL_LABELS[ch] ?? ch}
                        </span>
                      ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[s.status])}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[s.visibility])}>
                    {VISIBILITY_LABELS[s.visibility]}
                  </span>
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/services/${s.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(s)} className="h-7 px-2 text-xs">
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(s)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o && !confirmDiscard(createDirty)) return; if (!o) createDirty.reset(); setCreateOpen(o) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Service</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <FormField label="Service owner" name="serviceOwner" placeholder="Team or individual responsible" />
            <ChannelCheckboxes />
            <PersonaCheckboxes personas={personas} selectedIds={[]} />
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <StatusVisibilityFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(createDirty)) { createDirty.reset(); setCreateOpen(false) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create service'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open && !confirmDiscard(editDirty)) return; if (!open) { editDirty.reset(); setEditTarget(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <FormField label="Service owner" name="serviceOwner" placeholder="Team or individual responsible" defaultValue={editTarget?.serviceOwner ?? ''} />
            <ChannelCheckboxes selected={editTarget?.channels ?? []} />
            <PersonaCheckboxes personas={personas} selectedIds={editTarget?.servicePersonas.map(sp => sp.persona.id) ?? []} />
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <StatusVisibilityFields status={editTarget?.status} visibility={editTarget?.visibility} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(editDirty)) { editDirty.reset(); setEditTarget(null) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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

// ── Form sub-components ────────────────────────────────────────────────────────

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}

function ChannelCheckboxes({ selected = [] }: { selected?: string[] }) {
  const channels = [
    { value: 'online', label: 'Online' },
    { value: 'in-person', label: 'In-person' },
    { value: 'phone', label: 'Phone' },
    { value: 'mobile', label: 'Mobile' },
  ]
  return (
    <div className="space-y-1.5">
      <Label>Channels</Label>
      <div className="flex flex-wrap gap-3">
        {channels.map(ch => (
          <label key={ch.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="channels"
              value={ch.value}
              defaultChecked={selected.includes(ch.value)}
              className="rounded"
            />
            {ch.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function PersonaCheckboxes({ personas, selectedIds }: { personas: Pick<Persona, 'id' | 'name'>[]; selectedIds: string[] }) {
  if (personas.length === 0) return null
  return (
    <div className="space-y-1.5">
      <Label>Personas</Label>
      <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
        {personas.map(p => (
          <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="personaIds"
              value={p.id}
              defaultChecked={selectedIds.includes(p.id)}
              className="rounded"
            />
            {p.name}
          </label>
        ))}
      </div>
    </div>
  )
}

function StatusVisibilityFields({ status = 'draft', visibility = 'org' }: { status?: string; visibility?: string }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select name="status" defaultValue={status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Visibility</Label>
        <select name="visibility" defaultValue={visibility} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="org">Org only</option>
          <option value="connections">Connected orgs</option>
          <option value="instance">Instance-wide</option>
        </select>
      </div>
    </>
  )
}
