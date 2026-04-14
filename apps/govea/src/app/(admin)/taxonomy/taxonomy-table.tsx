'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TaxonomyTerm } from '@/db/schema'
import { createTaxonomyTerm, editTaxonomyTerm, deleteTaxonomyTerm } from '@/actions/taxonomy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { Role } from '@/lib/rbac'

interface Props {
  domains: TaxonomyTerm[]
  children: TaxonomyTerm[]
  role: Role
}

type EditTarget = { term: TaxonomyTerm; type: 'domain' | 'child' }
type DeleteTarget = { term: TaxonomyTerm; childCount: number }

export function TaxonomyTable({ domains, children, role }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [createDomainOpen, setCreateDomainOpen] = useState(false)
  const [createChildTarget, setCreateChildTarget] = useState<TaxonomyTerm | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  // Group children by parentId
  const childrenByParent = children.reduce<Record<string, TaxonomyTerm[]>>((acc, c) => {
    if (!c.parentId) return acc
    if (!acc[c.parentId]) acc[c.parentId] = []
    acc[c.parentId].push(c)
    return acc
  }, {})

  async function handleCreateDomain(fd: FormData) {
    startTransition(async () => {
      await createTaxonomyTerm(fd)
      setCreateDomainOpen(false)
      refresh()
    })
  }

  async function handleCreateChild(fd: FormData) {
    startTransition(async () => {
      await createTaxonomyTerm(fd)
      setCreateChildTarget(null)
      refresh()
    })
  }

  async function handleEdit(fd: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editTaxonomyTerm(editTarget.term.id, fd)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteTaxonomyTerm(deleteTarget.term.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {domains.length === 0
            ? 'No domains yet — add one to start classifying capabilities and glossary terms.'
            : `${domains.length} domain${domains.length !== 1 ? 's' : ''}${children.length > 0 ? `, ${children.length} sub-term${children.length !== 1 ? 's' : ''}` : ''}`}
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateDomainOpen(true)}>
            + New Domain
          </Button>
        )}
      </div>

      {/* Domain list */}
      {domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No taxonomy domains defined. Domains you create here will appear as options when setting
          the domain on capabilities and glossary terms.
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map(domain => {
            const domainChildren = childrenByParent[domain.id] ?? []
            return (
              <div key={domain.id} className="rounded-lg border bg-card">
                {/* Domain header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 border-violet-200">
                      Domain
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{domain.name}</p>
                      {domain.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{domain.description}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCreateChildTarget(domain)}
                      >
                        + Sub-term
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditTarget({ term: domain, type: 'domain' })}
                      >
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ term: domain, childCount: domainChildren.length })}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Child terms */}
                {domainChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 pl-10 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground/40 text-xs">└</span>
                      <div>
                        <p className="text-sm">{child.name}</p>
                        {child.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{child.description}</p>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditTarget({ term: child, type: 'child' })}
                        >
                          Edit
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget({ term: child, childCount: 0 })}
                            disabled={isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty state for children */}
                {domainChildren.length === 0 && (
                  <div className="px-10 py-2 text-xs text-muted-foreground/60 italic">
                    No sub-terms
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Domain Dialog */}
      <Dialog open={createDomainOpen} onOpenChange={setCreateDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Domain</DialogTitle>
          </DialogHeader>
          <form action={handleCreateDomain} className="space-y-3">
            <TermFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDomainOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Domain'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Child Dialog */}
      <Dialog open={!!createChildTarget} onOpenChange={open => { if (!open) setCreateChildTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Sub-term under &ldquo;{createChildTarget?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <form action={handleCreateChild} className="space-y-3">
            <input type="hidden" name="parentId" value={createChildTarget?.id ?? ''} />
            <TermFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateChildTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Sub-term'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.type === 'domain' ? 'Domain' : 'Sub-term'}</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <TermFields defaultName={editTarget?.term.name} defaultDescription={editTarget?.term.description ?? ''} defaultSortOrder={editTarget?.term.sortOrder ?? ''} />
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
          <DialogHeader><DialogTitle>Delete &ldquo;{deleteTarget?.term.name}&rdquo;</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Are you sure you want to delete <strong>{deleteTarget?.term.name}</strong>? This cannot be undone.</p>
            {(deleteTarget?.childCount ?? 0) > 0 && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                This domain has <strong>{deleteTarget?.childCount} sub-term{deleteTarget?.childCount !== 1 ? 's' : ''}</strong>.
                They will be promoted to top-level domains.
              </p>
            )}
          </div>
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

// ── Shared form fields ────────────────────────────────────────────────────────

function TermFields({
  defaultName = '',
  defaultDescription = '',
  defaultSortOrder = '',
}: {
  defaultName?: string
  defaultDescription?: string
  defaultSortOrder?: string
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="term-name">Name <span className="text-destructive">*</span></Label>
        <Input id="term-name" name="name" required defaultValue={defaultName} placeholder="e.g. Information Technology" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="term-description">Description</Label>
        <textarea
          id="term-description"
          name="description"
          rows={2}
          defaultValue={defaultDescription}
          placeholder="Optional — briefly describe what belongs in this domain"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="term-sort-order">Sort order</Label>
        <Input id="term-sort-order" name="sortOrder" defaultValue={defaultSortOrder} placeholder="e.g. 10, 20, 30 — lower sorts first" />
        <p className="text-xs text-muted-foreground">Optional numeric value to control display order.</p>
      </div>
    </>
  )
}
