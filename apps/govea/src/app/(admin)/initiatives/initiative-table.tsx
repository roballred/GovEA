'use client'

import { useState, useTransition } from 'react'
import { createInitiative, editInitiative, deleteInitiative, importInitiatives, type InitiativeImportResult } from '@/actions/initiatives'
import type { Initiative, Capability, StrategicObjective } from '@/db/schema'
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

type InitiativeRow = Initiative & {
  organization: { id: string; name: string } | null
  initiativeCapabilities: { capability: Capability; impact: string | null }[]
  initiativeObjectives: { objective: StrategicObjective }[]
}

interface Props {
  initiatives: InitiativeRow[]
  capabilities: Capability[]
  objectives: StrategicObjective[]
  role: Role
  currentOrgId: string
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
}

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'on-hold': 'bg-amber-100 text-amber-800 border-amber-200',
  complete: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  active: 'Active',
  'on-hold': 'On Hold',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const IMPACT_OPTIONS = ['build', 'improve', 'retire']

export function InitiativeTable({ initiatives, capabilities, objectives, role, currentOrgId, taxonomyDefinitions, taxonomyValueMap }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})

  const orgOptions = Array.from(new Map(
    initiatives.map(i => [i.organizationId, i.organization?.name ?? 'Unknown'])
  ).entries())
  const [createOpen, setCreateOpen] = useState(false)

  // CSV import dialog state (#629)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<InitiativeImportResult | null>(null)
  const [importResult, setImportResult] = useState<InitiativeImportResult | null>(null)

  async function handleImportPreview() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      setImportPreview(await importInitiatives(fd, true))
    })
  }

  async function handleImportConfirm() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      setImportResult(await importInitiatives(fd, false))
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
  const [editTarget, setEditTarget] = useState<InitiativeRow | null>(null)
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<InitiativeRow | null>(null)
  // Track selected capability IDs for the create/edit form impact fields
  const [selectedCaps, setSelectedCaps] = useState<string[]>([])

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const hasTaxonomyFilter = Object.values(taxonomyFilters).some(v => v !== 'all')

  const filtered = initiatives.filter(i => {
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? i.organizationId === currentOrgId : i.organizationId === orgFilter)
    const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) =>
      termId === 'all' || (taxonomyValueMap[i.id] ?? []).some(v => v.taxonomyTermId === termId)
    )
    return matchStatus && matchOrg && matchTaxonomy
  })

  function openCreate() {
    setSelectedCaps([])
    setCreateOpen(true)
  }

  function openEdit(initiative: InitiativeRow) {
    setSelectedCaps(initiative.initiativeCapabilities.map(ic => ic.capability.id))
    setEditTarget(initiative)
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createInitiative, formData)
        createDirty.reset()
        setCreateOpen(false)
        setSelectedCaps([])
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
      await editInitiative(editTarget.id, formData)
      editDirty.reset()
      setEditTarget(null)
      setSelectedCaps([])
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteInitiative(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {!canEdit && null /* viewers see pre-filtered results — no status filter needed */}
        {canEdit && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="proposed">Proposed</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
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
          <a href="/api/initiatives/export">
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>
              <Button onClick={openCreate} size="sm">
                + New Initiative
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state — when the org has no initiatives at all (#587 follow-up). */}
      {initiatives.length === 0 ? (
        <EmptyStateCTA
          entityLabel="initiative"
          description="Initiatives are the projects and programs you're running to change capabilities, applications, or services."
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
              <TableHead>Dates</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Objectives</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {initiatives.length === 0
                    ? 'No initiatives yet. Add one to get started.'
                    : 'No initiatives match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(initiative => (
              <TableRow key={initiative.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/initiatives/${initiative.id}`} className="hover:underline">
                      {initiative.name}
                    </Link>
                    {initiative.organizationId !== currentOrgId && initiative.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {initiative.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {initiative.startDate || initiative.endDate
                    ? [initiative.startDate, initiative.endDate].filter(Boolean).join(' → ')
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {initiative.initiativeCapabilities.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : initiative.initiativeCapabilities.map(({ capability, impact }) => (
                          <span key={capability.id}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                            {capability.name}
                            {impact && <span className="text-blue-400">· {impact}</span>}
                          </span>
                        ))
                    }
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {initiative.initiativeObjectives.length > 0
                    ? initiative.initiativeObjectives.map(io => io.objective.name).join(', ')
                    : '—'}
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[initiative.status])}>
                    {STATUS_LABELS[initiative.status]}
                  </span>
                </TableCell>
                {canEdit && initiative.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/initiatives/${initiative.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(initiative)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(initiative)} disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEdit && initiative.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/initiatives/${initiative.id}`}>
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
      <Dialog open={createOpen} onOpenChange={open => { if (!open && !confirmDiscard(createDirty)) return; if (!open) { createDirty.reset(); setCreateOpen(false); setSelectedCaps([]) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Initiative</DialogTitle></DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required placeholder="e.g. Replace OpenText Livelink" />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start date" name="startDate" placeholder="e.g. Q1 FY2026" />
              <FormField label="End date" name="endDate" placeholder="e.g. Q4 FY2026" />
            </div>
            <CapabilitySelector
              capabilities={capabilities}
              selected={selectedCaps}
              existingImpacts={{}}
              onChange={setSelectedCaps}
            />
            {objectives.length > 0 && (
              <div className="space-y-1.5">
                <Label>Strategic objectives</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {objectives.map(obj => (
                    <label key={obj.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="objectiveIds" value={obj.id} className="rounded" />
                      {obj.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <StatusAndVisibilityFields defaultStatus="proposed" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(createDirty)) { createDirty.reset(); setCreateOpen(false); setSelectedCaps([]) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open && !confirmDiscard(editDirty)) return; if (!open) { editDirty.reset(); setEditTarget(null); setSelectedCaps([]) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Initiative</DialogTitle></DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start date" name="startDate" defaultValue={editTarget?.startDate ?? ''} />
              <FormField label="End date" name="endDate" defaultValue={editTarget?.endDate ?? ''} />
            </div>
            <CapabilitySelector
              capabilities={capabilities}
              selected={selectedCaps}
              existingImpacts={Object.fromEntries(
                (editTarget?.initiativeCapabilities ?? []).map(ic => [ic.capability.id, ic.impact ?? ''])
              )}
              onChange={setSelectedCaps}
            />
            {objectives.length > 0 && (
              <div className="space-y-1.5">
                <Label>Strategic objectives</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {objectives.map(obj => (
                    <label key={obj.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="objectiveIds" value={obj.id} className="rounded"
                        defaultChecked={editTarget?.initiativeObjectives.some(io => io.objective.id === obj.id)} />
                      {obj.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <StatusAndVisibilityFields defaultStatus={editTarget?.status ?? 'proposed'} defaultVisibility={editTarget?.visibility ?? 'org'} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(editDirty)) { editDirty.reset(); setEditTarget(null); setSelectedCaps([]) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Initiative</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Import Initiatives</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload a CSV with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">start_date</code>, <code className="bg-muted px-1 rounded">end_date</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">capabilities</code> (semicolon-separated names), <code className="bg-muted px-1 rounded">objectives</code> (semicolon-separated names).
              Existing initiatives are matched by name (case-insensitive) and updated. Unknown capability or objective names are reported as warnings without failing the row.
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

// ── Sub-components ────────────────────────────────────────────────────────────

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}

function CapabilitySelector({
  capabilities,
  selected,
  existingImpacts,
  onChange,
}: {
  capabilities: Capability[]
  selected: string[]
  existingImpacts: Record<string, string>
  onChange: (ids: string[]) => void
}) {
  if (capabilities.length === 0) return null

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div className="space-y-1.5">
      <Label>Capabilities</Label>
      <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-md border border-input p-2">
        {capabilities.map(c => (
          <div key={c.id} className="space-y-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="capabilityIds"
                value={c.id}
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="rounded"
              />
              <span>{c.name}</span>
              {c.domain && <span className="text-xs text-muted-foreground">· {c.domain}</span>}
            </label>
            {selected.includes(c.id) && (
              <div className="ml-6">
                <select
                  name={`impact_${c.id}`}
                  defaultValue={existingImpacts[c.id] ?? ''}
                  className="h-7 rounded border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">No impact label</option>
                  {IMPACT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusAndVisibilityFields({
  defaultStatus,
  defaultVisibility = 'org',
}: {
  defaultStatus: string
  defaultVisibility?: string
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select name="status" defaultValue={defaultStatus}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="proposed">Proposed</option>
          <option value="active">Active</option>
          <option value="on-hold">On Hold</option>
          <option value="complete">Complete</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Visibility</Label>
        <select name="visibility" defaultValue={defaultVisibility}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="org">Org only</option>
          <option value="connections">Connected orgs</option>
          <option value="instance">Instance-wide</option>
        </select>
      </div>
    </>
  )
}
