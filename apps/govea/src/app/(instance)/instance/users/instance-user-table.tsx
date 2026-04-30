'use client'

import { useState, useTransition } from 'react'
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
import { ConfirmWithReason } from '@/components/confirm-with-reason'
import { createInstanceUser, demoteInstanceAdmin, promoteInstanceAdmin } from '@/actions/instance'

type OrgOption = {
  id: string
  name: string
}

type InstanceUserRow = {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'contributor' | 'viewer'
  instanceRole: string | null
  isActive: string
  organizationName: string | null
}

interface Props {
  users: InstanceUserRow[]
  organizations: OrgOption[]
  currentUserId: string
}

export function InstanceUserTable({ users, organizations, currentUserId }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function refresh() {
    router.refresh()
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createInstanceUser(formData)
      setCreateOpen(false)
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">All users across all tenant organisations.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Create account
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Platform role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isMe = u.id === currentUserId
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.organizationName ?? '—'}</TableCell>
                  <TableCell><span className="capitalize text-sm">{u.role}</span></TableCell>
                  <TableCell>
                    {u.instanceRole === 'instance_admin' ? (
                      <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 dark:bg-violet-950 dark:border-violet-700 px-1.5 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-300">
                        platform admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      u.isActive === 'true'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {u.isActive === 'true' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isMe && (
                      u.instanceRole === 'instance_admin' ? (
                        <ConfirmWithReason
                          trigger={<Button variant="outline" size="sm">Demote</Button>}
                          title={`Demote "${u.name ?? u.email}"`}
                          description="This will remove platform admin access. Enter a reason for the audit log."
                          confirmLabel="Remove Platform Access"
                          destructive
                          onConfirm={async (reason) => {
                            await demoteInstanceAdmin(u.id, reason)
                          }}
                        />
                      ) : (
                        <ConfirmWithReason
                          trigger={<Button variant="outline" size="sm">Promote</Button>}
                          title={`Promote "${u.name ?? u.email}"`}
                          description="This will grant platform admin access across all organisations. Enter a reason for the audit log."
                          confirmLabel="Grant Platform Access"
                          onConfirm={async (reason) => {
                            await promoteInstanceAdmin(u.id, reason)
                          }}
                        />
                      )
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-org">Organization</Label>
              <select
                id="create-org"
                name="organizationId"
                required
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>Select organization…</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <FormField label="Name" name="name" type="text" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Password" name="password" type="password" required minLength={8} />
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Role</Label>
              <select
                id="create-role"
                name="role"
                defaultValue="viewer"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <input type="checkbox" name="instanceAdmin" className="mt-0.5" />
              <span>
                Also grant platform admin access
              </span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create account'}</Button>
            </DialogFooter>
          </form>
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
