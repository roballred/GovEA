'use client'

import { useState, useTransition } from 'react'
import type { Persona, TaxonomyTerm } from '@/db/schema'
import { createPersona, editPersona, deletePersona, importPersonas, type PersonaImportResult } from '@/actions/personas'
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
import { submitWithDuplicateAck } from '@/lib/duplicate-name-client'
import { useDirtyTracker, confirmDiscard } from '@/lib/use-dirty-dialog'
import { EmptyStateCTA } from '@/components/empty-state-cta'
import type { Role } from '@/lib/rbac'
import { MarkdownEditor } from '@/components/markdown-editor'

type PersonaRow = Persona & {
  organization: { id: string; name: string } | null
  personaTags: { tag: TaxonomyTerm }[]
}

interface Props {
  personas: PersonaRow[]
  personaTypes: TaxonomyTerm[]
  allTags: TaxonomyTerm[]
  role: Role
  currentOrgId: string
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

export function PersonaTable({ personas, personaTypes, allTags, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  const orgOptions = Array.from(new Map(
    personas.map(p => [p.organizationId, p.organization?.name ?? 'Unknown'])
  ).entries())

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PersonaRow | null>(null)
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<PersonaRow | null>(null)

  // CSV import dialog state (#596) — same shape as Capabilities import.
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<PersonaImportResult | null>(null)
  const [importResult, setImportResult] = useState<PersonaImportResult | null>(null)

  async function handleImportPreview() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importPersonas(fd, true)
      setImportPreview(result)
    })
  }

  async function handleImportConfirm() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importPersonas(fd, false)
      setImportResult(result)
      setImportPreview(null)
      setImportFile(null)
      router.refresh()
    })
  }

  function openImport() {
    setImportOpen(true)
    setImportResult(null)
    setImportPreview(null)
    setImportFile(null)
  }

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const filtered = personas.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || p.type === typeFilter
    const matchTag = tagFilter === 'all' || p.personaTags.some(pt => pt.tag.id === tagFilter)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? p.organizationId === currentOrgId : p.organizationId === orgFilter)
    return matchSearch && matchType && matchTag && matchStatus && matchOrg
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createPersona, formData)
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
      await editPersona(editTarget.id, formData)
      editDirty.reset()
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
          aria-label="Filter by type"
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
          aria-label="Filter by tag"
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
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        {orgOptions.length > 1 && (
          <select aria-label="Filter by organization" value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">All organizations</option>
            <option value="own">My organization</option>
            {orgOptions.filter(([id]) => id !== currentOrgId).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <a href="/api/personas/export">
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                + New Persona
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state — when the org has no personas at all (#587 follow-up). */}
      {personas.length === 0 ? (
        <EmptyStateCTA
          entityLabel="persona"
          description="Personas describe the people the organization serves and the staff who deliver. Everything else in EasyEA traces back to a persona."
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
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-10">
                  {personas.length === 0 ? (
                    <div className="space-y-3">
                      <p>No personas yet.</p>
                      {canEdit && (
                        <p className="text-xs">
                          Add your first persona, or{' '}
                          <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                            apply a starter pack in Settings
                          </Link>{' '}
                          to populate a small example city.
                        </p>
                      )}
                    </div>
                  ) : (
                    'No personas match the current filters.'
                  )}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/personas/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                    {p.organizationId !== currentOrgId && p.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {p.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
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
                {canEdit && p.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/personas/${p.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
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
                {canEdit && p.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/personas/${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                    </Link>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Persona</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required />
            <MarkdownEditor label="Description" name="description" rows={3} placeholder="Markdown supported" />
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
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(createDirty)) { createDirty.reset(); setCreateOpen(false) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create persona'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open && !confirmDiscard(editDirty)) return; if (!open) { editDirty.reset(); setEditTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Persona</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={3} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
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
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(editDirty)) { editDirty.reset(); setEditTarget(null) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Persona</DialogTitle>
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

      {/* CSV Import dialog (#596) */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) setImportOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Personas</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload a CSV with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">type</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">tags</code> (semicolon-separated names from the Persona Tag taxonomy).
              Existing personas are matched by name (case-insensitive) and updated. Unknown tag names are reported as warnings without failing the row.
            </p>

            {!importResult && (
              <div className="space-y-1.5">
                <Label>CSV file</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null) }}
                />
              </div>
            )}

            {importPreview && !importResult && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="font-medium">Preview</p>
                <p>Will create <strong>{importPreview.created}</strong> · update <strong>{importPreview.updated}</strong> · skip <strong>{importPreview.skipped}</strong></p>
                {importPreview.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {importPreview.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {importResult && (
              <div className="rounded-md border bg-emerald-50 border-emerald-200 p-3 space-y-1">
                <p className="font-medium text-emerald-800">Import complete</p>
                <p className="text-emerald-700">Created <strong>{importResult.created}</strong> · updated <strong>{importResult.updated}</strong> · skipped <strong>{importResult.skipped}</strong></p>
                {importResult.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && !importPreview && (
              <Button onClick={handleImportPreview} disabled={!importFile || isPending}>
                {isPending ? 'Checking…' : 'Preview'}
              </Button>
            )}
            {importPreview && !importResult && (
              <Button onClick={handleImportConfirm} disabled={isPending || importPreview.created + importPreview.updated === 0}>
                {isPending ? 'Importing…' : `Import ${importPreview.created + importPreview.updated} records`}
              </Button>
            )}
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
