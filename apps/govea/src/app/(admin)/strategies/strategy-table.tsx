'use client'

import { useState, useTransition } from 'react'
import { createStrategy, editStrategy, deleteStrategy, adoptStrategy } from '@/actions/strategies'
import type { Strategy } from '@/db/schema'
import type { OrgUserPickerRow } from '@/actions/org-users'
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

type StrategyRow = Strategy & {
  organization: { id: string; name: string } | null
  owner: { id: string; name: string | null } | null
  goals: { id: string; name: string }[]
}

interface Props {
  strategies: StrategyRow[]
  orgUsers: OrgUserPickerRow[]
  role: Role
  currentOrgId: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  adopted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  superseded: 'bg-amber-100 text-amber-800 border-amber-200',
  retired: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function StrategyTable({ strategies, orgUsers, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StrategyRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StrategyRow | null>(null)
  const [adoptTarget, setAdoptTarget] = useState<StrategyRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'
  const refresh = () => router.refresh()

  const filtered = strategies.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  )

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createStrategy(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editStrategy(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteStrategy(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  async function handleAdopt() {
    if (!adoptTarget) return
    startTransition(async () => {
      await adoptStrategy(adoptTarget.id)
      setAdoptTarget(null)
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
          <option value="adopted">Adopted</option>
          <option value="superseded">Superseded</option>
          <option value="retired">Retired</option>
        </select>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto">
            + New strategy
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
              <TableHead>Goals</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {strategies.length === 0
                    ? 'No strategies yet. Add one to frame a planning period.'
                    : 'No strategies match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/strategies/${s.id}`} className="hover:underline">{s.name}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {s.planningHorizon ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {s.owner?.name ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {s.goals.length > 0 ? s.goals.length : '—'}
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[s.status])}>
                    {titleCase(s.status)}
                  </span>
                </TableCell>
                {canEdit && s.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/strategies/${s.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(s)} className="h-7 px-2 text-xs">Edit</Button>
                      {s.status !== 'adopted' && (
                        <Button variant="ghost" size="sm" onClick={() => setAdoptTarget(s)} disabled={isPending}
                          className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-700 hover:bg-emerald-50">
                          Adopt
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} disabled={isPending}
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
          <DialogHeader><DialogTitle>New Strategy</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <StrategyFields orgUsers={orgUsers} />
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
          <DialogHeader><DialogTitle>Edit Strategy</DialogTitle></DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <StrategyFields orgUsers={orgUsers} strategy={editTarget} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adopt Dialog */}
      <Dialog open={!!adoptTarget} onOpenChange={open => { if (!open) setAdoptTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adopt Strategy</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Make <strong>{adoptTarget?.name}</strong> your organization&apos;s current strategy?
            {strategies.some(s => s.status === 'adopted') && (
              <> The currently adopted strategy will be superseded.</>
            )}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdoptTarget(null)}>Cancel</Button>
            <Button onClick={handleAdopt} disabled={isPending}>
              {isPending ? 'Adopting…' : 'Adopt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Strategy</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>{deleteTarget?.name}</strong>? Member goals are kept but un-linked from this strategy. This cannot be undone.
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

/**
 * Shared create/edit form fields. Status select deliberately omits `adopted` —
 * adoption is the Adopt action (it supersedes the prior adopted strategy in one
 * tx); editing never adopts.
 */
function StrategyFields({ orgUsers, strategy }: { orgUsers: OrgUserPickerRow[]; strategy?: StrategyRow | null }) {
  return (
    <>
      <FormField label="Name" name="name" required defaultValue={strategy?.name} placeholder="e.g. FY26–FY28 Digital Strategy" />
      <MarkdownEditor label="Summary" name="summary" rows={3} defaultValue={strategy?.summary ?? ''} placeholder="Markdown supported" />
      <FormField label="Planning horizon" name="planningHorizon" defaultValue={strategy?.planningHorizon ?? ''} placeholder="e.g. FY26–FY28" />
      <div className="space-y-1.5">
        <Label>Owner</Label>
        <select name="ownerUserId" defaultValue={strategy?.ownerUserId ?? ''}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">— Unassigned —</option>
          {orgUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start date" name="startDate" type="date" defaultValue={strategy?.startDate ?? ''} />
        <FormField label="End date" name="endDate" type="date" defaultValue={strategy?.endDate ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select name="status" defaultValue={strategy?.status === 'adopted' ? 'draft' : (strategy?.status ?? 'draft')}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="draft">Draft</option>
          <option value="superseded">Superseded</option>
          <option value="retired">Retired</option>
        </select>
        <p className="text-xs text-muted-foreground">Use the Adopt action to make a strategy the current one.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Visibility</Label>
        <select name="visibility" defaultValue={strategy?.visibility ?? 'org'}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="org">Org only</option>
          <option value="connections">Connected orgs</option>
          <option value="instance">Instance-wide</option>
        </select>
      </div>
    </>
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
