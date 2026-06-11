'use client'

import { Fragment, useState, useTransition } from 'react'
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
import { ConfirmWithReason } from '@/components/confirm-with-reason'
import {
  createInstanceUser, demoteInstanceAdmin, promoteInstanceAdmin,
  suspendUserAccount, reactivateUserAccount,
  setMembershipRoleAsInstanceAdmin, setMembershipActiveAsInstanceAdmin,
} from '@/actions/instance'

type OrgOption = {
  id: string
  name: string
}

export type MembershipRow = {
  organizationId: string
  orgName: string
  role: 'admin' | 'contributor' | 'viewer'
  isActive: boolean
  isPrimary: boolean
}

type InstanceUserRow = {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'contributor' | 'viewer'
  instanceRole: string | null
  isActive: string
  organizationName: string | null
  /** #693 slice 4 — all org memberships, for cross-org management. */
  memberships: MembershipRow[]
}

interface Props {
  users: InstanceUserRow[]
  organizations: OrgOption[]
  currentUserId: string
  /** #436 — count of tenant users filtered out because no active break-glass for their org. */
  hiddenUserCount: number
  /** #436 — count of distinct tenant orgs whose users were filtered out. */
  hiddenOrgCount: number
}

export function InstanceUserTable({ users, organizations, currentUserId, hiddenUserCount, hiddenOrgCount }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [createMessage, setCreateMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  // #693 — which user rows have their memberships section expanded.
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  function openCreate() {
    setCreateMessage(null)
    setCreateOpen(true)
  }

  async function handleCreate(formData: FormData) {
    setCreateMessage(null)
    startTransition(async () => {
      try {
        const result = await createInstanceUser(formData)
        if (result.status === 'already_member') {
          // Handled, non-crashing: keep the dialog open so the operator sees why.
          setCreateMessage({ kind: 'info', text: result.message })
          refresh()
          return
        }
        setCreateOpen(false)
        refresh()
      } catch (e) {
        setCreateMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not create the account.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Platform admins are always visible. Tenant users are only visible for organisations you currently hold break-glass access to.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          + Create account
        </Button>
      </div>

      {/* #436 — honest disclosure when tenant users are filtered out. */}
      {hiddenUserCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {hiddenUserCount} tenant user{hiddenUserCount === 1 ? '' : 's'} hidden across {hiddenOrgCount} organisation{hiddenOrgCount === 1 ? '' : 's'}.
            </p>
            <p className="text-amber-800 dark:text-amber-400 mt-0.5">
              Tenant-user PII is gated behind active, approved break-glass sessions. Grant break-glass from the organisation&apos;s detail page to view its users here.
            </p>
          </div>
          <Link href="/instance/orgs" className="shrink-0">
            <Button variant="outline" size="sm">Go to Organisations</Button>
          </Link>
        </div>
      )}

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
              const expanded = expandedUserId === u.id
              return (
                <Fragment key={u.id}>
                <TableRow>
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
                    <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedUserId(expanded ? null : u.id)}
                      aria-expanded={expanded}
                    >
                      Memberships ({u.memberships.length}) {expanded ? '▴' : '▾'}
                    </Button>
                    {!isMe && (
                      <div className="flex items-center justify-end gap-2">
                        {u.instanceRole === 'instance_admin' ? (
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
                        )}
                        {u.isActive === 'true' ? (
                          <ConfirmWithReason
                            trigger={<Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950">Suspend</Button>}
                            title={`Suspend "${u.name ?? u.email}"`}
                            description="This will block the account from signing in. It does not delete any data. Enter a reason for the audit log."
                            confirmLabel="Suspend Account"
                            destructive
                            onConfirm={async (reason) => {
                              await suspendUserAccount(u.id, reason)
                            }}
                          />
                        ) : (
                          <ConfirmWithReason
                            trigger={<Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950">Reactivate</Button>}
                            title={`Reactivate "${u.name ?? u.email}"`}
                            description="This will restore the account's ability to sign in. Enter a reason for the audit log."
                            confirmLabel="Reactivate Account"
                            onConfirm={async (reason) => {
                              await reactivateUserAccount(u.id, reason)
                            }}
                          />
                        )}
                      </div>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7} className="py-3">
                      <MembershipManager userId={u.id} userLabel={u.name ?? u.email} memberships={u.memberships} onDone={refresh} />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
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
            {createMessage && (
              <div
                className={cn(
                  'rounded-md border p-2.5 text-sm',
                  createMessage.kind === 'error'
                    ? 'border-destructive/40 bg-destructive/5 text-destructive'
                    : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300',
                )}
              >
                {createMessage.text}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              If the email already belongs to an existing account, that account is added to the selected organization instead — its password and platform role are left unchanged.
            </p>
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

/**
 * #693 slice 4 — per-user cross-org membership management for the instance
 * console. Role changes and deactivate/reactivate route through the
 * instance-admin actions, which enforce the per-org last-admin guard and
 * write membership.* audit events with the operator's reason.
 */
function MembershipManager({
  userId, userLabel, memberships, onDone,
}: {
  userId: string
  userLabel: string
  memberships: MembershipRow[]
  onDone: () => void
}) {
  // Pending role selections per org, before the operator confirms.
  const [pendingRoles, setPendingRoles] = useState<Record<string, MembershipRow['role']>>({})
  const [error, setError] = useState<string | null>(null)

  if (memberships.length === 0) {
    return <p className="text-sm text-muted-foreground">No organization memberships.</p>
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{error}</div>
      )}
      <ul className="divide-y rounded-md border bg-card">
        {memberships.map((m) => {
          const pending = pendingRoles[m.organizationId] ?? m.role
          const roleChanged = pending !== m.role
          return (
            <li key={m.organizationId} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-medium min-w-40">{m.orgName}</span>
              {m.isPrimary && (
                <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">primary</span>
              )}
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                m.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
              )}>
                {m.isActive ? 'Active' : 'Revoked'}
              </span>
              <span className="ml-auto" />
              <select
                aria-label={`Role in ${m.orgName}`}
                value={pending}
                onChange={(e) => {
                  setError(null)
                  setPendingRoles(prev => ({ ...prev, [m.organizationId]: e.target.value as MembershipRow['role'] }))
                }}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
              <ConfirmWithReason
                trigger={<Button variant="outline" size="sm" disabled={!roleChanged}>Change role</Button>}
                title={`Change role in "${m.orgName}"`}
                description={`"${userLabel}" becomes ${pending} in ${m.orgName}. Enter a reason for the audit log.`}
                confirmLabel="Change Role"
                onConfirm={async (reason) => {
                  try {
                    await setMembershipRoleAsInstanceAdmin(userId, m.organizationId, pending, reason)
                    onDone()
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not change the role.')
                  }
                }}
              />
              {m.isActive ? (
                <ConfirmWithReason
                  trigger={<Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950">Revoke</Button>}
                  title={`Revoke membership in "${m.orgName}"`}
                  description={`"${userLabel}" loses access to ${m.orgName}. The membership is kept (revoked) for audit history and can be reactivated. Enter a reason for the audit log.`}
                  confirmLabel="Revoke Membership"
                  destructive
                  onConfirm={async (reason) => {
                    try {
                      await setMembershipActiveAsInstanceAdmin(userId, m.organizationId, false, reason)
                      onDone()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not revoke the membership.')
                    }
                  }}
                />
              ) : (
                <ConfirmWithReason
                  trigger={<Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950">Reactivate</Button>}
                  title={`Reactivate membership in "${m.orgName}"`}
                  description={`"${userLabel}" regains ${m.role} access to ${m.orgName}. Enter a reason for the audit log.`}
                  confirmLabel="Reactivate Membership"
                  onConfirm={async (reason) => {
                    try {
                      await setMembershipActiveAsInstanceAdmin(userId, m.organizationId, true, reason)
                      onDone()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not reactivate the membership.')
                    }
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Add a membership with “+ Create account” above — entering an existing email adds that identity to the selected organization.
      </p>
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
