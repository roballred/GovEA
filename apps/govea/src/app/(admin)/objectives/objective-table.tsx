'use client'

import { useState, useTransition } from 'react'
import { createObjective, editObjective, deleteObjective } from '@/actions/objectives'
import type { StrategicObjective, Capability, ValueStream } from '@/db/schema'
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

type ObjectiveRow = StrategicObjective & {
  organization: { id: string; name: string } | null
  objectiveCapabilities: { capability: Capability }[]
  objectiveValueStreams: { valueStream: ValueStream }[]
}

interface Props {
  objectives: ObjectiveRow[]
  capabilities: Capability[]
  valueStreams: ValueStream[]
  role: Role
  currentOrgId: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function ObjectiveTable({ objectives, capabilities, valueStreams, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  const orgOptions = Array.from(new Map(
    objectives.map(o => [o.organizationId, o.organization?.name ?? 'Unknown'])
  ).entries())
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ObjectiveRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ObjectiveRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const filtered = objectives.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? o.organizationId === currentOrgId : o.organizationId === orgFilter)
    return matchStatus && matchOrg
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createObjective(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editObjective(editTarget.id, formData)
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
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New objective
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Time Horizon</TableHead>
              <TableHead>Value Streams</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
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
                  {o.timeHorizon ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {o.objectiveValueStreams.length > 0
                    ? o.objectiveValueStreams.map(({ valueStream }) => valueStream.name).join(', ')
                    : '—'}
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New strategic objective</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <FormField label="Name" name="name" required placeholder="e.g. Reduce permit processing time by 40%" />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea name="description" rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
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
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit objective</DialogTitle></DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea name="description" rows={2} defaultValue={editTarget?.description ?? ''}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
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
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete objective</DialogTitle></DialogHeader>
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

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}
