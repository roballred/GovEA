'use client'

import { useState, useTransition } from 'react'
import type { User } from '@/db/schema'
import { createUser, editUser, deactivateUser, reactivateUser, deleteUser } from '@/actions/users'
import { useRouter } from 'next/navigation'
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

type UserRow = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive'>

interface Props {
  users: UserRow[]
  currentUserId: string
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function UserTable({ users, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const refresh = () => router.refresh()

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? u.isActive === 'true' : u.isActive !== 'true')
    return matchSearch && matchRole && matchStatus
  })

  const adminCount = users.filter(u => u.role === 'admin' && u.isActive === 'true').length

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createUser(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      await editUser(editTarget.id, formData)
      setEditTarget(null)
      refresh()
    })
  }

  async function handleDeactivate(user: UserRow) {
    startTransition(async () => {
      await deactivateUser(user.id)
      refresh()
    })
  }

  async function handleReactivate(user: UserRow) {
    startTransition(async () => {
      await reactivateUser(user.id)
      refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  const isLastAdmin = (user: UserRow) => user.role === 'admin' && adminCount <= 1

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={() => setCreateOpen(true)} className="ml-auto" size="sm">
          + Add user
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(u => {
              const inactive = u.isActive !== 'true'
              const isSelf = u.id === currentUserId
              const lastAdmin = isLastAdmin(u)
              return (
                <TableRow key={u.id} className={inactive ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', ROLE_STYLES[u.role])}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                      inactive
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}>
                      {inactive ? 'Inactive' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(u)} className="h-7 px-2 text-xs">
                        Edit
                      </Button>
                      {!isSelf && (
                        <>
                          {inactive ? (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleReactivate(u)}
                              disabled={isPending}
                              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleDeactivate(u)}
                              disabled={isPending || lastAdmin}
                              title={lastAdmin ? 'Cannot deactivate the last admin' : undefined}
                              className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            >
                              Deactivate
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteTarget(u)}
                            disabled={isPending || lastAdmin}
                            title={lastAdmin ? 'Cannot delete the last admin' : undefined}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <FormField label="Name" name="name" type="text" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Password" name="password" type="password" required minLength={8} />
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Role</Label>
              <select id="create-role" name="role" defaultValue="viewer" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create user'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-3">
            <FormField label="Name" name="name" type="text" required defaultValue={editTarget?.name ?? ''} />
            <FormField label="Email" name="email" type="email" required defaultValue={editTarget?.email} />
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <select id="edit-role" name="role" defaultValue={editTarget?.role} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <FormField label="New password (leave blank to keep current)" name="password" type="password" minLength={8} />
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
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name ?? deleteTarget?.email}</strong>? This cannot be undone.
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
  const id = props.id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  )
}
