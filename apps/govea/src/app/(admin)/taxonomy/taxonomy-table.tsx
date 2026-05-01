'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TaxonomyTerm, EntityTaxonomyDefinition } from '@/db/schema'
import {
  createTaxonomyTerm, editTaxonomyTerm, deleteTaxonomyTerm,
  addEntityTaxonomyDefinition, removeEntityTaxonomyDefinition,
} from '@/actions/taxonomy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { Role } from '@/lib/rbac'

type EnrichedDefinition = EntityTaxonomyDefinition & { typeName: string; typeSlug: string }

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'application', label: 'Application' },
  { value: 'capability', label: 'Capability' },
  { value: 'persona', label: 'Persona' },
  { value: 'service', label: 'Service' },
  { value: 'value-stream', label: 'Value Stream' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'adr', label: 'ADR' },
  { value: 'principle', label: 'Principle' },
  { value: 'glossary-term', label: 'Glossary Term' },
]

interface Props {
  types: TaxonomyTerm[]
  values: TaxonomyTerm[]
  role: Role
  /** termId → number of principles that reference that term's slug as their principleType */
  principleTypeUsage: Record<string, number>
  definitions: EnrichedDefinition[]
}

type EditTarget = { term: TaxonomyTerm; kind: 'type' | 'value' }
type DeleteTarget = { term: TaxonomyTerm; valueCount: number; principleCount: number }

