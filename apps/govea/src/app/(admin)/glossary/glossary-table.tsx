'use client'

import { useState, useTransition } from 'react'
import { createGlossaryTerm, editGlossaryTerm, deleteGlossaryTerm } from '@/actions/glossary'
import type { GlossaryTerm, GlossaryTermSource } from '@/db/schema'
import { DomainCombobox } from '@/components/domain-combobox'
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

type GlossaryRow = GlossaryTerm & {
  organization: { id: string; name: string } | null
}

interface Props {
  terms: GlossaryRow[]
  domainTerms: { id: string; name: string }[]
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

export function GlossaryTable({ terms, domainTerms, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GlossaryRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GlossaryRow | null>(null)

  const canEditRole = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const domains = Array.from(new Set(terms.map(t => t.domain).filter(Boolean))) as string[]

  const filtered = terms.filter(t => {
    const matchesSearch = search === '' || t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase())
    const matchesDomain = domainFilter === 'all' || t.domain === domainFilter
    return matchesSearch && matchesDomain
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createGlossaryTerm(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editGlossaryTerm(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteGlossaryTerm(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search terms…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-48"
        />
        {domains.length > 0 && (
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All domains</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {canEditRole && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New Term
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Term</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEditRole && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEditRole ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {terms.length === 0
                    ? 'No glossary terms yet. Add one to get started.'
                    : 'No terms match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(term => (
              <TableRow key={term.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link href={`/glossary/${term.id}`} className="hover:underline">
                      {term.term}
                    </Link>
                    {term.organizationId !== currentOrgId && term.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {term.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs">
                  <p className="line-clamp-2">{term.definition}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {term.domain ?? '—'}
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[term.status])}>
                    {term.status.charAt(0).toUpperCase() + term.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[term.visibility])}>
                    {VISIBILITY_LABELS[term.visibility]}
                  </span>
                </TableCell>
                {canEditRole && term.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/glossary/${term.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(term)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(term)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEditRole && term.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/glossary/${term.id}`}>
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
            <DialogTitle>New Term</DialogTitle>
          </DialogHeader>
          <TermForm
            domainTerms={domainTerms}
            isPending={isPending}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create Term"
            pendingLabel="Creating…"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Term</DialogTitle>
          </DialogHeader>
          <TermForm
            key={editTarget?.id}
            term={editTarget ?? undefined}
            domainTerms={domainTerms}
            isPending={isPending}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save changes"
            pendingLabel="Saving…"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Term</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>{deleteTarget?.term}</strong>? This cannot be undone.
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

// ── TermForm ──────────────────────────────────────────────────────────────────

type SourceRow = { name: string; url: string; definition: string }

function TermForm({
  term,
  domainTerms,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel,
}: {
  term?: GlossaryRow & { sources?: GlossaryTermSource[] }
  domainTerms: { id: string; name: string }[]
  isPending: boolean
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  submitLabel: string
  pendingLabel: string
}) {
  const [definition, setDefinition] = useState(term?.definition ?? '')
  const [defSource, setDefSource] = useState(term?.definitionSource ?? '')
  const [defSourceUrl, setDefSourceUrl] = useState(term?.definitionSourceUrl ?? '')
  const [sources, setSources] = useState<SourceRow[]>(
    term?.sources?.map(s => ({ name: s.name, url: s.url ?? '', definition: s.definition })) ?? []
  )

  function addSource() {
    setSources(prev => [...prev, { name: '', url: '', definition: '' }])
  }

  function removeSource(i: number) {
    setSources(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateSource(i: number, field: keyof SourceRow, value: string) {
    setSources(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function applySource(s: SourceRow) {
    setDefinition(s.definition)
    setDefSource(s.name)
    setDefSourceUrl(s.url)
  }

  function clearSource() {
    setDefSource('')
    setDefSourceUrl('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('definition', definition)
    fd.set('definitionSource', defSource)
    fd.set('definitionSourceUrl', defSourceUrl)
    fd.set('sources', JSON.stringify(sources.filter(s => s.name && s.definition)))
    onSubmit(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Term" name="term" required defaultValue={term?.term} placeholder="e.g. Capability" />

      {/* Definition with attribution */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="glossary-definition">Definition <span className="text-destructive">*</span></Label>
          {defSource && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Source:</span>
              {defSourceUrl
                ? <a href={defSourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{defSource}</a>
                : <span className="font-medium">{defSource}</span>
              }
              <button type="button" onClick={clearSource} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
            </div>
          )}
        </div>
        <textarea
          id="glossary-definition"
          name="definition"
          rows={3}
          required
          placeholder="Plain-language definition"
          value={definition}
          onChange={e => setDefinition(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <DomainCombobox
        options={domainTerms.map(t => t.name)}
        defaultValue={term?.domain ?? ''}
      />
      <TextareaField label="Notes" name="notes" rows={2} defaultValue={term?.notes ?? ''} placeholder="Usage guidance, synonyms, or anti-patterns (optional)" />
      <StatusVisibilityFields defaultStatus={term?.status ?? 'draft'} defaultVisibility={term?.visibility ?? 'org'} />

      {/* Reference Sources */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Reference Sources</Label>
          <button
            type="button"
            onClick={addSource}
            className="text-xs text-blue-600 hover:underline"
          >
            + Add source
          </button>
        </div>
        {sources.length === 0 && (
          <p className="text-xs text-muted-foreground">No reference sources added. Sources let you track authoritative definitions and select one as active.</p>
        )}
        {sources.map((s, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Source name (e.g. TOGAF 10)"
                value={s.name}
                onChange={e => updateSource(i, 'name', e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="url"
                placeholder="URL (optional)"
                value={s.url}
                onChange={e => updateSource(i, 'url', e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeSource(i)}
                className="text-muted-foreground hover:text-destructive text-sm px-1"
              >
                ×
              </button>
            </div>
            <textarea
              placeholder="Verbatim definition from this source"
              value={s.definition}
              onChange={e => updateSource(i, 'definition', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            {s.name && s.definition && (
              <button
                type="button"
                onClick={() => applySource(s)}
                className="text-xs text-blue-600 hover:underline"
              >
                Use this definition
              </button>
            )}
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? pendingLabel : submitLabel}</Button>
      </DialogFooter>
    </form>
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

function TextareaField({
  label, name, placeholder, defaultValue, rows = 3, required,
}: {
  label: string
  name: string
  placeholder?: string
  defaultValue?: string
  rows?: number
  required?: boolean
}) {
  const id = `glossary-${name}`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
      />
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
        <Label htmlFor="glossary-status">Status</Label>
        <select id="glossary-status" name="status" defaultValue={defaultStatus}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="glossary-visibility">Visibility</Label>
        <select id="glossary-visibility" name="visibility" defaultValue={defaultVisibility}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="org">Org only</option>
          <option value="connections">Connected orgs</option>
          <option value="instance">Instance-wide</option>
        </select>
      </div>
    </div>
  )
}
