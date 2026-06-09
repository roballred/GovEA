'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addOrgMembership, updateOrgMembershipRole, setOrgMembershipActive,
  type OrgMembershipRow,
} from '@/actions/memberships'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
}

const ROLES: Role[] = ['admin', 'contributor', 'viewer']

interface Props {
  members: OrgMembershipRow[]
  currentUserId: string
}

/**
 * #693 slice 4b — surfaces the org-scoped membership actions (slice 4a). Admins
 * add an existing identity as a member of the active org, change a member's
 * role, and revoke/restore membership. The last-admin guard is enforced
 * server-side; here we also disable the controls for the sole active admin so
 * the failure is visible before the click.
 */
export function MembershipTable({ members, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<Role>('viewer')

  const activeAdmins = members.filter(m => m.role === 'admin' && m.isActive).length
  const isLastAdmin = (m: OrgMembershipRow) => m.role === 'admin' && m.isActive && activeAdmins <= 1

  function run(fn: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Organization members</h2>
      <p className="text-sm text-gray-500">
        People with a membership in this organization. Add an existing user by email; changing the
        active organization is done from the header switcher.
      </p>

      {/* Add member */}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!addEmail.trim()) return
          run(async () => { await addOrgMembership(addEmail.trim(), addRole); setAddEmail('') })
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="add-member-email">Add member (email)</Label>
          <Input
            id="add-member-email"
            type="email"
            placeholder="person@example.gov"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="add-member-role">Role</Label>
          <select
            id="add-member-role"
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as Role)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isPending || !addEmail.trim()}>Add</Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(m => {
            const lastAdmin = isLastAdmin(m)
            return (
              <TableRow key={m.userId} className={cn(!m.isActive && 'opacity-60')}>
                <TableCell>{m.name ?? '—'}{m.userId === currentUserId && ' (you)'}</TableCell>
                <TableCell className="text-sm text-gray-600">{m.email}</TableCell>
                <TableCell>
                  <select
                    aria-label={`Role for ${m.email}`}
                    value={m.role}
                    disabled={isPending || !m.isActive || lastAdmin}
                    onChange={(e) => run(() => updateOrgMembershipRole(m.userId, e.target.value as Role))}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-xs font-medium disabled:cursor-not-allowed',
                      ROLE_STYLES[m.role],
                    )}
                    title={lastAdmin ? 'Cannot demote the last admin' : undefined}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </TableCell>
                <TableCell className="text-sm">{m.isActive ? 'Active' : 'Revoked'}</TableCell>
                <TableCell className="text-right">
                  {m.isActive ? (
                    <Button
                      variant="ghost" size="sm" className="h-7 px-2 text-xs"
                      disabled={isPending || lastAdmin}
                      title={lastAdmin ? 'Cannot remove the last admin' : undefined}
                      onClick={() => run(() => setOrgMembershipActive(m.userId, false))}
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      variant="ghost" size="sm" className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => run(() => setOrgMembershipActive(m.userId, true))}
                    >
                      Restore
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-gray-500">No members yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
