'use client'

import { useState, useTransition } from 'react'
import type { Persona, PersonaType, Tag } from '@/db/schema'
import {
  createPersona, editPersona, deletePersona,
  createPersonaType, deletePersonaType,
  createTag, deleteTag,
} from '@/actions/personas'
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

type PersonaRow = Persona & {
  personaTags: { tag: Tag }[]
}

interface Props {
  personas: PersonaRow[]
  personaTypes: PersonaType[]
  allTags: Tag[]
  role: Role
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

export function PersonaTable({ personas, personaTypes, allTags, role }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PersonaRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PersonaRow | null>(null)
  const [manageTypesOpen, setManageTypesOpen] = useState(false)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const filtered = personas.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || p.type === typeFilter
    const matchTag = tagFilter === 'all' || p.personaTags.some(pt => pt.tag.id === tagFilter)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchType && matchTag && matchStatus
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createPersona(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editPersona(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deletePersona(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  async function handleAddType() {
    if (!newTypeName.trim()) return
    startTransition(async () => {
      await createPersonaType(newTypeName.trim())
      setNewTypeName('')
      refresh()
    })
  }

  async function handleDeleteType(typeId: string) {
    startTransition(async () => {
      await deletePersonaType(typeId)
      refresh()
    })
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return
    startTransition(async () => {
      await createTag(newTagName.trim())
      setNewTagName('')
      refresh()
    })
  }

  async function handleDeleteTag(tagId: string) {
    startTransition(async () => {
      await deleteTag(tagId)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search personas…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All types</option>
          {personaTypes.map(t => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All tags</option>
          {allTags.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
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
        <div className="ml-auto flex items-center gap-2">
          {canDelete && (
            <>
              <Button variant="outline" size="sm" onClick={() => setManageTagsOpen(true)}>
                Manage tags
              </Button>
              <Button variant="outline" size="sm" onClick={() => setManageTypesOpen(true)}>
                Manage types
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              + New persona
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Created</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                  {personas.length === 0
                    ? 'No personas yet. Add one to get started.'
                    : 'No personas match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.type ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.personaTags.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : p.personaTags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200"
                          >
                            {tag.name}
                          </span>
                        ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[p.status])}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[p.visibility])}>
                    {VISIBILITY_LABELS[p.visibility]}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(p.createdAt).toLocaleDateString()}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(p)} className="h-7 px-2 text-xs">
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(p)}
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

      {/* Manage Tags Dialog */}
      <Dialog open={manageTagsOpen} onOpenChange={setManageTagsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tags are cross-cutting labels for filtering and search. Changes apply to your organization only.
          </p>
          <div className="space-y-2">
            {allTags.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No tags defined yet.</p>
            )}
            {allTags.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {t.name}
                </span>
                <Button
                  variant="ghost" size="sm"
                  disabled={isPending}
                  onClick={() => handleDeleteTag(t.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New tag name…"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
              disabled={isPending}
            />
            <Button onClick={handleAddTag} disabled={isPending || !newTagName.trim()} size="sm">
              Add
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTagsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Types Dialog */}
      <Dialog open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage persona types</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Types help categorize personas. Changes apply to your organization only.
          </p>
          <div className="space-y-2">
            {personaTypes.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No types defined yet.</p>
            )}
            {personaTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{t.name}</span>
                <Button
                  variant="ghost" size="sm"
                  disabled={isPending}
                  onClick={() => handleDeleteType(t.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New type name…"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddType() } }}
              disabled={isPending}
            />
            <Button onClick={handleAddType} disabled={isPending || !newTypeName.trim()} size="sm">
              Add
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTypesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New persona</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <FormField label="Name" name="name" required />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select name="type" defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                {personaTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {allTags.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="tagIds" value={t.id} className="rounded" />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue="draft" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue="org" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="org">Org only</option>
                <option value="connections">Connected orgs</option>
                <option value="instance">Instance-wide</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create persona'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit persona</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editTarget?.description ?? ''}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select name="type" defaultValue={editTarget?.type ?? ''} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                {personaTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {allTags.map(t => {
                    const checked = editTarget?.personaTags.some(pt => pt.tag.id === t.id) ?? false
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" name="tagIds" value={t.id} defaultChecked={checked} className="rounded" />
                        {t.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue={editTarget?.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue={editTarget?.visibility ?? 'org'} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="org">Org only</option>
                <option value="connections">Connected orgs</option>
                <option value="instance">Instance-wide</option>
              </select>
            </div>
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
          <DialogHeader>
            <DialogTitle>Delete persona</DialogTitle>
          </DialogHeader>
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

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}
