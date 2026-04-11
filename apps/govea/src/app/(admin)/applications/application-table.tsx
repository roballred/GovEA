'use client'

import { useState, useTransition } from 'react'
import type { Application, Capability } from '@/db/schema'
import { createApplication, editApplication, deleteApplication } from '@/actions/applications'
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

type ApplicationRow = Pick<Application, 'id' | 'name' | 'description' | 'vendor' | 'version' | 'hostingModel' | 'lifecycleStatus' | 'status' | 'visibility' | 'createdAt' | 'organizationId'> & {
  organization: { id: string; name: string } | null
  applicationCapabilities: { capability: Pick<Capability, 'id' | 'name'> }[]
}

interface Props {
  applications: ApplicationRow[]
  capabilities: Pick<Capability, 'id' | 'name'>[]
  role: Role
  currentOrgId: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

const LIFECYCLE_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
  sunset: 'bg-amber-100 text-amber-800 border-amber-200',
  decommissioned: 'bg-red-100 text-red-700 border-red-200',
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

export function ApplicationTable({ applications, capabilities, role, currentOrgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  const orgOptions = Array.from(new Map(
    applications.map(a => [a.organizationId, a.organization?.name ?? 'Unknown'])
  ).entries())
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApplicationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApplicationRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const filtered = applications.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchLifecycle = lifecycleFilter === 'all' || a.lifecycleStatus === lifecycleFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? a.organizationId === currentOrgId : a.organizationId === orgFilter)
    return matchSearch && matchLifecycle && matchStatus && matchOrg
  })

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createApplication(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editApplication(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteApplication(deleteTarget.id)
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
          placeholder="Search applications…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <select
          value={lifecycleFilter}
          onChange={e => setLifecycleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All lifecycle statuses</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="sunset">Sunset</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
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
          <Button onClick={() => setCreateOpen(true)} className="ml-auto" size="sm">
            + New application
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Lifecycle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                  {applications.length === 0
                    ? 'No applications yet. Add one to get started.'
                    : 'No applications match the current filters.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/applications/${a.id}`} className="hover:underline">
                      {a.name}
                    </Link>
                    {a.organizationId !== currentOrgId && a.organization && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                        {a.organization.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.vendor ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {a.applicationCapabilities.length === 0
                      ? <span className="text-muted-foreground text-sm">—</span>
                      : a.applicationCapabilities.map(ac => (
                        <span key={ac.capability.id} className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-700 border-slate-200">
                          {ac.capability.name}
                        </span>
                      ))
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LIFECYCLE_STYLES[a.lifecycleStatus])}>
                    {a.lifecycleStatus.charAt(0).toUpperCase() + a.lifecycleStatus.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[a.status])}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[a.visibility])}>
                    {VISIBILITY_LABELS[a.visibility]}
                  </span>
                </TableCell>
                {canEdit && a.organizationId === currentOrgId && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(a)} className="h-7 px-2 text-xs">
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget(a)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
                {canEdit && a.organizationId !== currentOrgId && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New application</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <FormField label="Name" name="name" required />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea name="description" rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vendor" name="vendor" />
              <FormField label="Version" name="version" />
            </div>
            <div className="space-y-1.5">
              <Label>Hosting model</Label>
              <select name="hostingModel" defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                <option value="on-prem">On-premises</option>
                <option value="saas">SaaS</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
                {capabilities.length === 0
                  ? <p className="text-sm text-muted-foreground">No capabilities yet.</p>
                  : capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="capabilityIds" value={c.id} className="rounded" />
                      {c.name}
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle</Label>
                <select name="lifecycleStatus" defaultValue="active" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="sunset">Sunset</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue="draft" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
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
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create application'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit application</DialogTitle></DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea name="description" rows={2} defaultValue={editTarget?.description ?? ''} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vendor" name="vendor" defaultValue={editTarget?.vendor ?? ''} />
              <FormField label="Version" name="version" defaultValue={editTarget?.version ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label>Hosting model</Label>
              <select name="hostingModel" defaultValue={editTarget?.hostingModel ?? ''} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                <option value="on-prem">On-premises</option>
                <option value="saas">SaaS</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
                {capabilities.length === 0
                  ? <p className="text-sm text-muted-foreground">No capabilities yet.</p>
                  : capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name="capabilityIds"
                        value={c.id}
                        defaultChecked={editTarget?.applicationCapabilities.some(ac => ac.capability.id === c.id)}
                        className="rounded"
                      />
                      {c.name}
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle</Label>
                <select name="lifecycleStatus" defaultValue={editTarget?.lifecycleStatus} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="sunset">Sunset</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue={editTarget?.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
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
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete application</DialogTitle></DialogHeader>
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
