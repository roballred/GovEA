'use client'

import { useState, useTransition } from 'react'
import { createGoal, editGoal, deleteGoal } from '@/actions/goals'
import type { Goal, StrategicObjective } from '@/db/schema'
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
import { MarkdownEditor } from '@/components/markdown-editor'

type GoalRow = Goal & {
  organization: { id: string; name: string } | null
  goalObjectives: { objective: StrategicObjective }[]
}

interface Props {
  goals: GoalRow[]
  objectives: StrategicObjective[]
  role: Role
  currentOrgId: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function GoalTable({ goals, objectives, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GoalRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GoalRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const filtered = goals.filter(g =>
    statusFilter === 'all' || g.status === statusFilter
  )

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createGoal(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editGoal(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteGoal(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
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
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New goal
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Planning Horizon</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Objectives</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {goals.length === 0
                    ? 'No goals yet. Add one to get started.'
                    : 'No goals match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/goals/${g.id}`} className="hover:underline">{g.name}</Link>
                    {g.organizationId !== currentOrgId && g.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {g.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.planningHorizon ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.owner ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.goalObjectives.length > 0
                    ? g.goalObjectives.map(({ objective }) => objective.name).join(', ')
                    : '—'}
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[g.status])}>
                    {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                  </span>
                </TableCell>
                {canEdit && g.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/goals/${g.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(g)} className="h-7 px-2 text-xs">Edit</Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(g)} disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <FormField label="Name" name="name" required placeholder="e.g. Modernise Resident-Facing Services" />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <FormField label="Planning horizon" name="planningHorizon" placeholder="e.g. 2026–2028, Long-term" />
            <FormField label="Owner" name="owner" placeholder="e.g. Office of the CIO" />
            {objectives.length > 0 && (
              <div className="space-y-1.5">
                <Label>Objectives</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {objectives.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="objectiveIds" value={o.id} className="rounded" />
                      <span>{o.name}</span>
                      {o.timeHorizon && <span className="text-xs text-muted-foreground">· {o.timeHorizon}</span>}
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
          <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <FormField label="Planning horizon" name="planningHorizon" defaultValue={editTarget?.planningHorizon ?? ''} />
            <FormField label="Owner" name="owner" defaultValue={editTarget?.owner ?? ''} />
            {objectives.length > 0 && (
              <div className="space-y-1.5">
                <Label>Objectives</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-input p-2">
                  {objectives.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="objectiveIds" value={o.id} className="rounded"
                        defaultChecked={editTarget?.goalObjectives.some(go => go.objective.id === o.id)} />
                      <span>{o.name}</span>
                      {o.timeHorizon && <span className="text-xs text-muted-foreground">· {o.timeHorizon}</span>}
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
          <DialogHeader><DialogTitle>Delete Goal</DialogTitle></DialogHeader>
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
