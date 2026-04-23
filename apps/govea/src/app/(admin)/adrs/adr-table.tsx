'use client'

import { useState, useTransition } from 'react'
import { createADR, editADR, deleteADR } from '@/actions/adrs'
import type { ADR, Capability, Application, Initiative, StrategicObjective } from '@/db/schema'
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

type ADRRow = ADR & {
  organization: { id: string; name: string } | null
  supersededByAdr: ADR | null
  adrCapabilities: { capability: Capability }[]
  adrApplications: { application: Application }[]
  adrInitiatives: { initiative: Initiative }[]
  adrObjectives: { objective: StrategicObjective }[]
}

interface Props {
  adrs: ADRRow[]
  capabilities: Pick<Capability, 'id' | 'name' | 'domain'>[]
  applications: Pick<Application, 'id' | 'name'>[]
  initiatives: Pick<Initiative, 'id' | 'name'>[]
  objectives: Pick<StrategicObjective, 'id' | 'name'>[]
  role: Role
  currentOrgId: string
}

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deprecated: 'bg-amber-100 text-amber-800 border-amber-200',
  superseded: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  deprecated: 'Deprecated',
  superseded: 'Superseded',
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

export function ADRTable({ adrs, capabilities, applications, initiatives, objectives, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ADRRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ADRRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const filtered = adrs.filter(a => statusFilter === 'all' || a.status === statusFilter)

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createADR(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editADR(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteADR(deleteTarget.id)
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
            <option value="accepted">Accepted</option>
            <option value="deprecated">Deprecated</option>
            <option value="superseded">Superseded</option>
          </select>
        )}
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New Architecture Decision Record
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {adrs.length === 0
                    ? 'No ADRs yet. Add one to get started.'
                    : 'No ADRs match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(adr => (
              <TableRow key={adr.id}>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  {adr.number}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/adrs/${adr.id}`} className="hover:underline">
                      {adr.title}
                    </Link>
                    {adr.organizationId !== currentOrgId && adr.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {adr.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {adr.adrCapabilities.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : adr.adrCapabilities.map(({ capability }) => (
                        <span key={capability.id} className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                          {capability.name}
                        </span>
                      ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[adr.status])}>
                    {STATUS_LABELS[adr.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[adr.visibility])}>
                    {VISIBILITY_LABELS[adr.visibility]}
                  </span>
                </TableCell>
                {canEdit && adr.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/adrs/${adr.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(adr)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(adr)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEdit && adr.organizationId !== currentOrgId && (
                  <TableCell>
                    <Link href={`/adrs/${adr.id}`}>
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
            <DialogTitle>New Architecture Decision Record</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Number" name="number" required placeholder="ADR-001" />
              <div className="col-span-2">
                <FormField label="Title" name="title" required placeholder="e.g. Use Next.js App Router for all routing" />
              </div>
            </div>
            <TextareaField label="Context" name="context" placeholder="What is the situation and why does this decision need to be made? — Markdown supported" />
            <TextareaField label="Decision" name="decision" placeholder="What was decided? — Markdown supported" />
            <TextareaField label="Consequences" name="consequences" placeholder="What are the resulting outcomes, tradeoffs, and risks? — Markdown supported" />
            <LinkedItemsFields
              capabilities={capabilities}
              applications={applications}
              initiatives={initiatives}
              objectives={objectives}
              selectedCapabilityIds={[]}
              selectedApplicationIds={[]}
              selectedInitiativeIds={[]}
              selectedObjectiveIds={[]}
            />
            <StatusVisibilitySupersededFields
              adrs={adrs}
              currentId={null}
              defaultStatus="proposed"
              defaultVisibility="org"
              defaultSupersededBy={null}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create ADR'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Architecture Decision Record</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Number" name="number" required defaultValue={editTarget?.number} />
              <div className="col-span-2">
                <FormField label="Title" name="title" required defaultValue={editTarget?.title} />
              </div>
            </div>
            <TextareaField label="Context" name="context" defaultValue={editTarget?.context ?? ''} placeholder="Markdown supported" />
            <TextareaField label="Decision" name="decision" defaultValue={editTarget?.decision ?? ''} placeholder="Markdown supported" />
            <TextareaField label="Consequences" name="consequences" defaultValue={editTarget?.consequences ?? ''} placeholder="Markdown supported" />
            <LinkedItemsFields
              capabilities={capabilities}
              applications={applications}
              initiatives={initiatives}
              objectives={objectives}
              selectedCapabilityIds={editTarget?.adrCapabilities.map(ac => ac.capability.id) ?? []}
              selectedApplicationIds={editTarget?.adrApplications.map(aa => aa.application.id) ?? []}
              selectedInitiativeIds={editTarget?.adrInitiatives.map(ai => ai.initiative.id) ?? []}
              selectedObjectiveIds={editTarget?.adrObjectives.map(ao => ao.objective.id) ?? []}
            />
            <StatusVisibilitySupersededFields
              adrs={adrs}
              currentId={editTarget?.id ?? null}
              defaultStatus={editTarget?.status ?? 'proposed'}
              defaultVisibility={editTarget?.visibility ?? 'org'}
              defaultSupersededBy={editTarget?.supersededBy ?? null}
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
          <DialogHeader><DialogTitle>Delete Architecture Decision Record</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>{deleteTarget?.number} — {deleteTarget?.title}</strong>? This cannot be undone.
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

function TextareaField({
  label, name, placeholder, defaultValue,
}: {
  label: string
  name: string
  placeholder?: string
  defaultValue?: string
}) {
  const id = `adr-${name}`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        name={name}
        rows={3}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
      />
    </div>
  )
}

function LinkedItemsFields({
  capabilities, applications, initiatives, objectives,
  selectedCapabilityIds, selectedApplicationIds, selectedInitiativeIds, selectedObjectiveIds,
}: {
  capabilities: Pick<Capability, 'id' | 'name' | 'domain'>[]
  applications: Pick<Application, 'id' | 'name'>[]
  initiatives: Pick<Initiative, 'id' | 'name'>[]
  objectives: Pick<StrategicObjective, 'id' | 'name'>[]
  selectedCapabilityIds: string[]
  selectedApplicationIds: string[]
  selectedInitiativeIds: string[]
  selectedObjectiveIds: string[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {capabilities.length > 0 && (
        <CheckboxList label="Capabilities" name="capabilityIds" items={capabilities} selectedIds={selectedCapabilityIds} />
      )}
      {applications.length > 0 && (
        <CheckboxList label="Applications" name="applicationIds" items={applications} selectedIds={selectedApplicationIds} />
      )}
      {initiatives.length > 0 && (
        <CheckboxList label="Initiatives" name="initiativeIds" items={initiatives} selectedIds={selectedInitiativeIds} />
      )}
      {objectives.length > 0 && (
        <CheckboxList label="Strategic objectives" name="objectiveIds" items={objectives} selectedIds={selectedObjectiveIds} />
      )}
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

function StatusVisibilitySupersededFields({
  adrs, currentId, defaultStatus, defaultVisibility, defaultSupersededBy,
}: {
  adrs: ADRRow[]
  currentId: string | null
  defaultStatus: string
  defaultVisibility: string
  defaultSupersededBy: string | null
}) {
  const otherAdrs = adrs.filter(a => a.id !== currentId)

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="adr-status">Status</Label>
          <select id="adr-status" name="status" defaultValue={defaultStatus}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="proposed">Proposed</option>
            <option value="accepted">Accepted</option>
            <option value="deprecated">Deprecated</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adr-visibility">Visibility</Label>
          <select id="adr-visibility" name="visibility" defaultValue={defaultVisibility}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="org">Org only</option>
            <option value="connections">Connected orgs</option>
            <option value="instance">Instance-wide</option>
          </select>
        </div>
      </div>
      {otherAdrs.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="adr-superseded-by">Superseded by (optional)</Label>
          <select id="adr-superseded-by" name="supersededBy" defaultValue={defaultSupersededBy ?? ''}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">— None —</option>
            {otherAdrs.map(a => (
              <option key={a.id} value={a.id}>{a.number} — {a.title}</option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