export function TaxonomyTable({ types, values, role, principleTypeUsage, definitions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [createValueTarget, setCreateValueTarget] = useState<TaxonomyTerm | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [wireTarget, setWireTarget] = useState<TaxonomyTerm | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  // Group definitions by taxonomyTypeId
  const defsByType = definitions.reduce<Record<string, EnrichedDefinition[]>>((acc, d) => {
    acc[d.taxonomyTypeId] = acc[d.taxonomyTypeId] ?? []
    acc[d.taxonomyTypeId].push(d)
    return acc
  }, {})

  // Group values by parentId
  const valuesByType = values.reduce<Record<string, TaxonomyTerm[]>>((acc, v) => {
    if (!v.parentId) return acc
    acc[v.parentId] = acc[v.parentId] ?? []
    acc[v.parentId].push(v)
    return acc
  }, {})

  async function handleCreateType(fd: FormData) {
    startTransition(async () => {
      await createTaxonomyTerm(fd)
      setCreateTypeOpen(false)
      refresh()
    })
  }

  async function handleCreateValue(fd: FormData) {
    startTransition(async () => {
      await createTaxonomyTerm(fd)
      setCreateValueTarget(null)
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

  async function handleWire(fd: FormData) {
    if (!wireTarget) return
    startTransition(async () => {
      fd.set('taxonomyTypeId', wireTarget.id)
      await addEntityTaxonomyDefinition(fd)
      setWireTarget(null)
      refresh()
    })
  }

  async function handleUnwire(definitionId: string) {
    startTransition(async () => {
      await removeEntityTaxonomyDefinition(definitionId)
      refresh()
    })
  }

  const totalValues = values.length

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {types.length === 0
            ? 'No taxonomy types yet — create a type (e.g. "Domain") then add values to it.'
            : `${types.length} type${types.length !== 1 ? 's' : ''}${totalValues > 0 ? `, ${totalValues} value${totalValues !== 1 ? 's' : ''}` : ''}`}
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateTypeOpen(true)}>
            + New Type
          </Button>
        )}
      </div>

      {/* Empty state */}
      {types.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-2">
          <p className="text-sm font-medium">No taxonomy types defined</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create a <strong>Type</strong> (e.g. &ldquo;Domain&rdquo;) then add <strong>Values</strong> within it
            (e.g. &ldquo;Information Technology&rdquo;, &ldquo;Public Safety&rdquo;).
            Values appear as options when classifying capabilities and glossary terms.
          </p>
        </div>
      )}

      {/* Type list */}
      <div className="space-y-4">
        {types.map(type => {
          const typeValues = valuesByType[type.id] ?? []
          return (
            <div key={type.id} className="rounded-lg border bg-card overflow-hidden">

              {/* Type header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 border-violet-200 uppercase tracking-wide">
                    Type
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{type.name}</p>
                    {type.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typeValues.length} value{typeValues.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCreateValueTarget(type)}
                    >
                      + Add Value
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditTarget({ term: type, kind: 'type' })}
                    >
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          // For the "Principle Type" parent, sum usage across all its children
                          const principleCount = type.slug === 'principle-type'
                            ? typeValues.reduce((sum, v) => sum + (principleTypeUsage[v.id] ?? 0), 0)
                            : 0
                          setDeleteTarget({ term: type, valueCount: typeValues.length, principleCount })
                        }}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Used on */}
              {(() => {
                const typeDefs = defsByType[type.id] ?? []
                const usedEntityTypes = typeDefs.map(d => d.entityType)
                const availableToAdd = ENTITY_TYPES.filter(e => !usedEntityTypes.includes(e.value))
                if (!canDelete && typeDefs.length === 0) return null
                return (
                  <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/20">
                    <span className="text-xs text-muted-foreground shrink-0">Used on:</span>
                    {typeDefs.length === 0 && (
                      <span className="text-xs text-muted-foreground/50 italic">not wired to any entity type</span>
                    )}
                    {typeDefs.map(def => {
                      const label = ENTITY_TYPES.find(e => e.value === def.entityType)?.label ?? def.entityType
                      return (
                        <span
                          key={def.id}
                          className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 text-xs font-medium"
                        >
                          {label}
                          {def.selectionMode === 'multi' && <span className="opacity-60">(multi)</span>}
                          {def.required && <span className="opacity-60">*</span>}
                          {canDelete && (
                            <button
                              type="button"
                              className="ml-0.5 hover:text-violet-900 transition-colors"
                              onClick={() => handleUnwire(def.id)}
                              disabled={isPending}
                              title={`Remove ${label} wiring`}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      )
                    })}
                    {canDelete && availableToAdd.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        onClick={() => setWireTarget(type)}
                      >
                        + Wire to entity type
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Values */}
              {typeValues.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground/60 italic">
                  No values yet —{' '}
                  {canEdit
                    ? <button type="button" className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => setCreateValueTarget(type)}>add the first one</button>
                    : 'values will appear here once added'}
                </div>
              ) : (
                typeValues.map((val, i) => (
                  <div
                    key={val.id}
                    className={`flex items-center justify-between px-4 py-2.5 ${i < typeValues.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-muted-foreground/30 text-xs select-none">•</span>
                      <div>
                        <p className="text-sm">{val.name}</p>
                        {val.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{val.description}</p>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditTarget({ term: val, kind: 'value' })}
                        >
                          Edit
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget({ term: val, valueCount: 0, principleCount: principleTypeUsage[val.id] ?? 0 })}
                            disabled={isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Create Type Dialog */}
      <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Taxonomy Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            A type groups related values — e.g. &ldquo;Domain&rdquo; holds values like &ldquo;Information Technology&rdquo;.
          </p>
          <form action={handleCreateType} className="space-y-3">
            <TermFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTypeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Type'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Value Dialog */}
      <Dialog open={!!createValueTarget} onOpenChange={open => { if (!open) setCreateValueTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Value in &ldquo;{createValueTarget?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <form action={handleCreateValue} className="space-y-3">
            <input type="hidden" name="parentId" value={createValueTarget?.id ?? ''} />
            <TermFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateValueTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Value'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.kind === 'type' ? 'Type' : 'Value'}</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <TermFields
              defaultName={editTarget?.term.name}
              defaultDescription={editTarget?.term.description ?? ''}
              defaultSortOrder={editTarget?.term.sortOrder ?? ''}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Wire to Entity Type Dialog */}
      <Dialog open={!!wireTarget} onOpenChange={open => { if (!open) setWireTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wire &ldquo;{wireTarget?.name}&rdquo; to entity type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            This makes &ldquo;{wireTarget?.name}&rdquo; available as a classification field on the selected entity type.
          </p>
          <form action={handleWire} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wire-entity-type">Entity type <span className="text-destructive">*</span></Label>
              <select
                id="wire-entity-type"
                name="entityType"
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select entity type…</option>
                {ENTITY_TYPES
                  .filter(e => !(defsByType[wireTarget?.id ?? ''] ?? []).some(d => d.entityType === e.value))
                  .map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wire-selection-mode">Selection mode</Label>
              <select
                id="wire-selection-mode"
                name="selectionMode"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="single">Single select</option>
                <option value="multi">Multi select</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="wire-required" name="required" value="true" className="rounded" />
              <Label htmlFor="wire-required">Required</Label>
            </div>
            <input type="hidden" name="sortOrder" value="0" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWireTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Wiring…' : 'Wire'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.term.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Are you sure? This cannot be undone.</p>
            {(deleteTarget?.valueCount ?? 0) > 0 && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                This type has <strong>{deleteTarget?.valueCount} value{deleteTarget?.valueCount !== 1 ? 's' : ''}</strong> which will also be deleted.
              </p>
            )}
            {(deleteTarget?.principleCount ?? 0) > 0 && (
              <p className="text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                <strong>{deleteTarget?.principleCount} principle{deleteTarget?.principleCount !== 1 ? 's' : ''}</strong>{' '}
                use this type. Reassign them to a different type before deleting.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || (deleteTarget?.principleCount ?? 0) > 0}
            >
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
        <Input
          id="term-name"
          name="name"
          required
          defaultValue={defaultName}
          placeholder="e.g. Domain, Technology Stack…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="term-description">Description</Label>
        <textarea
          id="term-description"
          name="description"
          rows={2}
          defaultValue={defaultDescription}
          placeholder="Optional — briefly describe what belongs here"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="term-sort-order">Sort order</Label>
        <Input
          id="term-sort-order"
          name="sortOrder"
          defaultValue={defaultSortOrder}
          placeholder="e.g. 10, 20, 30 — lower values sort first"
        />
      </div>
    </>
  )
}
