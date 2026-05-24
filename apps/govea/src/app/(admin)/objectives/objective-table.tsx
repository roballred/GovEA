'use client'

import { useState, useTransition } from 'react'
import { createObjective, editObjective, deleteObjective, importObjectives, type ObjectiveImportResult } from '@/actions/objectives'
import type { StrategicObjective, Capability, ValueStream, Goal } from '@/db/schema'
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
import { submitWithDuplicateAck } from '@/lib/duplicate-name-client'
import { useDirtyTracker, confirmDiscard } from '@/lib/use-dirty-dialog'
import { EmptyStateCTA } from '@/components/empty-state-cta'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyFilters, TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import type { EntityTaxonomyValue } from '@/db/schema'

type ObjectiveRow = StrategicObjective & {
  organization: { id: string; name: string } | null
  objectiveCapabilities: { capability: Capability }[]
  objectiveValueStreams: { valueStream: ValueStream }[]
  goalObjectives: { goal: Goal }[]
}

interface Props {
  objectives: ObjectiveRow[]
  capabilities: Capability[]
  valueStreams: ValueStream[]
  role: Role
  currentOrgId: string
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function ObjectiveTable({ objectives, capabilities, valueStreams, role, currentOrgId, taxonomyDefinitions, taxonomyValueMap }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})

  const orgOptions = Array.from(new Map(
    objectives.map(o => [o.organizationId, o.organization?.name ?? 'Unknown'])
  ).entries())
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ObjectiveRow | null>(null)
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<ObjectiveRow | null>(null)

  // CSV import dialog state (#629)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ObjectiveImportResult | null>(null)
  const [importResult, setImportResult] = useState<ObjectiveImportResult | null>(null)

  async function handleImportPreview() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      setImportPreview(await importObjectives(fd, true))
    })
  }

  async function handleImportConfirm() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      setImportResult(await importObjectives(fd, false))
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

  const hasTaxonomyFilter = Object.values(taxonomyFilters).some(v => v !== 'all')

  const filtered = objectives.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? o.organizationId === currentOrgId : o.organizationId === orgFilter)
    const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) =>
      termId === 'all' || (taxonomyValueMap[o.id] ?? []).some(v => v.taxonomyTermId === termId)
    )
    return matchStatus && matchOrg && matchTaxonomy
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createObjective, formData)
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
      await editObjective(editTarget.id, formData)
      editDirty.reset()
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteObjective(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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
        {orgOptions.length > 1 && (
          <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">All organizations</option>
            <option value="own">My organization</option>
            {orgOptions.filter(([id]) => id !== currentOrgId).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
        <TaxonomyFilters
          defs={taxonomyDefinitions}
          filters={taxonomyFilters}
          onFilterChange={(defId, value) => setTaxonomyFilters(prev => ({ ...prev, [defId]: value }))}
        />
        <div className="ml-auto flex items-center gap-2">
          <a href="/api/objectives/export">
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                + New objective
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state — when the org has no objectives at all (#587 follow-up). */}
      {objectives.length === 0 ? (
        <EmptyStateCTA
          entityLabel="objective"
          description="Strategic objectives are the measurable outcomes the organization is working toward. Capabilities and initiatives trace back to them."
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
              <TableHead>Goal</TableHead>
              <TableHead>Time Horizon</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                  {objectives.length === 0
                    ? 'No objectives yet. Add one to get started.'
                    : 'No objectives match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/objectives/${o.id}`} className="hover:underline">{o.name}</Link>
                    {o.organizationId !== currentOrgId && o.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {o.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {o.goalObjectives.length > 0
                    ? o.goalObjectives.map(({ goal }) => (
                        <Link key={goal.id} href={`/goals/${goal.id}`} className="hover:underline block">
                          {goal.name}
                        </Link>
                      ))
                    : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {o.timeHorizon ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {o.objectiveCapabilities.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : o.objectiveCapabilities.map(({ capability }) => (
                          <span key={capability.id}
                            className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                            {capability.name}
                          </span>
                        ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[o.status])}>
                    {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                  </span>
                </TableCell>
                {canEdit && o.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/objectives/${o.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(o)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(o)} disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEdit && o.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/objectives/${o.id}`}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Objective</DialogTitle></DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required placeholder="e.g. Reduce permit processing time by 40%" />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <FormField label="Success metric" name="successMetric" placeholder="How will achievement be measured?" />
            <FormField label="Time horizon" name="timeHorizon" placeholder="e.g. FY2026, 18 months" />
            {valueStreams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Value streams</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {valueStreams.map(vs => (
                    <label key={vs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="valueStreamIds" value={vs.id} className="rounded" />
                      {vs.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {capabilities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Capabilities</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="capabilityIds" value={c.id} className="rounded" />
                      <span>{c.name}</span>
                      {c.domain && <span className="text-xs text-muted-foreground">· {c.domain}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue="draft"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue="org"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="org">Org only</option>
                <option value="connections">Connected orgs</option>
                <option value="instance">Instance-wide</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(createDirty)) { createDirty.reset(); setCreateOpen(false) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open && !confirmDiscard(editDirty)) return; if (!open) { editDirty.reset(); setEditTarget(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Objective</DialogTitle></DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <FormField label="Success metric" name="successMetric" defaultValue={editTarget?.successMetric ?? ''} />
            <FormField label="Time horizon" name="timeHorizon" defaultValue={editTarget?.timeHorizon ?? ''} />
            {valueStreams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Value streams</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {valueStreams.map(vs => (
                    <label key={vs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="valueStreamIds" value={vs.id} className="rounded"
                        defaultChecked={editTarget?.objectiveValueStreams.some(ovs => ovs.valueStream.id === vs.id)} />
                      {vs.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {capabilities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Capabilities</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="capabilityIds" value={c.id} className="rounded"
                        defaultChecked={editTarget?.objectiveCapabilities.some(oc => oc.capability.id === c.id)} />
                      <span>{c.name}</span>
                      {c.domain && <span className="text-xs text-muted-foreground">· {c.domain}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue={editTarget?.status}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue={editTarget?.visibility ?? 'org'}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
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
          <DialogHeader><DialogTitle>Delete Objective</DialogTitle></DialogHeader>
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

      {/* CSV Import dialog (#629) */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) setImportOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Strategic Objectives</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload a CSV with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">success_metric</code>, <code className="bg-muted px-1 rounded">time_horizon</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">capabilities</code> (semicolon-separated names), <code className="bg-muted px-1 rounded">value_streams</code> (semicolon-separated names).
              Existing objectives are matched by name (case-insensitive) and updated. Unknown linked names are reported as warnings without failing the row.
            </p>
            {!importResult && (
              <div className="space-y-1.5">
                <Label>CSV file</Label>
                <Input type="file" accept=".csv,text/csv" onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null) }} />
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
