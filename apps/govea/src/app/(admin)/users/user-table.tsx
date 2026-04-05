'use client'

import { useState, useTransition } from 'react'
import type { User } from '@/db/schema'
import { createUser, editUser, deactivateUser, reactivateUser, deleteUser } from '@/actions/users'
import { useRouter } from 'next/navigation'

type UserRow = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive'>

interface Props {
  users: UserRow[]
  currentUserId: string
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  contributor: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-600',
}

export function UserTable({ users, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Search / filter
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal state
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
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm w-64 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => setCreateOpen(true)}
          className="ml-auto rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add user
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No users match the current filters.</td>
              </tr>
            )}
            {filtered.map(u => {
              const inactive = u.isActive !== 'true'
              const isSelf = u.id === currentUserId
              const lastAdmin = isLastAdmin(u)
              return (
                <tr key={u.id} className={inactive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 text-sm text-gray-900">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${inactive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {inactive ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditTarget(u)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      {!isSelf && (
                        <>
                          {inactive ? (
                            <button
                              onClick={() => handleReactivate(u)}
                              disabled={isPending}
                              className="text-xs text-green-600 hover:underline disabled:opacity-40"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeactivate(u)}
                              disabled={isPending || lastAdmin}
                              title={lastAdmin ? 'Cannot deactivate the last admin' : undefined}
                              className="text-xs text-yellow-600 hover:underline disabled:opacity-40"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={isPending || lastAdmin}
                            title={lastAdmin ? 'Cannot delete the last admin' : undefined}
                            className="text-xs text-red-600 hover:underline disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && (
        <Modal title="Add user" onClose={() => setCreateOpen(false)}>
          <form action={handleCreate} className="space-y-3">
            <Field label="Name" name="name" type="text" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required minLength={8} />
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select name="role" defaultValue="viewer" className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <ModalActions onCancel={() => setCreateOpen(false)} submitLabel="Create user" isPending={isPending} />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="Edit user" onClose={() => setEditTarget(null)}>
          <form action={handleEdit} className="space-y-3">
            <Field label="Name" name="name" type="text" required defaultValue={editTarget.name ?? ''} />
            <Field label="Email" name="email" type="email" required defaultValue={editTarget.email} />
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select name="role" defaultValue={editTarget.role} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Field label="New password (leave blank to keep current)" name="password" type="password" minLength={8} />
            <ModalActions onCancel={() => setEditTarget(null)} submitLabel="Save changes" isPending={isPending} />
          </form>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal title="Delete user" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete <strong>{deleteTarget.name ?? deleteTarget.email}</strong>? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={isPending} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// --- Shared sub-components ---

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}

function ModalActions({ onCancel, submitLabel, isPending }: { onCancel: () => void; submitLabel: string; isPending: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
        Cancel
      </button>
      <button type="submit" disabled={isPending} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
